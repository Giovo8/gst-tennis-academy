"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { Calendar, Check, X, Clock, User, Filter, Shield } from "lucide-react";
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

export default function GestoreDashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    setLoading(true);

    let query = supabase
      .from("bookings")
      .select(`
        id, court, start_time, end_time, type, status, coach_confirmed, manager_confirmed, note,
        profiles!bookings_user_id_fkey (full_name, email),
        coach:profiles!bookings_coach_id_fkey (full_name)
      `)
      .order("start_time", { ascending: true });

    if (filter === "pending") {
      query = query.eq("manager_confirmed", false).neq("status", "rejected_by_coach");
    } else if (filter === "approved") {
      query = query.eq("manager_confirmed", true);
    }

    const { data, error } = await query;

    if (!error && data) {
      const mapped = data.map((item: any) => ({
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
          full_name: item.profiles.full_name || "Atleta",
          email: item.profiles.email,
        },
        coach: item.coach ? { full_name: item.coach.full_name || "Maestro" } : null,
      }));
      setBookings(mapped);
    }

    setLoading(false);
  }

  async function handleApprove(bookingId: string, booking: Booking) {
    // Verifica se serve conferma del coach
    if (booking.type === "lezione_privata" && !booking.coach_confirmed) {
      alert("Questa lezione privata deve essere prima confermata dal maestro.");
      return;
    }

    const { error } = await supabase
      .from("bookings")
      .update({ 
        manager_confirmed: true,
        status: "confirmed"
      })
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

  const pendingCount = bookings.filter(b => !b.manager_confirmed).length;
  const waitingCoachCount = bookings.filter(b => b.type === "lezione_privata" && !b.coach_confirmed).length;

  return (
    <AuthGuard allowedRoles={["gestore", "admin"]}>
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2">Dashboard Gestore</p>
          <h1 className="text-3xl font-bold text-white">Gestione Prenotazioni</h1>
          <p className="mt-2 text-sm text-muted">
            Approva o rifiuta tutte le prenotazioni dopo la conferma del maestro
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-500/20 p-3">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                <p className="text-sm text-muted">In attesa</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-500/20 p-3">
                <User className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{waitingCoachCount}</p>
                <p className="text-sm text-muted">Attesa maestro</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500/20 p-3">
                <Check className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {bookings.filter(b => b.manager_confirmed).length}
                </p>
                <p className="text-sm text-muted">Approvate</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/20 p-3">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{bookings.length}</p>
                <p className="text-sm text-muted">Totali</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setFilter("pending")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === "pending"
                ? "bg-[#2f7de1] text-white"
                : "border border-white/15 text-muted hover:border-white/30"
            }`}
          >
            Da approvare ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === "approved"
                ? "bg-[#2f7de1] text-white"
                : "border border-white/15 text-muted hover:border-white/30"
            }`}
          >
            Approvate
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === "all"
                ? "bg-[#2f7de1] text-white"
                : "border border-white/15 text-muted hover:border-white/30"
            }`}
          >
            Tutte
          </button>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 text-center">
              <p className="text-sm text-muted">Caricamento...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8 text-center">
              <p className="text-sm text-muted">Nessuna prenotazione trovata</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <User className="h-4 w-4 text-accent" />
                      <span className="font-semibold text-white">
                        {booking.user.full_name}
                      </span>
                      <span className="text-sm text-muted">({booking.user.email})</span>
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        booking.type === "lezione_privata" 
                          ? "bg-purple-500/20 text-purple-300"
                          : booking.type === "lezione_gruppo"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-green-500/20 text-green-300"
                      }`}>
                        {booking.type === "lezione_privata" ? "Lezione Privata" : 
                         booking.type === "lezione_gruppo" ? "Lezione Privata di Gruppo" : "Campo"}
                      </span>
                      {booking.coach && (
                        <span className="text-sm text-muted">
                          Maestro: {booking.coach.full_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted">
                      <span>
                        <Calendar className="mr-1 inline h-4 w-4" />
                        {new Date(booking.start_time).toLocaleDateString("it-IT", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span>
                        <Clock className="mr-1 inline h-4 w-4" />
                        {new Date(booking.start_time).toLocaleTimeString("it-IT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(booking.end_time).toLocaleTimeString("it-IT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="rounded-full border border-white/15 px-2 py-1 text-xs">
                        {booking.court}
                      </span>
                    </div>
                    {booking.note && (
                      <p className="mt-2 text-sm text-muted-2">Note: {booking.note}</p>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      {booking.type === "lezione_privata" && (
                        booking.coach_confirmed ? (
                          <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
                            <Check className="h-4 w-4" />
                            Maestro ha confermato
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm text-yellow-400">
                            <Clock className="h-4 w-4" />
                            In attesa maestro
                          </span>
                        )
                      )}
                      {booking.manager_confirmed ? (
                        <span className="inline-flex items-center gap-1 text-sm text-blue-400">
                          <Shield className="h-4 w-4" />
                          Approvata
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-orange-400">
                          <Clock className="h-4 w-4" />
                          Da approvare
                        </span>
                      )}
                    </div>
                  </div>
                  {!booking.manager_confirmed && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(booking.id, booking)}
                        disabled={booking.type === "lezione_privata" && !booking.coach_confirmed}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={booking.type === "lezione_privata" && !booking.coach_confirmed ? "Attendi conferma maestro" : ""}
                      >
                        <Check className="h-4 w-4" />
                        Approva
                      </button>
                      <button
                        onClick={() => handleReject(booking.id)}
                        className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        <X className="h-4 w-4" />
                        Rifiuta
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
