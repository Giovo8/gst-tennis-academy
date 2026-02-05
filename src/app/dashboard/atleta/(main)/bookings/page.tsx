"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Trophy,
  List,
  LayoutGrid,
  Pencil,
  Trash2,
  AlertCircle,
  MoreVertical,
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
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [sortField, setSortField] = useState<string>("start_time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

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
    // In modalità history mostra solo prenotazioni passate
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (mode === "default") {
      query = query.gte("start_time", today.toISOString());
    } else if (mode === "history") {
      query = query.lt("start_time", today.toISOString());
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

    // Auto-annulla prenotazioni pending con data passata
    const now = new Date();
    const expiredPendingIds = bookingsData
      .filter(b => b.status !== "cancelled" && !b.manager_confirmed && new Date(b.start_time) < now)
      .map(b => b.id);

    if (expiredPendingIds.length > 0) {
      await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .in("id", expiredPendingIds);

      for (const b of bookingsData) {
        if (expiredPendingIds.includes(b.id)) {
          b.status = "cancelled";
        }
      }
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

  async function requestCancellation(id: string) {
    if (!confirm("Vuoi richiedere la cancellazione di questa prenotazione? La segreteria dovrà approvarla.")) return;

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancellation_requested" })
      .eq("id", id);

    if (!error) {
      loadBookings();
    } else {
      alert("Errore durante la richiesta di cancellazione");
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const weekday = date.toLocaleDateString("it-IT", { weekday: "short" });
    const day = date.getDate();
    const month = date.toLocaleDateString("it-IT", { month: "short" });

    // Capitalizza prima lettera di giorno e mese
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

    return `${capitalizedWeekday} ${day} ${capitalizedMonth}`;
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
    cancellation_requested: { label: "Richiesta cancellazione", color: "bg-secondary text-white", icon: AlertCircle },
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
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {mode !== "history" && (
            <Link
              href="/dashboard/atleta/bookings/new"
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuova Prenotazione
            </Link>
          )}
          {mode !== "history" && (
            <Link
              href="/dashboard/atleta/bookings/storico"
              className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all flex-shrink-0"
              title="Storico"
            >
              <Clock className="h-5 w-5" />
            </Link>
          )}
          <button
            onClick={() => loadBookings()}
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all flex-shrink-0"
            title="Ricarica"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-md p-1 w-full sm:w-auto">
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 px-4 py-3 sm:px-3 sm:py-2.5 rounded text-sm sm:text-xs font-semibold transition-all flex items-center justify-center gap-2 sm:gap-1.5 ${
              viewMode === "list"
                ? "bg-secondary text-white"
                : "text-secondary/60 hover:text-secondary border border-gray-200"
            }`}
          >
            <List className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            Lista
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`flex-1 px-4 py-3 sm:px-3 sm:py-2.5 rounded text-sm sm:text-xs font-semibold transition-all flex items-center justify-center gap-2 sm:gap-1.5 ${
              viewMode === "timeline"
                ? "bg-secondary text-white"
                : "text-secondary/60 hover:text-secondary border border-gray-200"
            }`}
          >
            <LayoutGrid className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            Timeline
          </button>
        </div>
        {viewMode === "list" && (
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
            <input
              type="text"
              placeholder="Cerca per campo o maestro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
        )}
      </div>

      {/* Bookings List or Timeline */}
      {viewMode === "timeline" ? (
        <BookingsTimeline bookings={filteredBookings} loading={loading} basePath="/dashboard/atleta" />
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
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="space-y-3 min-w-[900px]">
            {/* Header Row */}
            <div className="bg-secondary rounded-lg px-4 py-3 mb-3 border border-secondary">
              <div className="grid grid-cols-[40px_80px_56px_80px_1fr_56px_64px] items-center gap-4">
                <div className="text-xs font-bold text-white/80 uppercase text-center">#</div>
                <div className="text-xs font-bold text-white/80 uppercase">Data</div>
                <div className="text-xs font-bold text-white/80 uppercase">Ora</div>
                <div className="text-xs font-bold text-white/80 uppercase">Campo</div>
                <div className="text-xs font-bold text-white/80 uppercase">Maestro</div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">Stato</div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">Azioni</div>
              </div>
            </div>

            {/* Data Rows */}
            {filteredBookings.map((booking) => {
              const isPast = new Date(booking.start_time) < new Date();
              const isConfirmed = booking.manager_confirmed;
              const isCancelled = booking.status === "cancelled";
              const isCancellationRequested = booking.status === "cancellation_requested";
              const canCancel = !isCancelled && !isCancellationRequested && !isPast && !isConfirmed;
              const canEdit = canCancel;
              const canRequestCancellation = isConfirmed && !isPast && !isCancelled && !isCancellationRequested;

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
                    onClick={() => router.push(`/dashboard/atleta/bookings/${booking.id}`)}
                    className="grid grid-cols-[40px_80px_56px_80px_1fr_56px_64px] items-center gap-4 no-underline"
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
                    <div className="font-bold text-secondary text-sm">{booking.court}</div>

                    {/* Maestro */}
                    <div>
                      {(booking.type === "lezione_privata" || booking.type === "lezione_gruppo") ? (
                        <div className="font-semibold text-secondary truncate text-sm">
                          {booking.coach?.full_name || "N/A"}
                        </div>
                      ) : (
                        <div className="text-sm text-secondary/30">-</div>
                      )}
                    </div>

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

                    {/* Azioni - 3 puntini */}
                    <div className="relative flex items-center justify-center">
                      {(canEdit || canCancel || canRequestCancellation) ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (openMenuId === booking.id) {
                                setOpenMenuId(null);
                                setMenuPosition(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuPosition({
                                  top: rect.bottom + 4,
                                  right: window.innerWidth - rect.right,
                                });
                                setOpenMenuId(booking.id);
                              }
                            }}
                            className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-secondary transition-all focus:outline-none w-8 h-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openMenuId === booking.id && menuPosition && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setMenuPosition(null); }} />
                              <div
                                className="fixed z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                                style={{ top: menuPosition.top, right: menuPosition.right }}
                              >
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      setMenuPosition(null);
                                      router.push(`/dashboard/atleta/bookings/${booking.id}/edit`);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Modifica
                                  </button>
                                )}
                                {canCancel && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      setMenuPosition(null);
                                      cancelBooking(booking.id);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Annulla
                                  </button>
                                )}
                                {canRequestCancellation && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      setMenuPosition(null);
                                      requestCancellation(booking.id);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors w-full"
                                  >
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    Richiedi cancellazione
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      ) : isCancellationRequested ? (
                        <span className="inline-flex items-center justify-center p-1.5 text-[#056c94]" title="Cancellazione in attesa di approvazione">
                          <Clock className="h-4 w-4" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
