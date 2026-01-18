"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  Circle,
  Trophy,
  ArrowLeft,
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
  coach_profile?: { full_name: string; email: string; phone?: string } | null;
};

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  async function loadBooking() {
    try {
      // Verifica che l'utente sia loggato
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: bookingData, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .eq("user_id", user.id) // Solo prenotazioni dell'utente corrente
        .single();

      if (error || !bookingData) {
        console.error("Errore caricamento prenotazione:", error);
        alert("Prenotazione non trovata");
        router.push("/dashboard/atleta/bookings");
        return;
      }

      // Carica il profilo del coach se presente
      let coachProfile = null;
      if (bookingData.coach_id) {
        const { data: coachData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .eq("id", bookingData.coach_id)
          .single();
        coachProfile = coachData;
      }

      const enrichedBooking = {
        ...bookingData,
        coach_profile: coachProfile,
      };

      setBooking(enrichedBooking);
    } catch (error) {
      console.error("Errore:", error);
      alert("Errore nel caricamento della prenotazione");
      router.push("/dashboard/atleta/bookings");
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking() {
    if (!booking) return;
    if (!confirm("Sei sicuro di voler annullare questa prenotazione?")) return;

    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id);

      if (!error) {
        loadBooking();
      } else {
        alert("Errore durante l'annullamento");
      }
    } catch (error) {
      console.error("Errore:", error);
      alert("Errore durante l'annullamento");
    } finally {
      setActionLoading(false);
    }
  }

  const typeConfig: Record<string, { label: string }> = {
    campo: { label: "Campo" },
    lezione_privata: { label: "Lezione Privata" },
    lezione_gruppo: { label: "Lezione Gruppo" },
    arena: { label: "Arena" },
  };

  const statusConfig: Record<
    string,
    { label: string; color: string; icon: React.ElementType }
  > = {
    confirmed: {
      label: "Confermata",
      color: "text-emerald-600",
      icon: CheckCircle2,
    },
    pending: { label: "In attesa", color: "text-amber-600", icon: Clock },
    cancelled: { label: "Annullata", color: "text-red-600", icon: XCircle },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento...</p>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const status = statusConfig[booking.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const bookingType = typeConfig[booking.type] || typeConfig.campo;
  const isLesson =
    booking.type === "lezione_privata" || booking.type === "lezione_gruppo";
  const isPast = new Date(booking.start_time) < new Date();
  const canCancel = booking.status !== "cancelled" && !isPast;

  // Determina icona in base al tipo
  function getBookingIcon() {
    if (!booking) return Circle;
    if (booking.type === "lezione_privata") return User;
    if (booking.type === "lezione_gruppo") return Users;
    if (booking.type === "arena") return Trophy;
    return Circle;
  }

  const BookingIcon = getBookingIcon();

  // Determina colore bordo in base allo stato
  function getStatusBorderColor() {
    if (!booking) return "#9ca3af";
    if (booking.status === "cancelled") return "#ef4444";
    if (!booking.manager_confirmed) return "#f59e0b";
    return "#10b981";
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
        <Link
          href="/dashboard/atleta/bookings"
          className="hover:text-secondary/80 transition-colors"
        >
          Prenotazioni
        </Link>
        <span className="mx-2">›</span>
        <span>Dettagli</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Dettagli Prenotazione
          </h1>
          <p className="text-secondary/70 font-medium">
            Visualizza i dettagli della tua prenotazione
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/atleta/bookings"
            className="p-2.5 text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary hover:text-white transition-all"
            title="Torna alla lista"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {canCancel && (
            <button
              onClick={cancelBooking}
              disabled={actionLoading}
              className="px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Annulla Prenotazione
            </button>
          )}
        </div>
      </div>

      {/* Header con info prenotazione */}
      <div
        className="bg-secondary rounded-xl border-t border-r border-b border-secondary p-6 border-l-4"
        style={{ borderLeftColor: getStatusBorderColor() }}
      >
        <div className="flex items-start gap-6">
          <BookingIcon
            className="h-8 w-8 text-white flex-shrink-0"
            strokeWidth={2.5}
          />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{booking.court}</h2>
            <p className="text-white/70 mt-1">{bookingType.label}</p>
          </div>
        </div>
      </div>

      {/* Dettagli prenotazione */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">
          Dettagli prenotazione
        </h2>

        <div className="space-y-6">
          {/* Data */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Data
            </label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {new Date(booking.start_time).toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Orario */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Orario
            </label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {new Date(booking.start_time).toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                -{" "}
                {new Date(booking.end_time).toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Stato */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Stato
            </label>
            <div className="flex-1">
              <span
                className={`flex items-center gap-2 font-semibold ${status.color}`}
              >
                <StatusIcon className="h-5 w-5" />
                {status.label}
              </span>
            </div>
          </div>

          {/* Maestro - visibile solo per lezioni */}
          {isLesson && (
            <>
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Maestro
                </label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {booking.coach_profile?.full_name || "Non assegnato"}
                  </p>
                </div>
              </div>

              {/* Conferma Maestro */}
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Conferma Maestro
                </label>
                <div className="flex-1">
                  {booking.coach_confirmed ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-5 w-5" />
                      Confermata
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                      <Clock className="h-5 w-5" />
                      In attesa
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Conferma Manager */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Conferma Segreteria
            </label>
            <div className="flex-1">
              {booking.manager_confirmed ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-5 w-5" />
                  Confermata
                </span>
              ) : (
                <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                  <Clock className="h-5 w-5" />
                  In attesa di approvazione
                </span>
              )}
            </div>
          </div>

          {/* Data creazione */}
          <div className="flex items-start gap-8">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Creata il
            </label>
            <div className="flex-1">
              <p className="text-secondary/70">
                {new Date(booking.created_at).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      {booking.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-secondary mb-4">Note</h2>
          <p className="text-secondary/70">{booking.notes}</p>
        </div>
      )}
    </div>
  );
}
