"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Calendar,
  CalendarClock,
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
  Target,
  Handshake,
  Mail,
  Phone,
  Save,
} from "lucide-react";

type Booking = {
  id: string;
  court: string;
  user_id: string;
  created_by?: string | null;
  coach_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  notes: string | null;
  created_at: string;
  user_profile?: { full_name: string; email: string; phone?: string } | null;
  coach_profile?: { full_name: string; email: string; phone?: string } | null;
  created_by_profile?: { full_name: string; email: string; phone?: string } | null;
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

type LinkedChallengeMeta = {
  id: string;
  status: string;
  opponent_id: string | null;
  opponent_partner_id: string | null;
};

export default function BookingDetailPage({ basePath = "/dashboard/admin" }: BookingDetailPageProps) {
  const router = useRouter();
  const params = useParams();
  const bookingId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [linkedChallenge, setLinkedChallenge] = useState<LinkedChallengeMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getPrimaryParticipant = (currentBooking: Booking | null) =>
    currentBooking?.participants?.find((participant) => participant.full_name?.trim().length > 0) || null;

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
          userId: participant.user_id || null,
        }))
      : [
          {
            fullName: currentBooking.user_profile?.full_name || "Nome non disponibile",
            email: currentBooking.user_profile?.email || null,
            phone: currentBooking.user_profile?.phone || null,
            isCoach: false,
            isGuest: false,
            userId: currentBooking.user_id || null,
          },
        ];

    if (currentBooking.type === "lezione_privata" && currentBooking.coach_profile) {
      athletes.push({
        fullName: currentBooking.coach_profile.full_name,
        email: currentBooking.coach_profile.email || null,
        phone: currentBooking.coach_profile.phone || null,
        isCoach: true,
        isGuest: false,
        userId: currentBooking.coach_id || null,
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
    if (!bookingId) {
      alert("ID prenotazione non valido");
      router.push(`${basePath}/bookings`);
      return;
    }

    try {
      const { data: bookingData, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();

      if (error) {
        console.error("Errore caricamento prenotazione:", error);
        alert("Errore nel caricamento della prenotazione");
        router.push(`${basePath}/bookings`);
        return;
      }

      if (!bookingData) {
        alert("Prenotazione non trovata");
        router.push(`${basePath}/bookings`);
        return;
      }

      let challengeParticipantIds: string[] = [];

      const { data: linkedChallenges } = await supabase
        .from("arena_challenges")
        .select("id, status, challenger_id, opponent_id, my_partner_id, opponent_partner_id")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1);

      const latestChallenge = linkedChallenges?.[0];
      setLinkedChallenge(
        latestChallenge
          ? {
              id: latestChallenge.id,
              status: latestChallenge.status,
              opponent_id: latestChallenge.opponent_id ?? null,
              opponent_partner_id: latestChallenge.opponent_partner_id ?? null,
            }
          : null
      );
      challengeParticipantIds = [
        latestChallenge?.challenger_id,
        latestChallenge?.my_partner_id,
        latestChallenge?.opponent_id,
        latestChallenge?.opponent_partner_id,
      ].filter((value): value is string => Boolean(value));

      // Carica i profili
      const userIds = [bookingData.user_id, bookingData.coach_id, bookingData.created_by, ...challengeParticipantIds]
        .filter((value): value is string => Boolean(value));
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

      type ProfileInfo = {
        id: string;
        full_name?: string | null;
        email?: string | null;
        phone?: string | null;
      };

      const profilesMap = new Map<string, ProfileInfo>(
        ((profilesData as ProfileInfo[] | null) || []).map((p) => [p.id, p]),
      );

      const arenaChallengeParticipants = challengeParticipantIds.map((userId, index) => {
        const profile = profilesMap.get(userId);
        return {
          id: `challenge-${userId}-${index}`,
          booking_id: bookingId,
          full_name: profile?.full_name || "Atleta",
          email: profile?.email || undefined,
          phone: profile?.phone || undefined,
          is_registered: true,
          user_id: userId,
          order_index: index,
        };
      });

      const resolvedParticipants =
        (participantsData?.length || 0) > 1
          ? participantsData
          : arenaChallengeParticipants.length > 1
            ? arenaChallengeParticipants
            : participantsData || [];

      const enrichedBooking = {
        ...bookingData,
        user_profile: profilesMap.get(bookingData.user_id) || null,
        coach_profile: bookingData.coach_id
          ? profilesMap.get(bookingData.coach_id) || null
          : null,
        created_by_profile: bookingData.created_by
          ? profilesMap.get(bookingData.created_by) || null
          : null,
        participants: resolvedParticipants,
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

  async function cancelBooking() {
    if (!booking) return;
    if (!confirm("Sei sicuro di voler annullare questa prenotazione?")) return;

    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id);

      if (error) {
        throw new Error(error.message || "Errore durante l'annullamento");
      }

      await loadBooking();
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
  const canCancel = !isCancelledStatus && !isPastBooking;
  const displayStatus = !isCancelledStatus && isPastBooking
    ? {
        label: "Passata",
        color: "bg-gray-100 text-gray-700",
        icon: Clock,
      }
    : status;
  const StatusIcon = displayStatus.icon;
  const bookingType = typeConfig[booking.type] || typeConfig.campo;
  const createdByName = booking.created_by_profile?.full_name
    || (!booking.created_by ? booking.user_profile?.full_name : null)
    || (booking.created_by === booking.user_id ? booking.user_profile?.full_name : null)
    || "Non disponibile";
  const isLesson = booking.type === "lezione_privata" || booking.type === "lezione_gruppo";
  const isArenaBooking =
    booking.type === "arena" ||
    booking.notes?.toLowerCase().includes("sfida arena") ||
    Boolean(linkedChallenge?.id);
  const isRankedArenaBooking = booking.notes?.toLowerCase().includes("ranked");
  const bookingHeaderLabel = isArenaBooking ? "Sfida Arena" : bookingType.label;
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
        icon: Users,
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
    } else if (isArenaBooking) {
      return {
        icon: isRankedArenaBooking ? Target : Handshake,
        borderColor: "border-frozen-lake-600",
        bgColor: "bg-frozen-lake-600",
        iconColor: "text-frozen-lake-600",
      };
    } else {
      return {
        icon: CalendarClock,
        borderColor: "border-secondary",
        bgColor: "bg-secondary",
        iconColor: "text-secondary",
      };
    }
  }

  const bookingStyle = getBookingStyle();
  const BookingIcon = bookingStyle.icon;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href={`${basePath}/bookings`} className="hover:text-secondary/80 transition-colors">Prenotazioni</Link>
          {" › "}
          <span>Dettagli Prenotazione</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Dettagli Prenotazione</h1>
      </div>

      {/* Header con info prenotazione */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{
          backgroundColor: (() => {
            if (booking.type === "lezione_privata" || booking.type === "lezione_gruppo") return "#023047";
            if (booking.type === "arena") return "var(--color-frozen-lake-600)";
            return "var(--secondary)";
          })(),
          borderColor: (() => {
            if (booking.type === "lezione_privata" || booking.type === "lezione_gruppo") return "#023047";
            if (booking.type === "arena") return "var(--color-frozen-lake-600)";
            return "var(--secondary)";
          })(),
          borderLeftColor: (() => {
            if (booking.type === "lezione_privata" || booking.type === "lezione_gruppo") return "#011a24";
            if (booking.type === "arena") return "var(--color-frozen-lake-900)";
            return "#023047";
          })(),
        }}
      >
        <div className="flex items-start gap-6">
          <BookingIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{bookingHeaderLabel}</h1>
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
              const isAwaitingAcceptance =
                linkedChallenge?.status === "pending" &&
                Boolean(participant.userId) &&
                (participant.userId === linkedChallenge.opponent_id ||
                  participant.userId === linkedChallenge.opponent_partner_id);

              const bg = isAwaitingAcceptance
                ? "#9ca3af"
                : participant.isCoach
                  ? "#023047"
                  : participant.isGuest
                    ? "#023b52"
                    : "var(--secondary)";
              return (
                <li key={`${participant.fullName}-${index}`}>
                  {participant.userId ? (
                    <Link href={`${basePath}/users/${participant.userId}`} className="block">
                      <div className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-90 transition-opacity" style={{ background: bg }}>
                        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-white leading-none">
                            {participant.fullName.trim().split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{participant.fullName}</p>
                          {(participant.email || participant.phone) && (
                            <p className="text-xs text-white/60 truncate mt-0.5">
                              {[participant.email, participant.phone].filter(Boolean).join(" ")}
                            </p>
                          )}
                        </div>
                        <span className="flex-shrink-0 text-xs font-bold text-white/50 uppercase tracking-wide">
                              {participant.isCoach ? "MAESTRO" : participant.isGuest ? "OSPITE" : "ATLETA"}
                        </span>
                      </div>
                    </Link>
                  ) : (
                  <div className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: bg }}>
                    <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-white leading-none">
                        {participant.fullName.trim().split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{participant.fullName}</p>
                      {(participant.email || participant.phone) && (
                        <p className="text-xs text-white/60 truncate mt-0.5">
                          {[participant.email, participant.phone].filter(Boolean).join(" ")}
                        </p>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold text-white/50 uppercase tracking-wide">
                          {participant.isCoach ? "MAESTRO" : participant.isGuest ? "OSPITE" : "ATLETA"}
                    </span>
                  </div>
                  )}
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
        <div className="px-6 py-6">
        
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

          {/* Stato */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Stato</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{displayStatus.label}</p>
            </div>
          </div>

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

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Creata da</label>
            <div className="flex-1">
              <p className="text-secondary/70">{createdByName}</p>
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
      {(!isPastBooking || (isArenaBooking && Boolean(linkedChallenge?.id))) && (
        <div className="flex flex-col sm:flex-row gap-3">
            {isArenaBooking && linkedChallenge?.id && (
              <Link
                href={`${basePath}/arena/challenge/${linkedChallenge.id}`}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#035f80] rounded-lg hover:bg-[#035f80]/90 transition-all font-medium"
              >
                Dettagli Sfida
              </Link>
            )}
            {!isPastBooking && booking.status !== "cancelled" && (
              <Link
                href={`${basePath}/bookings/modifica?id=${booking.id}`}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
              >
                Modifica
              </Link>
            )}

            {!isPastBooking && canCancel && (
              <button
                onClick={cancelBooking}
                disabled={actionLoading}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#023b52] rounded-lg hover:bg-[#023b52]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading && !deleting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : null}
                Annulla
              </button>
            )}

            {!isPastBooking && (
              <button
                onClick={deleteBooking}
                disabled={actionLoading}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading && deleting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : null}
                Elimina
              </button>
            )}
        </div>
      )}
    </div>
  );
}
