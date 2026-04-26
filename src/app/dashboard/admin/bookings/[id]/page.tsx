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
  AlertCircle,
  Edit,
  Trash2,
  Loader2,
  Users,
  Circle,
  Trophy,
  Save,
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
  notes: string | null;
  created_at: string;
  user_profile?: { full_name: string; email: string; phone?: string } | null;
  coach_profile?: { full_name: string; email: string; phone?: string } | null;
  participants?: Array<{
    id?: string;
    booking_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    is_registered: boolean;
    user_id?: string | null;
    order_index?: number;
  }>;
};

type BookingDetailPageProps = {
  basePath?: string;
};

export default function BookingDetailPage({ basePath = "/dashboard/admin" }: BookingDetailPageProps) {
  const router = useRouter();
  const params = useParams();
  const bookingId = params?.id as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getPrimaryParticipant = (currentBooking: Booking | null) =>
    currentBooking?.participants?.find((participant) => participant.full_name?.trim().length > 0) || null;

  const hasParticipants = (currentBooking: Booking | null) =>
    (currentBooking?.participants?.length || 0) > 0;

  const getDisplayParticipants = (currentBooking: Booking | null) => {
    if (!currentBooking) return [];

    if (hasParticipants(currentBooking)) {
      return (currentBooking.participants || []).map((participant) => ({
        fullName: participant.full_name,
        email: participant.email || null,
        phone: participant.phone || null,
      }));
    }

    return [
      {
        fullName: currentBooking.user_profile?.full_name || "Nome non disponibile",
        email: currentBooking.user_profile?.email || null,
        phone: currentBooking.user_profile?.phone || null,
      },
    ];
  };

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  async function loadBooking() {
    try {
      const { data: bookingData, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (error || !bookingData) {
        console.error("Errore caricamento prenotazione:", error);
        alert("Prenotazione non trovata");
        router.push(`${basePath}/bookings`);
        return;
      }

      // Carica i profili
      const userIds = [bookingData.user_id, bookingData.coach_id].filter(Boolean);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      let participantsData = null;

      const participantsQuery = await supabase
        .from("booking_participants")
        .select("id, booking_id, full_name, email, phone, is_registered, user_id, order_index")
        .eq("booking_id", bookingId)
        .order("order_index", { ascending: true });

      participantsData = participantsQuery.data;

      if (participantsQuery.error?.message?.toLowerCase().includes("phone")) {
        const fallbackParticipantsQuery = await supabase
          .from("booking_participants")
          .select("id, booking_id, full_name, email, is_registered, user_id, order_index")
          .eq("booking_id", bookingId)
          .order("order_index", { ascending: true });

        participantsData = fallbackParticipantsQuery.data;
      }

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

      const enrichedBooking = {
        ...bookingData,
        user_profile: profilesMap.get(bookingData.user_id) || null,
        coach_profile: bookingData.coach_id
          ? profilesMap.get(bookingData.coach_id) || null
          : null,
        participants: participantsData || [],
      };

      setBooking(enrichedBooking);
    } catch (error) {
      console.error("Errore:", error);
      alert("Errore nel caricamento della prenotazione");
      router.push(`${basePath}/bookings`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteBooking() {
    if (!booking) return;
    if (!confirm("Sei sicuro di voler eliminare questa prenotazione? Questa azione è irreversibile.")) return;

    setActionLoading(true);
    setDeleting(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (sessionError || !token) {
        throw new Error("Sessione non valida. Effettua nuovamente il login.");
      }

      const response = await fetch(`/api/bookings?id=${encodeURIComponent(booking.id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Errore durante l'eliminazione");
      }

      router.push(`${basePath}/bookings`);
    } catch (error) {
      console.error("Errore:", error);
      alert(error instanceof Error ? error.message : "Errore durante l'eliminazione");
    } finally {
      setActionLoading(false);
      setDeleting(false);
    }
  }

  const typeConfig: Record<string, { label: string; color: string }> = {
    campo: { label: "Campo", color: "bg-secondary text-white" },
    lezione_privata: { label: "Lezione Privata", color: "bg-secondary text-white" },
    lezione_gruppo: { label: "Lezione Gruppo", color: "bg-secondary text-white" },
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    confirmed: { label: "Attiva", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
    pending: { label: "In attesa", color: "bg-amber-100 text-amber-700", icon: Clock },
    cancelled: { label: "Annullata", color: "bg-red-100 text-red-700", icon: XCircle },
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
  const isCancelledStatus =
    booking.status === "cancelled" || booking.status === "cancellation_requested";
  const isPastBooking = new Date(booking.end_time) < new Date();
  const displayStatus = !isCancelledStatus && isPastBooking
    ? {
        label: "Passata",
        color: "bg-gray-100 text-gray-700",
        icon: Clock,
      }
    : status;
  const StatusIcon = displayStatus.icon;
  const bookingType = typeConfig[booking.type] || typeConfig.campo;
  const isLesson = booking.type === "lezione_privata" || booking.type === "lezione_gruppo";
  const displayParticipants = getDisplayParticipants(booking);

  // Determina icona e stile in base al tipo
  function getBookingStyle() {
    if (!booking) {
      return {
        icon: Calendar,
        borderColor: "border-gray-400",
        bgColor: "bg-gray-400",
        iconColor: "text-gray-400",
      };
    }
    if (booking.type === "lezione_privata") {
      return {
        icon: User,
        borderColor: "border-frozen-lake-900",
        bgColor: "bg-frozen-lake-900",
        iconColor: "text-frozen-lake-900",
      };
    } else if (booking.type === "lezione_gruppo") {
      return {
        icon: Users,
        borderColor: "border-frozen-lake-900",
        bgColor: "bg-frozen-lake-900",
        iconColor: "text-frozen-lake-900",
      };
    } else if (booking.type === "arena") {
      return {
        icon: Trophy,
        borderColor: "border-frozen-lake-600",
        bgColor: "bg-frozen-lake-600",
        iconColor: "text-frozen-lake-600",
      };
    } else {
      return {
        icon: Calendar,
        borderColor: "border-frozen-lake-700",
        bgColor: "bg-frozen-lake-700",
        iconColor: "text-frozen-lake-700",
      };
    }
  }

  const bookingStyle = getBookingStyle();
  const BookingIcon = bookingStyle.icon;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <p className="breadcrumb text-secondary/60">
        <Link href={`${basePath}/bookings`} className="hover:text-secondary/80 transition-colors">Prenotazioni</Link>
        {" › "}
        <span>Dettagli Prenotazione</span>
      </p>

      {/* Header con titolo e descrizione */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-secondary">
          Dettagli Prenotazione
        </h1>
        <p className="text-secondary/70 font-medium">
          Visualizza e gestisci i dettagli della prenotazione
        </p>
      </div>

      {/* Header con info prenotazione */}
      <div
        className={
          `bg-secondary rounded-xl border-t border-r border-b border-secondary p-6 border-l-4`
        }
        style={{ borderLeftColor: (() => {
          if (booking.status === "cancelled" || booking.status === "cancellation_requested") return "#022431"; // frozen-900
          return "var(--secondary)"; // secondary
        })() }}
      >
        <div className="flex items-start gap-6">
          <BookingIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{bookingType.label}</h1>
          </div>
        </div>
      </div>

      {/* Partecipanti */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">
          Partecipanti
        </h2>
        <div className="space-y-3 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="bg-secondary rounded-lg px-4 py-3 border border-secondary min-w-[640px]">
            <div className="grid grid-cols-[40px_1.5fr_1.5fr_1fr] items-center gap-4">
              <div className="text-xs font-bold text-white/80 uppercase text-center">#</div>
              <div className="text-xs font-bold text-white/80 uppercase">Nome</div>
              <div className="text-xs font-bold text-white/80 uppercase">Email</div>
              <div className="text-xs font-bold text-white/80 uppercase">Telefono</div>
            </div>
          </div>

          {displayParticipants.map((participant, index) => (
            <div
              key={`${participant.fullName}-${index}`}
              className="bg-white rounded-lg px-4 py-3 border border-gray-200 border-l-4 min-w-[640px]"
              style={{ borderLeftColor: "var(--secondary)" }}
            >
              <div className="grid grid-cols-[40px_1.5fr_1.5fr_1fr] items-center gap-4">
                <div className="text-sm text-secondary/60 text-center">{index + 1}</div>
                <div className="text-secondary font-semibold text-sm">{participant.fullName}</div>
                <div className="text-secondary/70 text-sm">{participant.email || "Non disponibile"}</div>
                <div className="text-secondary/70 text-sm">{participant.phone || "Non disponibile"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dettagli prenotazione */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Dettagli prenotazione</h2>
        
        <div className="space-y-6">
          {/* Data */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {new Date(booking.start_time).toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).split(' ').map((part, i) => (i === 0 || i === 2) ? part.charAt(0).toUpperCase() + part.slice(1) : part).join(' ')}
              </p>
            </div>
          </div>

          {/* Campo */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Campo</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{booking.court}</p>
            </div>
          </div>

          {/* Modalità - solo per prenotazioni campo */}
          {booking.type === "campo" && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Modalità</label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {(booking.participants?.length ?? 0) > 2 ? "Doppio" : "Singolo"}
                </p>
              </div>
            </div>
          )}

          {/* Orario */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Orario</label>
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

          {/* Maestro - visibile solo per lezioni */}
          {isLesson && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Maestro</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {booking.coach_profile?.full_name || "Non assegnato"}
                  </p>
                </div>
              </div>

              {/* Email Maestro */}
              {booking.coach_profile?.email && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                  <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Email Maestro</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{booking.coach_profile.email}</p>
                  </div>
                </div>
              )}

              {/* Telefono Maestro */}
              {booking.coach_profile?.phone && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                  <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Telefono Maestro</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{booking.coach_profile.phone}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Data creazione */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Creata il</label>
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

          {/* Stato Prenotazione */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Stato</label>
            <div className="flex-1">
              <span className="flex items-center gap-2 text-secondary font-semibold">
                <StatusIcon className="h-5 w-5" />
                {displayStatus.label}
              </span>
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

      {/* Pulsanti azioni */}
      {!isPastBooking && (
        <div className="flex flex-wrap gap-3">
            {booking.status !== "cancelled" && (
              <Link
                href={`${basePath}/bookings/modifica?id=${booking.id}`}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
              >
                <Edit className="h-5 w-5" />
                Modifica
              </Link>
            )}

            <button
              onClick={deleteBooking}
              disabled={actionLoading}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading && deleting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
              Elimina
            </button>
        </div>
      )}
    </div>
  );
}
