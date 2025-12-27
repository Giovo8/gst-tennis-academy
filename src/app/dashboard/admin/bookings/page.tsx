"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { Calendar, Check, X, Clock, User, Filter, Shield, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Booking = {
  id: string;
  court: string;
  start_time: string;
  end_time: string;
  type: string;
  status: string;
  coach_confirmed: boolean;
  manager_confirmed: boolean;
  note: string | null;
  user: {
    full_name: string;
    email: string;
  };
  coach: {
    full_name: string;
  } | null;
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    setLoading(true);

    // Query semplificata per admin - prima prendiamo tutte le bookings
    let query = supabase
      .from("bookings")
      .select("*")
      .order("start_time", { ascending: false });

    if (filter === "pending") {
      query = query.eq("manager_confirmed", false).not("status", "in", "(cancelled,rejected_by_coach,rejected_by_manager)");
    } else if (filter === "confirmed") {
      query = query.eq("manager_confirmed", true);
    } else if (filter === "cancelled") {
      query = query.or("status.eq.cancelled,status.eq.rejected_by_coach,status.eq.rejected_by_manager");
    }

    const { data: bookingsData, error: bookingsError } = await query;

    if (bookingsError) {
      console.error("Errore caricamento prenotazioni:", bookingsError);
      setLoading(false);
      return;
    }

    if (!bookingsData || bookingsData.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    // Poi prendiamo tutti i profiles degli utenti coinvolti
    const userIds = [...new Set([
      ...bookingsData.map((b: any) => b.user_id),
      ...bookingsData.map((b: any) => b.coach_id).filter(Boolean)
    ])];

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    // Mappiamo i dati
    const mapped = bookingsData.map((item: any) => {
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
        note: item.note,
        user: {
          full_name: userProfile?.full_name || "Utente Sconosciuto",
          email: userProfile?.email || "",
        },
        coach: coachProfile ? { full_name: coachProfile.full_name || "Maestro" } : null,
      };
    });
    
    setBookings(mapped);
    setLoading(false);
  }

  async function handleApprove(bookingId: string, booking: Booking) {
    // Admin può approvare direttamente tutto
    const updates: any = {
      manager_confirmed: true,
      status: "confirmed"
    };

    // Se è lezione privata, conferma anche il coach automaticamente
    if (booking.type === "lezione_privata" && !booking.coach_confirmed) {
      updates.coach_confirmed = true;
    }

    const { error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", bookingId);

    if (!error) {
      await loadData();
    }
  }

  async function handleReject(bookingId: string) {
    const { error } = await supabase
      .from("bookings")
      .update({ 
        status: "rejected_by_manager",
        manager_confirmed: false
      })
      .eq("id", bookingId);

    if (!error) {
      await loadData();
    }
  }

  async function handleDelete(bookingId: string) {
    if (!confirm("Sei sicuro di voler eliminare definitivamente questa prenotazione?")) return;

    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (!error) {
      await loadData();
    }
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const pendingCount = bookings.filter(b => !b.manager_confirmed && !["cancelled", "rejected_by_coach", "rejected_by_manager"].includes(b.status)).length;
  const confirmedCount = bookings.filter(b => b.manager_confirmed).length;
  const cancelledCount = bookings.filter(b => ["cancelled", "rejected_by_coach", "rejected_by_manager"].includes(b.status)).length;

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-12 bg-[#021627] text-white">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Gestione Admin
          </p>
          <h1 className="text-4xl font-bold text-white">Tutte le Prenotazioni</h1>
          <p className="text-sm text-muted">
            Controllo completo su tutte le prenotazioni. L'admin può confermare direttamente senza attendere il maestro.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#2f7de1]/30 bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-500/20 p-3">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{pendingCount}</p>
                <p className="text-sm text-muted">In attesa</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#2f7de1]/30 bg-gradient-to-br from-green-500/20 to-green-500/5 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/20 p-3">
                <Check className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{confirmedCount}</p>
                <p className="text-sm text-muted">Confermate</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#2f7de1]/30 bg-gradient-to-br from-red-500/20 to-red-500/5 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/20 p-3">
                <X className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{cancelledCount}</p>
                <p className="text-sm text-muted">Annullate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === "all"
                ? "bg-accent text-[#06101f]"
                : "border border-white/10 bg-[#1a3d5c]/60 text-white hover:bg-[#1a3d5c]/80"
            }`}
          >
            <Filter className="h-4 w-4" />
            Tutte ({bookings.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === "pending"
                ? "bg-yellow-500 text-[#06101f]"
                : "border border-white/10 bg-[#1a3d5c]/60 text-white hover:bg-[#1a3d5c]/80"
            }`}
          >
            <Clock className="h-4 w-4" />
            In attesa ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("confirmed")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === "confirmed"
                ? "bg-green-500 text-[#06101f]"
                : "border border-white/10 bg-[#1a3d5c]/60 text-white hover:bg-[#1a3d5c]/80"
            }`}
          >
            <Check className="h-4 w-4" />
            Confermate ({confirmedCount})
          </button>
          <button
            onClick={() => setFilter("cancelled")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === "cancelled"
                ? "bg-red-500 text-[#06101f]"
                : "border border-white/10 bg-[#1a3d5c]/60 text-white hover:bg-[#1a3d5c]/80"
            }`}
          >
            <X className="h-4 w-4" />
            Annullate ({cancelledCount})
          </button>
        </div>

        {/* Bookings List */}
        <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          {loading ? (
            <p className="text-center text-muted py-8">Caricamento...</p>
          ) : bookings.length === 0 ? (
            <p className="text-center text-muted py-8">Nessuna prenotazione trovata</p>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const isPast = new Date(booking.start_time) < new Date();
                const isRejected = ["rejected_by_coach", "rejected_by_manager", "cancelled"].includes(booking.status);
                
                return (
                  <div
                    key={booking.id}
                    className={`rounded-lg border p-5 transition ${
                      isRejected
                        ? "border-red-400/30 bg-red-400/5"
                        : booking.manager_confirmed
                        ? "border-green-400/30 bg-green-400/5"
                        : "border-yellow-400/30 bg-yellow-400/5"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              booking.type === "campo"
                                ? "bg-blue-500/15 text-blue-400 border border-blue-400/30"
                                : "bg-purple-500/15 text-purple-400 border border-purple-400/30"
                            }`}
                          >
                            {booking.type === "campo" ? "Campo" : "Lezione Privata"}
                          </span>
                          {booking.manager_confirmed && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-400/30">
                              ✓ Confermata
                            </span>
                          )}
                          {booking.type === "lezione_privata" && booking.coach_confirmed && !booking.manager_confirmed && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-400/30">
                              Confermata da maestro
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-400/30">
                              ✗ {booking.status === "cancelled" ? "Cancellata" : "Rifiutata"}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-semibold text-white text-lg">{booking.court}</span>
                          <span className="text-muted">•</span>
                          <span className="text-muted">{formatDateTime(booking.start_time)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted">
                          <User className="h-4 w-4" />
                          <span>{booking.user.full_name}</span>
                          {booking.coach && (
                            <>
                              <span>•</span>
                              <span>Maestro: {booking.coach.full_name}</span>
                            </>
                          )}
                        </div>

                        {booking.note && (
                          <p className="text-sm text-muted italic">Note: {booking.note}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {!booking.manager_confirmed && !isRejected && (
                          <>
                            <button
                              onClick={() => handleApprove(booking.id, booking)}
                              className="flex items-center gap-2 rounded-full bg-green-500/20 border border-green-400/30 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-500/30"
                            >
                              <Check className="h-4 w-4" />
                              Conferma
                            </button>
                            <button
                              onClick={() => handleReject(booking.id)}
                              className="flex items-center gap-2 rounded-full bg-red-500/20 border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/30"
                            >
                              <X className="h-4 w-4" />
                              Rifiuta
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(booking.id)}
                          className="flex items-center gap-2 rounded-full border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-400/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Elimina
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
