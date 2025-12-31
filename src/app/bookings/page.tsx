"use client";

import { useEffect, useState } from "react";
import { Calendar, CheckCircle, Clock, Filter, Users, XCircle, Trash2, Loader2 } from "lucide-react";
import BookingCalendar from "@/components/bookings/BookingCalendar";
import StatCard from "@/components/dashboard/StatCard";
import AuthGuard from "@/components/auth/AuthGuard";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type BookingWithDetails = {
  id: string;
  court: string;
  start_time: string;
  end_time: string;
  type: "campo" | "lezione_privata" | "lezione_gruppo";
  status: string;
  coach_confirmed: boolean;
  manager_confirmed: boolean;
  notes: string | null;
  created_at: string;
  user: {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
  };
  coach: {
    id: string;
    full_name: string | null;
  } | null;
};

export default function BookingsPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [allBookings, setAllBookings] = useState<BookingWithDetails[]>([]); // Keep all bookings for stats
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "today" | "cancelled">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      loadBookings();
    }
  }, [userRole, filter]);

  async function loadUserRole() {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();
      setUserRole(profileData?.role ?? null);
      setCurrentUserId(userData.user.id);
    }
  }

  async function processBookingsData(bookingsData: any[]): Promise<BookingWithDetails[]> {
    // Carica i profili degli utenti coinvolti
    const userIds = [...new Set([
      ...bookingsData.map((b: any) => b.user_id),
      ...bookingsData.map((b: any) => b.coach_id).filter(Boolean)
    ])];

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    return bookingsData.map((item: any) => {
      const userProfile = profilesMap.get(item.user_id);
      const coachProfile = item.coach_id ? profilesMap.get(item.coach_id) : null;

      return {
        id: item.id,
        court: item.court,
        start_time: item.start_time,
        end_time: item.end_time,
        type: item.type,
        status: item.status,
        coach_confirmed: item.coach_confirmed,
        manager_confirmed: item.manager_confirmed,
        notes: item.notes,
        created_at: item.created_at,
        user: {
          id: userProfile?.id || "",
          full_name: userProfile?.full_name || "Sconosciuto",
          email: userProfile?.email || "",
          role: userProfile?.role || "atleta",
        },
        coach: coachProfile
          ? {
              id: coachProfile.id,
              full_name: coachProfile.full_name || "Maestro",
            }
          : null,
      };
    });
  }

  async function loadBookings() {
    setLoading(true);

    const isAdminOrGestore = userRole === "admin" || userRole === "gestore";
    const isMaestro = userRole === "maestro";

    // First, load ALL bookings for stats (without filter)
    let allQuery = supabase
      .from("bookings")
      .select("*")
      .order("start_time", { ascending: false })
      .limit(100);

    // Filtri basati sul ruolo per stats
    if (!isAdminOrGestore && !isMaestro && currentUserId) {
      allQuery = allQuery.eq("user_id", currentUserId);
    } else if (isMaestro && currentUserId) {
      allQuery = allQuery.eq("coach_id", currentUserId);
    }

    const { data: allBookingsData } = await allQuery;

    // Then, load filtered bookings for display
    let query = supabase
      .from("bookings")
      .select("*")
      .order("start_time", { ascending: false })
      .limit(100);

    // Filtri basati sul ruolo
    if (!isAdminOrGestore && !isMaestro && currentUserId) {
      query = query.eq("user_id", currentUserId);
    } else if (isMaestro && currentUserId) {
      query = query.eq("coach_id", currentUserId);
    }

    // Filtri aggiuntivi per display
    if (filter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query = query.gte("start_time", today.toISOString()).lt("start_time", tomorrow.toISOString());
    } else if (filter === "pending") {
      query = query.eq("manager_confirmed", false).neq("status", "cancelled");
    } else if (filter === "confirmed") {
      query = query.eq("manager_confirmed", true).eq("status", "confirmed");
    } else if (filter === "cancelled") {
      query = query.or("status.eq.cancelled,status.eq.rejected_by_coach,status.eq.rejected_by_manager");
    }

    const { data: bookingsData, error: bookingsError } = await query;

    if (bookingsError || !bookingsData || bookingsData.length === 0) {
      setBookings([]);
      // Still process allBookingsData for stats
      if (allBookingsData) {
        const processedAll = await processBookingsData(allBookingsData);
        setAllBookings(processedAll);
      }
      setLoading(false);
      return;
    }

    // Carica i profili degli utenti coinvolti per filtered bookings
    const mapped = await processBookingsData(bookingsData);
    setBookings(mapped);

    // Process all bookings for stats
    if (allBookingsData) {
      const processedAll = await processBookingsData(allBookingsData);
      setAllBookings(processedAll);
    }

    setLoading(false);
  }

  async function handleApprove(bookingId: string) {
    const { error } = await supabase
      .from("bookings")
      .update({
        manager_confirmed: true,
        status: "confirmed",
      })
      .eq("id", bookingId);

    if (!error) {
      await loadBookings();
    } else {
      alert("Errore durante l'approvazione");
    }
  }

  async function handleReject(bookingId: string) {
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "rejected_by_manager",
        manager_confirmed: false,
      })
      .eq("id", bookingId);

    if (!error) {
      await loadBookings();
    } else {
      alert("Errore durante il rifiuto");
    }
  }

  async function handleDelete(bookingId: string) {
    if (!confirm("Sei sicuro di voler eliminare questa prenotazione?")) return;

    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (!error) {
      await loadBookings();
    } else {
      alert("Errore durante l'eliminazione");
    }
  }

  const isAdminView = userRole === "admin" || userRole === "gestore";
  const isMaestroView = userRole === "maestro";

  // Calcola statistiche usando TUTTI i bookings (non filtrati)
  const stats = {
    total: allBookings.length,
    pending: allBookings.filter((b) => !b.manager_confirmed && b.status !== "cancelled" && !b.status.includes("rejected")).length,
    confirmed: allBookings.filter((b) => b.manager_confirmed && b.status === "confirmed").length,
    private: allBookings.filter((b) => b.type === "lezione_privata").length,
    cancelled: allBookings.filter((b) => b.status === "cancelled" || b.status.includes("rejected")).length,
  };

  return (
    <AuthGuard>
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 sm:gap-5 px-4 sm:px-6 py-6 sm:py-10 bg-[#021627] text-white">
        <div className="space-y-1.5 sm:space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Sistema di Prenotazione
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            {isAdminView
              ? "Gestione Prenotazioni"
              : isMaestroView
              ? "Le Mie Lezioni"
              : "Prenota Campo o Lezione"}
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            {isAdminView
              ? "Vista completa delle prenotazioni con gestione e statistiche"
              : isMaestroView
              ? "Visualizza e gestisci le tue lezioni private"
              : "Seleziona giorno, campo e orario. Per le lezioni private scegli il maestro desiderato."}
          </p>
        </div>

        {(isAdminView || isMaestroView) && (
          <>
            {/* Statistiche rapide */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard title="Totale" value={stats.total} icon={<Calendar className="h-8 w-8 text-indigo-300" />} color="indigo" />
              <StatCard title="In Attesa" value={stats.pending} icon={<Clock className="h-8 w-8 text-yellow-300" />} color="yellow" />
              <StatCard title="Confermate" value={stats.confirmed} icon={<CheckCircle className="h-8 w-8 text-lime-300" />} color="lime" />
              <StatCard title="Lezioni Private" value={stats.private} icon={<Users className="h-8 w-8 text-sky-300" />} color="sky" />
              <StatCard title="Annullate" value={stats.cancelled} icon={<XCircle className="h-8 w-8 text-red-300" />} color="red" />
            </div>

            {/* Filtri */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-white/70" />
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-semibold transition min-h-[40px] shadow-lg ${
                  filter === "all"
                    ? "bg-gradient-to-r from-[#2f7de1] to-[#1e5bb8] text-white ring-2 ring-white/30"
                    : "border-2 border-white/30 text-white bg-white/5 hover:bg-white/10 hover:border-white/50"
                }`}
              >
                Tutte
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={`rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-semibold transition min-h-[40px] shadow-lg ${
                  filter === "pending"
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white ring-2 ring-white/30"
                    : "border-2 border-white/30 text-white bg-white/5 hover:bg-white/10 hover:border-white/50"
                }`}
              >
                In Attesa ({stats.pending})
              </button>
              <button
                onClick={() => setFilter("confirmed")}
                className={`rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-semibold transition min-h-[40px] shadow-lg ${
                  filter === "confirmed"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white ring-2 ring-white/30"
                    : "border-2 border-white/30 text-white bg-white/5 hover:bg-white/10 hover:border-white/50"
                }`}
              >
                Confermate
              </button>
              <button
                onClick={() => setFilter("cancelled")}
                className={`rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-semibold transition min-h-[40px] shadow-lg ${
                  filter === "cancelled"
                    ? "bg-gradient-to-r from-red-500 to-red-600 text-white ring-2 ring-white/30"
                    : "border-2 border-white/30 text-white bg-white/5 hover:bg-white/10 hover:border-white/50"
                }`}
              >
                Annullate
              </button>
            </div>

            {/* Lista prenotazioni */}
            <div className="space-y-2.5 sm:space-y-3">
              <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Elenco Prenotazioni
                {filter !== "all" && (
                  <span className="text-xs sm:text-sm font-normal text-muted">
                    ({filter === "today" ? "Oggi" : filter === "pending" ? "In Attesa" : filter === "confirmed" ? "Confermate" : "Annullate"})
                  </span>
                )}
              </h2>
              {loading ? (
                <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-2" />
                  <p className="text-muted">Caricamento prenotazioni...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-2 mx-auto mb-3 opacity-50" />
                  <p className="text-muted">Nessuna prenotazione trovata</p>
                </div>
              ) : (
                <div className="space-y-2.5 sm:space-y-3">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-4 sm:p-5 transition hover:border-[#2f7de1]/50 hover:bg-[#1a3d5c]/80"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-[200px] sm:min-w-[250px]">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                            <span className="text-base sm:text-lg font-semibold text-white">
                              {format(new Date(booking.start_time), "dd MMM yyyy", { locale: it })}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                booking.manager_confirmed && booking.status === "confirmed"
                                  ? "bg-green-400/20 text-green-300"
                                  : booking.status === "cancelled" || booking.status.includes("rejected")
                                  ? "bg-red-400/20 text-red-300"
                                  : "bg-yellow-400/20 text-yellow-300"
                              }`}
                            >
                              {booking.manager_confirmed && booking.status === "confirmed"
                                ? "✓ Confermata"
                                : booking.status === "cancelled"
                                ? "✗ Cancellata"
                                : booking.status.includes("rejected")
                                ? "✗ Rifiutata"
                                : "⏳ In Attesa"}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-[#2f7de1]/20 text-[#7de3ff]">
                              {booking.type === "campo"
                                ? "Campo"
                                : booking.type === "lezione_privata"
                                ? "Lezione Privata"
                                : "Lezione di Gruppo"}
                            </span>
                          </div>
                          <div className="space-y-1 sm:space-y-1.5 text-xs sm:text-sm">
                            <p className="text-white">
                              <Clock className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 text-accent" />
                              <strong>Orario:</strong>{" "}
                              {format(new Date(booking.start_time), "HH:mm")} -{" "}
                              {format(new Date(booking.end_time), "HH:mm")}
                              <span className="ml-3 text-muted">
                                <Calendar className="inline h-4 w-4 mr-1" />
                                {booking.court}
                              </span>
                            </p>
                            <p className="text-white">
                              <Users className="inline h-4 w-4 mr-1.5 text-accent" />
                              <strong>Atleta:</strong> {booking.user.full_name}{" "}
                              <span className="text-muted-2 text-xs">({booking.user.role})</span>
                            </p>
                            {isAdminView && (
                              <p className="text-muted-2 text-xs">📧 {booking.user.email}</p>
                            )}
                            {booking.coach && (
                              <p className="text-white">
                                <Users className="inline h-4 w-4 mr-1.5 text-accent" />
                                <strong>Maestro:</strong> {booking.coach.full_name}
                                {booking.type === "lezione_privata" && (
                                  <span
                                    className={`ml-2 text-xs px-2 py-0.5 rounded ${
                                      booking.coach_confirmed
                                        ? "bg-green-400/20 text-green-300"
                                        : "bg-yellow-400/20 text-yellow-300"
                                    }`}
                                  >
                                    {booking.coach_confirmed ? "✓ Confermata" : "⏳ Da confermare"}
                                  </span>
                                )}
                              </p>
                            )}
                            {booking.notes && (
                              <p className="text-muted text-xs mt-2 italic">
                                <strong>Note:</strong> {booking.notes}
                              </p>
                            )}
                            <p className="text-muted-2 text-xs mt-2">
                              Creata il {format(new Date(booking.created_at), "dd/MM/yyyy HH:mm")}
                            </p>
                          </div>
                        </div>

                        {isAdminView && (
                          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                            {!booking.manager_confirmed && booking.status !== "cancelled" && !booking.status.includes("rejected") && (
                              <>
                                <button
                                  onClick={() => handleApprove(booking.id)}
                                  className="rounded-lg bg-blue-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white transition hover:bg-blue-600 flex items-center gap-1.5 sm:gap-2 min-h-[40px] flex-1 sm:flex-initial justify-center"
                                  title="Approva prenotazione"
                                >
                                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  Approva
                                </button>
                                <button
                                  onClick={() => handleReject(booking.id)}
                                  className="rounded-lg bg-cyan-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white transition hover:bg-red-600 flex items-center gap-1.5 sm:gap-2 min-h-[40px] flex-1 sm:flex-initial justify-center"
                                  title="Rifiuta prenotazione"
                                >
                                  <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  Rifiuta
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDelete(booking.id)}
                              className="rounded-lg bg-cyan-900/50 border border-cyan-500/50 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-red-300 transition hover:bg-cyan-900/80 flex items-center gap-1.5 sm:gap-2 min-h-[40px] flex-1 sm:flex-initial justify-center"
                              title="Elimina prenotazione"
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              Elimina
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="space-y-2.5 sm:space-y-3">
          <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            {isAdminView ? "Crea Nuova Prenotazione" : "Calendario Prenotazioni"}
          </h2>
          <BookingCalendar />
        </div>
      </main>
    </AuthGuard>
  );
}
