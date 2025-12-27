"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import AuthGuard from "@/components/auth/AuthGuard";
import { Calendar, Trash2, AlertCircle } from "lucide-react";

type Booking = {
  id: string;
  court: string;
  type: string;
  start_time: string;
  end_time: string;
  coach_id: string | null;
  status: string;
  coach_confirmed: boolean | null;
  manager_confirmed: boolean | null;
};

export default function AthleteBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("start_time", { ascending: false });

    if (data) setBookings(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    // Trova la prenotazione da cancellare
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    // Verifica 24h
    const startTime = new Date(booking.start_time);
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (startTime < twentyFourHoursFromNow) {
      alert("Non è possibile cancellare prenotazioni con meno di 24 ore di anticipo.");
      return;
    }

    if (!confirm("Sei sicuro di voler cancellare questa prenotazione?")) return;

    setDeletingId(id);
    const { data: { session } } = await supabase.auth.getSession();
    
    const res = await fetch(`/api/bookings?id=${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });

    if (res.ok) {
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } else {
      alert("Errore durante la cancellazione");
    }
    setDeletingId(null);
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <AuthGuard allowedRoles={["atleta", "maestro", "admin", "gestore"]}>
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12 bg-[#021627] text-white">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Le Tue Prenotazioni
          </p>
          <h1 className="text-4xl font-bold text-white">
            Storico Prenotazioni
          </h1>
          <p className="text-sm text-muted">
            Visualizza e gestisci tutte le tue prenotazioni passate e future
          </p>
        </div>

        <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
          {loading ? (
            <p className="text-center text-muted py-8">Caricamento...</p>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-2 mx-auto mb-4" />
              <p className="text-muted mb-4">Non hai ancora effettuato prenotazioni</p>
              <a
                href="/bookings"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-[#06101f] hover:bg-[#5fc7e0] transition"
              >
                <Calendar className="h-4 w-4" />
                Prenota ora
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const isPast = new Date(booking.start_time) < new Date();
                const startTime = new Date(booking.start_time);
                const canCancel = startTime > new Date(Date.now() + 24 * 60 * 60 * 1000);
                
                // Determina lo stato della prenotazione
                const needsCoachConfirm = booking.type !== "campo" && !booking.coach_confirmed;
                const needsManagerConfirm = !booking.manager_confirmed;
                const isConfirmed = booking.manager_confirmed && (booking.type === "campo" || booking.coach_confirmed);
                const isPending = !isConfirmed && !isPast;

                return (
                  <div
                    key={booking.id}
                    className={`rounded-lg border p-5 transition ${
                      isPast
                        ? "border-white/10 bg-[#0d1f35]/40 opacity-60"
                        : "border-[#2f7de1]/30 bg-[#0d1f35]/60 hover:bg-[#0d1f35]/80"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              booking.type === "campo"
                                ? "bg-blue-500/15 text-blue-400"
                                : booking.type === "lezione_privata"
                                ? "bg-green-500/15 text-green-400"
                                : "bg-purple-500/15 text-purple-400"
                            }`}
                          >
                            {booking.type === "campo"
                              ? "Campo"
                              : booking.type === "lezione_privata"
                              ? "Lezione Privata"
                              : "Lezione Privata di Gruppo"}
                          </span>
                          {isPast && (
                            <span className="text-xs text-muted-2">
                              (Completata)
                            </span>
                          )}
                          {isPending && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400">
                              {needsCoachConfirm && needsManagerConfirm 
                                ? "In attesa conferme" 
                                : needsCoachConfirm 
                                ? "In attesa maestro" 
                                : "In attesa gestore"}
                            </span>
                          )}
                          {isConfirmed && !isPast && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400">
                              Confermata
                            </span>
                          )}
                          {!isPast && !canCancel && (
                            <span className="text-xs text-yellow-400">
                              (Non cancellabile)
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-white text-lg mb-1">
                          {booking.court}
                        </p>
                        <p className="text-sm text-muted">
                          {formatDateTime(booking.start_time)}
                        </p>
                      </div>
                      {!isPast && canCancel && (
                        <button
                          onClick={() => handleDelete(booking.id)}
                          disabled={deletingId === booking.id}
                          className="flex items-center gap-2 rounded-full border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-400 transition hover:border-red-400/50 hover:bg-red-400/10 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingId === booking.id ? "..." : "Cancella"}
                        </button>
                      )}
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


