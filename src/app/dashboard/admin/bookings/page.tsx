"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
  User,
  MapPin,
  RefreshCw,
  Shield,
  List,
  LayoutGrid,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Trophy,
  Circle,
} from "lucide-react";
import BookingsTimeline from "@/components/admin/BookingsTimeline";

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
  user_profile?: { full_name: string; email: string; phone?: string } | null;
  coach_profile?: { full_name: string; email: string; phone?: string } | null;
};
type BookingsPageProps = {
  mode?: "default" | "history";
};

export default function BookingsPage({ mode = "default" }: BookingsPageProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [sortBy, setSortBy] = useState<"date" | "court" | "type" | "status" | "athlete" | "coach" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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
        .select("id, full_name, email, phone")
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
    arena: { label: "Match Arena", color: "bg-secondary text-white" },
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

  // Merge consecutive bookings of the same user on the same court
  const mergeConsecutiveBookings = (bookings: Booking[]): Booking[] => {
    if (bookings.length === 0) return [];
    
    // Sort by start time, court, and user
    const sorted = [...bookings].sort((a, b) => {
      const courtCompare = a.court.localeCompare(b.court);
      if (courtCompare !== 0) return courtCompare;
      
      const userCompare = a.user_id.localeCompare(b.user_id);
      if (userCompare !== 0) return userCompare;
      
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
    
    const merged: Booking[] = [];
    let current = sorted[0];
    
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      
      // Check if same user, same court, same type, and consecutive times
      const currentEnd = new Date(current.end_time);
      const nextStart = new Date(next.start_time);
      const sameUser = current.user_id === next.user_id;
      const sameCourt = current.court === next.court;
      const sameType = current.type === next.type;
      const sameCoach = current.coach_id === next.coach_id;
      const sameStatus = current.status === next.status;
      const consecutive = currentEnd.getTime() === nextStart.getTime();
      
      if (sameUser && sameCourt && sameType && sameCoach && sameStatus && consecutive) {
        // Merge: extend current end time, keep first booking ID
        current = {
          ...current,
          end_time: next.end_time
        };
      } else {
        // Not mergeable, push current and move to next
        merged.push(current);
        current = next;
      }
    }
    
    // Push the last one
    merged.push(current);
    return merged;
  };

  const mergedBaseBookings = mergeConsecutiveBookings(baseBookings);

  const filteredBookings = mergedBaseBookings.filter((booking) => {
    const matchesStatus = filter === "all" || booking.status === filter;
    const matchesSearch =
      !search ||
      booking.user_profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      booking.user_profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      booking.coach_profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      booking.court?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Sorting logic
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (!sortBy) return 0;

    let comparison = 0;
    switch (sortBy) {
      case "date":
        comparison = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        break;
      case "court":
        comparison = a.court.localeCompare(b.court);
        break;
      case "type":
        comparison = a.type.localeCompare(b.type);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "athlete":
        const athleteA = a.user_profile?.full_name || "";
        const athleteB = b.user_profile?.full_name || "";
        comparison = athleteA.localeCompare(athleteB);
        break;
      case "coach":
        const coachA = a.coach_profile?.full_name || "";
        const coachB = b.coach_profile?.full_name || "";
        comparison = coachA.localeCompare(coachB);
        break;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleSort = (column: "date" | "court" | "type" | "status" | "athlete" | "coach") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const stats = {
    total: mergedBaseBookings.length,
    confirmed: mergedBaseBookings.filter((b) => b.status === "confirmed").length,
    pending: mergedBaseBookings.filter((b) => b.status === "pending" || !b.manager_confirmed).length,
    cancelled: mergedBaseBookings.filter((b) => b.status === "cancelled").length,
    needsApproval: mergedBaseBookings.filter((b) => !b.manager_confirmed && b.status !== "cancelled").length,
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    // Capitalize first letter of weekday and month
    return formatted.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
            <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
              <Link
                href="/dashboard/admin/bookings"
                className="hover:text-secondary/80 transition-colors"
              >
                Prenotazioni
              </Link>
              <span className="mx-2">›</span>
              <span>Storico</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary mb-2">
            {mode === "history" ? "Storico prenotazioni" : "Gestione Prenotazioni"}
          </h1>
          <p className="text-secondary/70 font-medium">
            {mode === "history"
              ? "Consulta l'elenco completo delle prenotazioni effettuate"
              : "Visualizza, conferma e gestisci le prenotazioni dei campi da oggi in avanti"}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {mode !== "history" && (
            <>
              <Link
                href="/dashboard/admin/bookings/new"
                className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Crea Prenotazione
              </Link>
              <Link
                href="/dashboard/admin/bookings/storico"
                className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
                title="Storico"
              >
                <Clock className="h-5 w-5" />
              </Link>
            </>
          )}
          {mode !== "history" && (
            <Link
              href="/dashboard/admin/courts"
              className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
              title="Blocco Campi"
            >
              <Shield className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Search field - solo in modalità storico non mostrare timeline */}
        {mode === "history" ? (
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
            <input
              type="text"
              placeholder="Cerca per nome atleta, maestro, email o campo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
        ) : (
          <>
            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-md p-1 w-full sm:w-auto">
              <button
                onClick={() => setViewMode("list")}
                className={`flex-1 px-3 py-2.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
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
                className={`flex-1 px-3 py-2.5 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  viewMode === "timeline"
                    ? "bg-secondary text-white"
                    : "text-secondary/60 hover:text-secondary border border-gray-200"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Timeline
              </button>
            </div>
            {viewMode === "list" && (
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
                <input
                  type="text"
                  placeholder="Cerca per nome atleta, maestro, email o campo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Bookings List or Timeline */}
      {mode !== "history" && viewMode === "timeline" ? (
        <BookingsTimeline bookings={sortedBookings} loading={loading} />
      ) : loading ? (
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
        <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="space-y-3 min-w-[900px]">
          {/* Header Row */}
          <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
            <div className="grid grid-cols-[40px_80px_56px_80px_100px_100px_1fr_60px_64px] items-center gap-4">
              <div className="text-xs font-bold text-white/80 uppercase text-center">
                <button
                  onClick={() => handleSort("type")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1 mx-auto"
                >
                  #
                  {sortBy === "type" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="text-xs font-bold text-white/80 uppercase">
                <button
                  onClick={() => handleSort("date")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                >
                  Data
                  {sortBy === "date" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="text-xs font-bold text-white/80 uppercase">Ora</div>
              <div className="text-xs font-bold text-white/80 uppercase">
                <button
                  onClick={() => handleSort("court")}
                  className="text-xs font-bold text-white/80 uppercase hover:text-white transition-colors flex items-center gap-1"
                >
                  Campo
                  {sortBy === "court" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="text-xs font-bold text-white/80 uppercase">Atleta</div>
              <div className="text-xs font-bold text-white/80 uppercase">Maestro</div>
              <div></div>
              <div className="text-xs font-bold text-white/80 uppercase text-center">Stato</div>
              <div className="text-xs font-bold text-white/80 uppercase text-center">Azioni</div>
            </div>
          </div>

          {/* Data Rows */}
          {sortedBookings.map((booking) => {
            const status = statusConfig[booking.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const bookingType = typeConfig[booking.type] || typeConfig.campo;
            
            // Determina il colore del bordo in base allo stato (palette frozen-lake)
            let borderStyle = {};
            let statusColor = "";
            if (booking.status === "cancelled" || booking.status === "cancellation_requested") {
              borderStyle = { borderLeftColor: "#022431" }; // frozen-900 - annullata/richiesta cancellazione
              statusColor = "#022431";
            } else if (!booking.manager_confirmed) {
              borderStyle = { borderLeftColor: "#056c94" }; // frozen-700 - in attesa
              statusColor = "#056c94";
            } else {
              borderStyle = { borderLeftColor: "#08b3f7" }; // frozen-500 - confermata
              statusColor = "#08b3f7";
            }

            return (
              <div
                key={booking.id}
                className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer border-l-4"
                style={borderStyle}
              >
                <div
                  onClick={() => router.push(`/dashboard/admin/bookings/${booking.id}`)}
                  className="grid grid-cols-[40px_80px_56px_80px_100px_100px_1fr_60px_64px] items-center gap-4 no-underline"
                >
                    {/* Simbolo Tipo */}
                    <div className="flex items-center justify-center">
                      {booking.type === "lezione_privata" && (
                        <User className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      )}
                      {booking.type === "lezione_gruppo" && (
                        <Users className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      )}
                      {booking.type === "campo" && (
                        <Calendar className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      )}
                      {booking.type === "arena" && (
                        <Trophy className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      )}
                    </div>

                    {/* Data */}
                    <div className="font-bold text-secondary text-sm">
                      {formatDate(booking.start_time)}
                    </div>

                    {/* Orario */}
                    <div className="text-sm font-semibold text-secondary">
                      {formatTime(booking.start_time)}
                    </div>

                    {/* Campo */}
                    <div className="font-bold text-secondary">{booking.court}</div>

                    {/* Atleta */}
                    <div className="font-semibold text-secondary truncate text-sm">
                      {booking.user_profile?.full_name || "N/A"}
                    </div>

                    {/* Maestro */}
                    <div>
                      {(booking.type === "lezione_privata" || booking.type === "lezione_gruppo") ? (
                        <div className="font-semibold text-secondary truncate text-sm">
                          {booking.coach_profile?.full_name || "N/A"}
                        </div>
                      ) : (
                        <div className="text-sm text-secondary/30">-</div>
                      )}
                    </div>

                    {/* Spazio flessibile */}
                    <div></div>

                    {/* Stato */}
                    <div className="flex items-center justify-center gap-1">
                      {booking.status === "cancelled" ? (
                        <XCircle className="h-4 w-4" style={{ color: statusColor }} />
                      ) : booking.status === "cancellation_requested" ? (
                        <AlertCircle className="h-4 w-4" style={{ color: statusColor }} />
                      ) : booking.manager_confirmed ? (
                        <CheckCircle2 className="h-4 w-4" style={{ color: statusColor }} />
                      ) : (
                        <Clock className="h-4 w-4" style={{ color: statusColor }} />
                      )}
                    </div>

                    {/* Azioni */}
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/dashboard/admin/bookings/modifica?id=${booking.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#08b3f7] transition-all focus:outline-none w-8 h-8"
                        title="Modifica prenotazione"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm("Sei sicuro di voler eliminare questa prenotazione?")) {
                            deleteBooking(booking.id);
                          }
                        }}
                        className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-all focus:outline-none w-8 h-8"
                        title="Elimina prenotazione"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Modale di modifica rimosso: ora la modifica avviene su pagina dedicata */}
    </div>
  );
}

// Modale di modifica rimosso: ora la modifica avviene su pagina dedicata
