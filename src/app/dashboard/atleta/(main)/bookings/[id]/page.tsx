"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { createNotification } from "@/lib/notifications/createNotification";
import {
  Calendar,
  CalendarClock,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  Trophy,
  AlertCircle,
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

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const dashboardBase = pathname.split("/bookings")[0];
  const isMaestroDashboard = dashboardBase.includes("/dashboard/maestro");
  const bookingId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const hasParticipants = (currentBooking: Booking | null) =>
    (currentBooking?.participants?.length || 0) > 0;

  const getDisplayParticipants = (currentBooking: Booking | null) => {
    if (!currentBooking) return [];

    const athletes = hasParticipants(currentBooking)
      ? (currentBooking.participants || []).map((participant) => ({
          fullName: participant.full_name,
          email: participant.email || null,
          phone: participant.phone || null,
          isCoach: false,
          isGuest: !participant.is_registered,
        }))
      : [
          {
            fullName: currentBooking.user_profile?.full_name || "Nome non disponibile",
            email: currentBooking.user_profile?.email || null,
            phone: currentBooking.user_profile?.phone || null,
            isCoach: false,
            isGuest: false,
          },
        ];

    if (currentBooking.type === "lezione_privata" && currentBooking.coach_profile) {
      athletes.push({
        fullName: currentBooking.coach_profile.full_name,
        email: currentBooking.coach_profile.email || null,
        phone: currentBooking.coach_profile.phone || null,
        isCoach: true,
        isGuest: false,
      });
    }

    return athletes;
  };

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

      let bookingQuery = supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId);

      if (isMaestroDashboard) {
        // In dashboard maestro, allow bookings where user is owner OR assigned coach.
        bookingQuery = bookingQuery.or(`user_id.eq.${user.id},coach_id.eq.${user.id}`);
      } else {
        bookingQuery = bookingQuery.eq("user_id", user.id);
      }

      const { data: bookingData, error } = await bookingQuery.maybeSingle();

      if (error || !bookingData) {
        console.error("Errore caricamento prenotazione:", error);
        alert("Prenotazione non trovata");
        router.push(`${dashboardBase}/bookings`);
        return;
      }

      // Carica i profili (utente + coach) in una sola query
      const userIds = [bookingData.user_id, bookingData.coach_id].filter(Boolean);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      // Carica i partecipanti con fallback se la colonna phone non esiste
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
      router.push(`${dashboardBase}/bookings`);
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking() {
    if (!booking) return;
    if (!confirm("Sei sicuro di voler annullare questa prenotazione?")) return;

    setActionLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (sessionError || !token) {
        throw new Error("Sessione non valida. Effettua nuovamente il login.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Sessione non valida. Effettua nuovamente il login.");
      }

      const updateQuery = supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id);

      const { error: updateError } = isMaestroDashboard
        ? await updateQuery.or(`user_id.eq.${user.id},coach_id.eq.${user.id}`)
        : await updateQuery.eq("user_id", user.id);

      if (updateError) {
        throw new Error(updateError.message || "Errore durante l'annullamento");
      }

      const { data: actorProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const actorName = actorProfile?.full_name?.trim() || "Un utente";
      const dateLabel = new Date(booking.start_time).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const timeLabel = new Date(booking.start_time).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const bookingLabel = booking.type === "lezione_privata"
        ? "lezione privata"
        : booking.type === "lezione_gruppo"
          ? "lezione di gruppo"
          : booking.type === "arena"
            ? "match arena"
            : "prenotazione";

      const notifyPromises: Array<Promise<void>> = [];

      if (booking.coach_id && booking.coach_id !== user.id) {
        notifyPromises.push(
          createNotification({
            userId: booking.coach_id,
            type: "booking",
            title: "Prenotazione annullata",
            message: `${actorName} ha annullato la ${bookingLabel} ${booking.court} del ${dateLabel} alle ${timeLabel}.`,
            link: `/dashboard/maestro/bookings/${booking.id}`,
          })
        );
      }

      if (booking.user_id && booking.user_id !== user.id) {
        notifyPromises.push(
          createNotification({
            userId: booking.user_id,
            type: "booking",
            title: "Prenotazione annullata",
            message: `${actorName} ha annullato la ${bookingLabel} ${booking.court} del ${dateLabel} alle ${timeLabel}.`,
            link: `/dashboard/atleta/bookings/${booking.id}`,
          })
        );
      }

      const { data: managers } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["admin", "gestore"]);

      for (const manager of managers || []) {
        if (manager.id === user.id) continue;
        notifyPromises.push(
          createNotification({
            userId: manager.id,
            type: "booking",
            title: "Prenotazione annullata",
            message: `${actorName} ha annullato la ${bookingLabel} ${booking.court} del ${dateLabel} alle ${timeLabel}.`,
            link: `/dashboard/admin/bookings/${booking.id}`,
          })
        );
      }

      await Promise.all(notifyPromises);

      router.push(`${dashboardBase}/bookings`);
    } catch (error) {
      console.error("Errore:", error);
      alert(error instanceof Error ? error.message : "Errore durante l'annullamento");
    } finally {
      setActionLoading(false);
    }
  }

  const typeConfig: Record<string, { label: string; color: string }> = {
    campo: { label: "Prenotazione Campo", color: "bg-secondary text-white" },
    lezione_privata: { label: "Lezione Privata", color: "bg-secondary text-white" },
    lezione_gruppo: { label: "Lezione Gruppo", color: "bg-secondary text-white" },
    arena: { label: "Arena", color: "bg-secondary text-white" },
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    confirmed: { label: "Attiva", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
    pending: { label: "In attesa", color: "bg-amber-100 text-amber-700", icon: Clock },
    cancelled: { label: "Annullata", color: "bg-red-100 text-red-700", icon: XCircle },
    cancellation_requested: { label: "Richiesta cancellazione", color: "bg-orange-100 text-orange-700", icon: AlertCircle },
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
  const bookingType = typeConfig[booking.type] || typeConfig.campo;
  const isLesson =
    booking.type === "lezione_privata" || booking.type === "lezione_gruppo";
  const isPast = new Date(booking.start_time) < new Date();
  const isPastLesson =
    isLesson &&
    new Date(booking.end_time) < new Date() &&
    booking.status !== "cancelled" &&
    booking.status !== "cancellation_requested";
  const effectiveStatus = isPastLesson
    ? { label: "Passata", icon: Clock }
    : { label: status.label, icon: status.icon };
  const StatusIcon = effectiveStatus.icon;
  const isCancelled = booking.status === "cancelled";
  const isCancellationRequested = booking.status === "cancellation_requested";
  const canCancel = !isCancelled && !isCancellationRequested && !isPast;
  const displayParticipants = getDisplayParticipants(booking);

  // Determina icona e stile in base al tipo
  function getBookingStyle() {
    if (!booking) {
      return {
        icon: Calendar,
        backgroundColor: "var(--secondary)",
        borderColor: "var(--secondary)",
        leftBorderColor: "var(--secondary)",
      };
    }

    if (booking.type === "lezione_privata" || booking.type === "lezione_gruppo") {
      return {
        icon: Users,
        backgroundColor: "#023047",
        borderColor: "#023047",
        leftBorderColor: "#011a24",
      };
    }

    if (booking.type === "arena") {
      return {
        icon: Trophy,
        backgroundColor: "var(--color-frozen-lake-600)",
        borderColor: "var(--color-frozen-lake-600)",
        leftBorderColor: "var(--color-frozen-lake-900)",
      };
    }

    return {
      icon: CalendarClock,
      backgroundColor: "var(--secondary)",
      borderColor: "var(--secondary)",
      leftBorderColor: "#023047",
    };
  }

  const bookingStyle = getBookingStyle();
  const BookingIcon = bookingStyle.icon;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <p className="breadcrumb text-secondary/60">
        <Link href={`${dashboardBase}/bookings`} className="hover:text-secondary/80 transition-colors">Prenotazioni</Link>
        {" › "}
        <span>Dettagli Prenotazione</span>
      </p>

      <div>
        <h1 className="text-4xl font-bold text-secondary">Dettagli Prenotazione</h1>
      </div>

      {/* Header con info prenotazione */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{
          backgroundColor: bookingStyle.backgroundColor,
          borderColor: bookingStyle.borderColor,
          borderLeftColor: bookingStyle.leftBorderColor,
        }}
      >
        <div className="flex items-start gap-6">
          <BookingIcon
            className="h-8 w-8 text-white flex-shrink-0"
            strokeWidth={2.5}
          />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{bookingType.label}</h2>
          </div>
        </div>
      </div>

      {/* Partecipanti */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Partecipanti</h2>
        </div>
        <div className="px-6 py-4">
          <ul className="flex flex-col gap-2">
            {displayParticipants.map((participant, index) => {
              const bg = participant.isCoach ? "#023047" : participant.isGuest ? "#023b52" : "var(--secondary)";

              return (
                <li key={`${participant.fullName}-${index}`}>
                  <div className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: bg }}>
                    <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-white leading-none">
                        {participant.fullName.trim().split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{participant.fullName}</p>
                      {participant.email && (
                        <p className="text-xs text-white/60 truncate mt-0.5">{participant.email}</p>
                      )}
                      {participant.phone && (
                        <p className="text-xs text-white/60 mt-0.5">{participant.phone}</p>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold text-white/50 uppercase tracking-wide">
                      {participant.isCoach ? "MAESTRO" : participant.isGuest ? "OSPITE" : "ATLETA"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Dettagli prenotazione */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli prenotazione</h2>
        </div>

        <div className="p-6">
        <div className="space-y-6">
          {/* Data */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Data
            </label>
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
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Campo
            </label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{booking.court}</p>
            </div>
          </div>

          {/* Modalità - solo per prenotazioni campo */}
          {booking.type === "campo" && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Modalità
              </label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {(booking.participants?.length ?? 0) > 2 ? "Doppio" : "Singolo"}
                </p>
              </div>
            </div>
          )}

          {/* Orario */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
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

          {/* Data creazione */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
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

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Stato
            </label>
            <div className="flex-1">
              <span className="text-secondary font-semibold">{effectiveStatus.label}</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Note */}
      {booking.notes && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Note</h2>
          </div>
          <div className="px-6 py-6">
            <p className="text-secondary/70">{booking.notes}</p>
          </div>
        </div>
      )}

      {/* Pulsanti azioni */}
      <div className="flex flex-col sm:flex-row gap-3">
        {canCancel && (
          <button
            onClick={cancelBooking}
            disabled={actionLoading}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#023b52] rounded-lg hover:bg-[#023b52]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : null
            }
            Annulla
          </button>
        )}
        {isCancellationRequested && (
          <span className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#056c94] rounded-lg font-medium">
            <Clock className="h-5 w-5" />
            Cancellazione in attesa
          </span>
        )}
      </div>
    </div>
  );
}
