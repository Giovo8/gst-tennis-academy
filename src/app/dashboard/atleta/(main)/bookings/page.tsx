"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Booking {
  id: string;
  court: string;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  coach_id: string | null;
  notes: string | null;
  manager_confirmed: boolean;
  coach_confirmed: boolean;
  coach?: {
    full_name: string;
  };
}

type BookingsPageProps = {
  mode?: "default" | "history";
};

export default function BookingsPage({ mode = "default" }: BookingsPageProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("start_time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    console.log("🔍 Caricamento prenotazioni atleta...");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("❌ Nessun utente loggato");
      setLoading(false);
      return;
    }
    
    console.log("👤 User ID:", user.id);

    // Query base
    let query = supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id);

    // In modalità default mostra solo dal giorno corrente in avanti
    if (mode === "default") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte("start_time", today.toISOString());
    }

    const { data: bookingsData, error: bookingsError } = await query
      .order("start_time", { ascending: false })
      .limit(100);

    if (bookingsError) {
      console.error("❌ Errore caricamento prenotazioni:", bookingsError);
      setLoading(false);
      return;
    }

    console.log("✅ Prenotazioni caricate:", bookingsData?.length || 0);

    if (!bookingsData || bookingsData.length === 0) {
      console.log("⚠️ Nessuna prenotazione trovata");
      setBookings([]);
      setLoading(false);
      return;
    }

    // Seconda query: prendi i profili dei coach se esistono
    const coachIds = [...new Set(bookingsData.map(b => b.coach_id).filter(Boolean))];
    
    let coachesMap = new Map();
    if (coachIds.length > 0) {
      const { data: coachesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", coachIds);
      
      if (coachesData) {
        coachesMap = new Map(coachesData.map(c => [c.id, c]));
      }
    }

    // Combina i dati
    const enrichedBookings = bookingsData.map(booking => ({
      ...booking,
      coach: booking.coach_id ? coachesMap.get(booking.coach_id) : null
    }));

    console.log("📋 Dati arricchiti:", enrichedBookings);
    setBookings(enrichedBookings);
    setLoading(false);
  }

  async function cancelBooking(id: string) {
    if (!confirm("Sei sicuro di voler annullare questa prenotazione?")) return;

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (!error) {
      loadBookings();
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const typeConfig: Record<string, { label: string; color: string }> = {
    campo: { label: "Campo", color: "bg-secondary text-white" },
    lezione_privata: { label: "Lezione Privata", color: "bg-secondary text-white" },
    lezione_gruppo: { label: "Lezione Gruppo", color: "bg-secondary text-white" },
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    confirmed: { label: "Confermata", color: "bg-secondary text-white", icon: CheckCircle2 },
    pending: { label: "In attesa", color: "bg-secondary text-white", icon: Clock },
    cancelled: { label: "Annullata", color: "bg-secondary text-white", icon: XCircle },
  };

  const filteredBookings = bookings
    .filter((booking) => {
      const matchesStatus = filter === "all" || booking.status === filter;
      const matchesSearch =
        !search ||
        booking.court?.toLowerCase().includes(search.toLowerCase()) ||
        booking.coach?.full_name?.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "start_time":
          aValue = new Date(a.start_time).getTime();
          bValue = new Date(b.start_time).getTime();
          break;
        case "court":
          aValue = a.court;
          bValue = b.court;
          break;
        case "type":
          aValue = a.type;
          bValue = b.type;
          break;
        case "coach":
          aValue = a.coach?.full_name || "";
          bValue = b.coach?.full_name || "";
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const now = new Date().toISOString();
  const stats = {
    total: bookings.length,
    upcoming: bookings.filter((b) => b.start_time >= now && b.status !== "cancelled").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {mode === "history" && (
            <Link
              href="/dashboard/atleta/bookings"
              className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1 hover:text-secondary/80 transition-colors"
            >
              Prenotazioni
            </Link>
          )}
          <h1 className="text-3xl font-bold text-secondary mb-2">
            {mode === "history" ? "Storico prenotazioni" : "Le mie Prenotazioni"}
          </h1>
          <p className="text-secondary/70 font-medium">
            {mode === "history"
              ? "Consulta l'elenco completo delle tue prenotazioni effettuate"
              : "Visualizza e gestisci le tue prenotazioni dei campi da oggi in avanti"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {mode !== "history" && (
            <Link
              href="/dashboard/atleta/bookings/storico"
              className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Storico
            </Link>
          )}
          <button
            onClick={() => loadBookings()}
            className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Ricarica
          </button>
          {mode !== "history" && (
            <Link
              href="/dashboard/atleta/bookings/new"
              className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuova Prenotazione
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per campo o maestro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              filter === "all"
                ? "text-white bg-secondary hover:opacity-90"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            <Filter className="inline-block w-4 h-4 mr-1.5" />
            Tutte
          </button>
          {Object.entries(statusConfig).map(([status, { label }]) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                filter === status
                  ? "text-white bg-secondary hover:opacity-90"
                  : "bg-white text-secondary/70 hover:bg-secondary/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento prenotazioni...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <Calendar className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna prenotazione trovata</h3>
          <p className="text-secondary/60 mb-6">
            {search || filter !== "all" 
              ? "Prova a modificare i filtri di ricerca"
              : "Prenota il tuo primo campo per iniziare"}
          </p>
          {!search && filter === "all" && (
            <Link
              href="/dashboard/atleta/bookings/new"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all"
            >
              <Plus className="h-4 w-4" />
              Prenota Ora
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const StatusIcon = statusConfig[booking.status]?.icon || Clock;
            const isPast = new Date(booking.start_time) < new Date();
            const canCancel = booking.status !== "cancelled" && !isPast;

            return (
              <div
                key={booking.id}
                className="bg-white rounded-md p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Data e Orario */}
                  <div className="flex items-center gap-3 w-32 flex-shrink-0">
                    <Calendar className="h-5 w-5 text-secondary/40" />
                    <div>
                      <div className="text-sm font-semibold text-secondary">
                        {formatDate(booking.start_time)}
                      </div>
                      <div className="text-xs text-secondary/60">
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </div>
                    </div>
                  </div>

                  {/* Campo */}
                  <div className="w-24 flex-shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-secondary/10 text-secondary">
                      {booking.court}
                    </span>
                  </div>

                  {/* Tipo */}
                  <div className="w-32 flex-shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${typeConfig[booking.type]?.color || typeConfig.campo.color}`}>
                      {typeConfig[booking.type]?.label || booking.type}
                    </span>
                  </div>

                  {/* Maestro */}
                  <div className="w-40 text-sm text-secondary/70 flex-shrink-0">
                    {booking.coach?.full_name || "—"}
                  </div>

                  {/* Stato */}
                  <div className="w-32 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${statusConfig[booking.status]?.color || statusConfig.pending.color}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusConfig[booking.status]?.label || booking.status}
                    </span>
                  </div>

                  {/* Conferme */}
                  <div className="flex items-center gap-2 w-20 flex-shrink-0">
                    <div title="Manager">
                      {booking.manager_confirmed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-orange-600" />
                      )}
                    </div>
                    {booking.coach_id && (
                      <div title="Maestro">
                        {booking.coach_confirmed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Azioni */}
                  <div className="flex items-center justify-end gap-2 w-28 flex-shrink-0">
                    {canCancel && (
                      <button
                        onClick={() => cancelBooking(booking.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-all flex items-center gap-1.5"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Annulla
                      </button>
                    )}
                  </div>
                </div>

                {/* Note */}
                {booking.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-secondary/60">
                      <span className="font-semibold">Note:</span> {booking.notes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
