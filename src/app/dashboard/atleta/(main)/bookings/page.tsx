"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Calendar,
  Clock,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  User,
  Users,
  Circle,
  Trophy,
  List,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import BookingsTimeline from "@/components/admin/BookingsTimeline";

interface Booking {
  id: string;
  court: string;
  user_id: string;
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
  // For BookingsTimeline compatibility
  user_profile?: { full_name: string; email: string; phone?: string } | null;
  coach_profile?: { full_name: string; email: string; phone?: string } | null;
}

type BookingsPageProps = {
  mode?: "default" | "history";
};

export default function BookingsPage({ mode = "default" }: BookingsPageProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
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

    // Get user profile
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", user.id)
      .single();

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
        .select("id, full_name, email, phone")
        .in("id", coachIds);

      if (coachesData) {
        coachesMap = new Map(coachesData.map(c => [c.id, c]));
      }
    }

    // Combina i dati con struttura compatibile con BookingsTimeline
    const enrichedBookings = bookingsData.map(booking => {
      const coachData = booking.coach_id ? coachesMap.get(booking.coach_id) : null;
      return {
        ...booking,
        coach: coachData,
        user_profile: userProfile || null,
        coach_profile: coachData ? {
          full_name: coachData.full_name,
          email: coachData.email,
          phone: coachData.phone
        } : null
      };
    });

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
            <p className="breadcrumb text-secondary/60">
              <Link
                href="/dashboard/atleta/bookings"
                className="hover:text-secondary/80 transition-colors"
              >
                Prenotazioni
              </Link>
              {" › "}
              <span>Storico</span>
            </p>
          )}
          <h1 className="text-3xl font-bold text-secondary mb-2">{mode === "history" ? "Storico prenotazioni" : "Le mie Prenotazioni"}
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
              className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
              title="Storico"
            >
              <Clock className="h-5 w-5" />
            </Link>
          )}
          <button
            onClick={() => loadBookings()}
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Ricarica"
          >
            <RefreshCw className="h-5 w-5" />
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
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>
        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-md p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-2.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
              viewMode === "list"
                ? "bg-secondary text-white"
                : "text-secondary/60 hover:text-secondary border border-gray-200"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`px-3 py-2.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
              viewMode === "timeline"
                ? "bg-secondary text-white"
                : "text-secondary/60 hover:text-secondary border border-gray-200"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Timeline
          </button>
        </div>
      </div>

      {/* Bookings List or Timeline */}
      {viewMode === "timeline" ? (
        <BookingsTimeline bookings={filteredBookings} loading={loading} />
      ) : loading ? (
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
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="space-y-3 min-w-[580px]">
            {/* Header Row */}
            <div className="bg-secondary rounded-lg px-4 py-3 mb-3 border border-secondary">
              <div className="flex items-center gap-3">
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-white/80 uppercase">#</div>
                </div>
                <div className="w-20 flex-shrink-0">
                  <div className="text-xs font-bold text-white/80 uppercase">Data</div>
                </div>
                <div className="w-14 flex-shrink-0 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Ora</div>
                </div>
                <div className="w-20 flex-shrink-0 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Campo</div>
                </div>
                <div className="flex-1 min-w-[80px] text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Maestro</div>
                </div>
                <div className="w-14 flex-shrink-0 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Stato</div>
                </div>
                <div className="w-10 flex-shrink-0 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase"></div>
                </div>
              </div>
            </div>

            {/* Data Rows */}
            {filteredBookings.map((booking) => {
              const isPast = new Date(booking.start_time) < new Date();
              const canCancel = booking.status !== "cancelled" && !isPast;

              // Determina il colore del bordo in base allo stato
              let borderStyle = {};
              if (booking.status === "cancelled") {
                borderStyle = { borderLeftColor: "#ef4444" }; // rosso - annullata
              } else if (!booking.manager_confirmed) {
                borderStyle = { borderLeftColor: "#f59e0b" }; // amber - da approvare
              } else {
                borderStyle = { borderLeftColor: "#10b981" }; // emerald - confermata
              }

              return (
                <Link
                  key={booking.id}
                  href={`/dashboard/atleta/bookings/${booking.id}`}
                  className="block bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer border-l-4"
                  style={borderStyle}
                >
                  <div className="flex items-center gap-3">
                    {/* Simbolo Tipo */}
                    <div className="w-8 flex-shrink-0 flex items-center justify-center">
                      {booking.type === "lezione_privata" && (
                        <User className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      )}
                      {booking.type === "lezione_gruppo" && (
                        <Users className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      )}
                      {booking.type === "campo" && (
                        <Circle className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      )}
                      {booking.type === "arena" && (
                        <Trophy className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      )}
                    </div>

                    {/* Data */}
                    <div className="w-20 flex-shrink-0">
                      <div className="font-bold text-secondary text-sm">
                        {formatDate(booking.start_time)}
                      </div>
                    </div>

                    {/* Orario */}
                    <div className="w-14 flex-shrink-0 text-center">
                      <div className="text-sm font-semibold text-secondary">
                        {formatTime(booking.start_time)}
                      </div>
                    </div>

                    {/* Campo */}
                    <div className="w-20 flex-shrink-0 text-center">
                      <div className="font-bold text-secondary text-sm">{booking.court}</div>
                    </div>

                    {/* Maestro */}
                    <div className="flex-1 min-w-[80px] text-center">
                      {(booking.type === "lezione_privata" || booking.type === "lezione_gruppo") ? (
                        <div className="font-semibold text-secondary truncate text-sm">
                          {booking.coach?.full_name || "N/A"}
                        </div>
                      ) : (
                        <div className="text-sm text-secondary/30">-</div>
                      )}
                    </div>

                    {/* Conferme */}
                    <div className="flex items-center justify-center gap-1 w-14 flex-shrink-0">
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
                    <div className="flex items-center justify-center w-10 flex-shrink-0">
                      {canCancel && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            cancelBooking(booking.id);
                          }}
                          className="p-1 text-red-700 bg-red-50 rounded hover:bg-red-100 transition-all"
                          title="Annulla"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
