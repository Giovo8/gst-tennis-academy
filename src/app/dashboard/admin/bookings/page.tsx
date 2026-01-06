"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications/createNotification";
import Link from "next/link";
import { 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  User,
  MapPin,
  RefreshCw,
  Shield,
} from "lucide-react";

type Booking = {
  id: string;
  court: string;
  user_id: string;
  coach_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  manager_confirmed: boolean;
  coach_confirmed: boolean;
  notes: string | null;
  created_at: string;
  user_profile?: { full_name: string; email: string } | null;
  coach_profile?: { full_name: string; email: string } | null;
};
type BookingsPageProps = {
  mode?: "default" | "history";
};

export default function BookingsPage({ mode = "default" }: BookingsPageProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      console.log("🔍 Caricamento prenotazioni...");
      
      // Prima verifica il ruolo dell'utente
      const { data: { user } } = await supabase.auth.getUser();
      console.log("👤 Utente:", user?.id);
      
      const { data: roleData } = await supabase.rpc('get_my_role');
      console.log("🎭 Ruolo:", roleData);
      
      // Prima query: prendi le ultime prenotazioni
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(200);

      if (bookingsError) {
        console.error("❌ Errore Supabase:", bookingsError);
        alert(`Errore nel caricamento: ${bookingsError.message}\n\nVerifica di avere il ruolo admin/gestore nel database.`);
        setLoading(false);
        return;
      }

      if (!bookingsData || bookingsData.length === 0) {
        console.log("⚠️ Nessuna prenotazione trovata");
        setBookings([]);
        setLoading(false);
        return;
      }

      // Seconda query: prendi tutti i profili necessari
      const userIds = [...new Set([
        ...bookingsData.map(b => b.user_id),
        ...bookingsData.map(b => b.coach_id).filter(Boolean)
      ])];

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) {
        console.warn("⚠️ Errore caricamento profili:", profilesError);
      }

      // Mappa i profili per ID
      const profilesMap = new Map(
        profilesData?.map(p => [p.id, p]) || []
      );

      // Combina bookings con i profili
      const enrichedBookings = bookingsData.map(booking => ({
        ...booking,
        user_profile: profilesMap.get(booking.user_id) || null,
        coach_profile: booking.coach_id ? profilesMap.get(booking.coach_id) || null : null
      }));

      console.log("✅ Prenotazioni caricate:", enrichedBookings.length);
      setBookings(enrichedBookings);
    } catch (error) {
      console.error("❌ Errore nel caricamento prenotazioni:", error);
      alert(`Errore: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  async function confirmBooking(bookingId: string) {
    try {
      // Get booking details first
      const { data: booking } = await supabase
        .from("bookings")
        .select("user_id, court, start_time, end_time")
        .eq("id", bookingId)
        .single();

      const { error } = await supabase
        .from("bookings")
        .update({ 
          manager_confirmed: true,
          status: "confirmed" 
        })
        .eq("id", bookingId);

      if (!error && booking) {
        // Send notification to user
        const startDate = new Date(booking.start_time).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const startTime = new Date(booking.start_time).toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        });
        
        await createNotification({
          userId: booking.user_id,
          type: "booking",
          title: "Prenotazione confermata",
          message: `La tua prenotazione per il campo ${booking.court} del ${startDate} alle ${startTime} è stata confermata.`,
          link: "/dashboard/atleta/bookings",
        });

        loadBookings();
      }
    } catch (error) {
      console.error("Error confirming booking:", error);
    }
  }

  async function rejectBooking(bookingId: string) {
    try {
      // Get booking details first
      const { data: booking } = await supabase
        .from("bookings")
        .select("user_id, court, start_time, end_time")
        .eq("id", bookingId)
        .single();

      const { error } = await supabase
        .from("bookings")
        .update({ 
          status: "cancelled",
          manager_confirmed: false
        })
        .eq("id", bookingId);

      if (!error && booking) {
        // Send notification to user
        const startDate = new Date(booking.start_time).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const startTime = new Date(booking.start_time).toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        });

        await createNotification({
          userId: booking.user_id,
          type: "booking",
          title: "Prenotazione rifiutata",
          message: `La tua prenotazione per il campo ${booking.court} del ${startDate} alle ${startTime} è stata rifiutata.`,
          link: "/dashboard/atleta/bookings",
        });

        loadBookings();
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
    }
  }

  async function deleteBooking(bookingId: string) {
    if (!confirm("Sei sicuro di voler eliminare questa prenotazione?")) return;
    
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (!error) {
        loadBookings();
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
    }
  }

  function exportToCSV() {
    const csv = [
      ["Data", "Ora Inizio", "Ora Fine", "Campo", "Atleta", "Maestro", "Tipo", "Status", "Conferma Manager"].join(","),
      ...filteredBookings.map((b) => [
        formatDate(b.start_time),
        formatTime(b.start_time),
        formatTime(b.end_time),
        b.court,
        b.user_profile?.full_name || "N/A",
        b.coach_profile?.full_name || "N/A",
        typeConfig[b.type]?.label || b.type,
        statusConfig[b.status]?.label || b.status,
        b.manager_confirmed ? "Sì" : "No",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prenotazioni-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
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

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const baseBookings =
    mode === "history"
      ? bookings
      : bookings.filter((booking) => new Date(booking.start_time) >= startOfToday);

  const filteredBookings = baseBookings.filter((booking) => {
    const matchesStatus = filter === "all" || booking.status === filter;
    const matchesSearch =
      !search ||
      booking.user_profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      booking.user_profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      booking.coach_profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      booking.court?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: baseBookings.length,
    confirmed: baseBookings.filter((b) => b.status === "confirmed").length,
    pending: baseBookings.filter((b) => b.status === "pending" || !b.manager_confirmed).length,
    cancelled: baseBookings.filter((b) => b.status === "cancelled").length,
    needsApproval: baseBookings.filter((b) => !b.manager_confirmed && b.status !== "cancelled").length,
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {mode === "history" && (
            <Link
              href="/dashboard/admin/bookings"
              className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1 hover:text-secondary/80 transition-colors"
            >
              Prenotazioni
            </Link>
          )}
          <h1 className="text-3xl font-bold text-secondary mb-2">
            {mode === "history" ? "Storico prenotazioni" : "Gestione Prenotazioni"}
          </h1>
          <p className="text-secondary/70 font-medium">
            {mode === "history"
              ? "Consulta l'elenco completo delle prenotazioni effettuate"
              : "Visualizza, conferma e gestisci le prenotazioni dei campi da oggi in avanti"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {mode !== "history" && (
            <>
              <Link
                href="/dashboard/admin/bookings/new"
                className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Crea Prenotazione
              </Link>
              <Link
                href="/dashboard/admin/bookings/storico"
                className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Storico
              </Link>
            </>
          )}
          {mode !== "history" && (
            <Link
              href="/dashboard/admin/courts"
              className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Blocco Campi
            </Link>
          )}
          <button
            onClick={() => loadBookings()}
            className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Ricarica
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Esporta CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome atleta, maestro, email o campo..."
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
          <p className="text-secondary/60">Prova a modificare i filtri di ricerca</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header Row */}
          <div className="bg-secondary/5 rounded-md px-5 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-6 flex-1">
                <div className="w-28">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Data e Orario</div>
                </div>
                <div className="w-24">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Campo</div>
                </div>
                <div className="w-32">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Tipo</div>
                </div>
                <div className="w-56">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Atleta</div>
                </div>
                <div className="w-48">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Maestro</div>
                </div>
                <div className="w-32">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Stato</div>
                </div>
              </div>
              <div className="w-36 text-right">
                <div className="text-xs font-bold text-secondary/60 uppercase">Azioni</div>
              </div>
            </div>
          </div>

          {/* Data Rows */}
          {filteredBookings.map((booking) => {
            const status = statusConfig[booking.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const bookingType = typeConfig[booking.type] || typeConfig.campo;

            return (
              <div
                key={booking.id}
                className="bg-white rounded-md p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Info principale - Grid con larghezze fisse */}
                  <div className="flex items-center gap-6 flex-1">
                    {/* Data e Ora */}
                    <div className="w-28">
                      <div className="font-bold text-secondary text-sm mb-0.5">
                        {formatDate(booking.start_time)}
                      </div>
                      <div className="text-xs text-secondary/60">
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </div>
                    </div>

                    {/* Campo */}
                    <div className="w-24">
                      <div className="font-bold text-secondary">{booking.court}</div>
                    </div>

                    {/* Tipo */}
                    <div className="w-32">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md ${bookingType.color}`}>
                        {bookingType.label}
                      </span>
                    </div>

                    {/* Atleta */}
                    <div className="w-56">
                      <div className="font-semibold text-secondary truncate">
                        {booking.user_profile?.full_name || "Nome non disponibile"}
                      </div>
                      <div className="text-xs text-secondary/50 truncate">
                        {booking.user_profile?.email || ""}
                      </div>
                    </div>

                    {/* Maestro - sempre visibile con larghezza fissa */}
                    <div className="w-48">
                      {(booking.type === "lezione_privata" || booking.type === "lezione_gruppo") ? (
                        <div className="font-semibold text-secondary truncate">
                          {booking.coach_profile?.full_name || "Non assegnato"}
                        </div>
                      ) : (
                        <div className="text-sm text-secondary/30">-</div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="w-32">
                      {!booking.manager_confirmed && booking.status !== "cancelled" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md bg-amber-500 text-white">
                          <AlertCircle className="h-3 w-3" />
                          Da Approvare
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Azioni - sempre nella stessa posizione */}
                  <div className="flex gap-2 w-36 justify-end">{!booking.manager_confirmed && booking.status !== "cancelled" && (
                      <>
                        <button
                          onClick={() => confirmBooking(booking.id)}
                          className="p-2 bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors"
                          title="Approva"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => rejectBooking(booking.id)}
                          className="p-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
                          title="Rifiuta"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {booking.status !== "cancelled" && (
                      <Link
                        href={`/dashboard/admin/bookings/modifica?id=${booking.id}`}
                        className="p-2 bg-secondary/10 text-secondary rounded-md hover:bg-secondary/20 transition-colors"
                        title="Modifica prenotazione"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => deleteBooking(booking.id)}
                      className="p-2 bg-secondary/5 text-secondary/70 rounded-md hover:bg-secondary/10 transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale di modifica rimosso: ora la modifica avviene su pagina dedicata */}
    </div>
  );
}

// Modale di modifica rimosso: ora la modifica avviene su pagina dedicata
