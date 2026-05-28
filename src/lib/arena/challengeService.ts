/**
 * Arena challenge service — data enrichment and notification orchestration.
 * Extracted from /api/arena/challenges/route.ts to keep handlers focused on
 * HTTP concerns (auth, validation, request/response shaping).
 */

import { supabaseServer } from "@/lib/supabase/serverClient";

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function fetchEnrichedProfiles(userIds: string[]) {
  if (userIds.length === 0) return [];

  const [profilesResult, arenaStatsResult] = await Promise.all([
    supabaseServer
      .from("profiles")
      .select("id, full_name, avatar_url, email, phone")
      .in("id", userIds),
    supabaseServer
      .from("arena_stats")
      .select("user_id, ranking, points, level")
      .in("user_id", userIds),
  ]);

  const profiles = profilesResult.data || [];
  const arenaStats = arenaStatsResult.data || [];

  return profiles.map((profile) => {
    const stats = arenaStats.find((s) => s.user_id === profile.id);
    return {
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      email: profile.email,
      phone: profile.phone,
      arena_rank: stats?.level || null,
      arena_points: stats?.points || null,
    };
  });
}

// ─── Challenge enrichment ─────────────────────────────────────────────────────

/**
 * Fetch a single challenge by ID, enriched with player profiles, arena stats, and booking.
 * Returns null if not found. Throws on DB errors.
 */
export async function fetchEnrichedChallenge(challengeId: string) {
  const { data: challenge, error } = await supabaseServer
    .from("arena_challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (error) throw error;
  if (!challenge) return null;

  const userIds = [
    challenge.challenger_id,
    challenge.opponent_id,
    challenge.my_partner_id,
    challenge.opponent_partner_id,
  ].filter(Boolean) as string[];

  const enrichedProfiles = await fetchEnrichedProfiles(userIds);

  let booking = null;
  if (challenge.booking_id) {
    const { data: bookingData } = await supabaseServer
      .from("bookings")
      .select("id, court, start_time, end_time, status")
      .eq("id", challenge.booking_id)
      .single();
    booking = bookingData;
  }

  return {
    ...challenge,
    challenger: enrichedProfiles.find((p) => p.id === challenge.challenger_id),
    opponent: enrichedProfiles.find((p) => p.id === challenge.opponent_id),
    my_partner: enrichedProfiles.find((p) => p.id === challenge.my_partner_id),
    opponent_partner: enrichedProfiles.find((p) => p.id === challenge.opponent_partner_id),
    booking,
  };
}

/**
 * Fetch the challenge list for a user (or all), enriched with profiles and bookings.
 * Also runs two side-effect transitions: auto-cancel expired pending challenges,
 * and auto-transition accepted challenges past their booking time to awaiting_score.
 * Returns the enriched list (never throws — errors surface through console.error).
 */
export async function fetchEnrichedChallenges(
  userId?: string | null,
  status?: string | null,
) {
  let query = supabaseServer
    .from("arena_challenges")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) query = query.or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;

  const challenges = data || [];
  if (challenges.length === 0) return [];

  const userIds = [
    ...new Set(
      [...challenges.map((c) => c.challenger_id), ...challenges.map((c) => c.opponent_id)].filter(
        Boolean,
      ),
    ),
  ] as string[];

  const bookingIds = challenges.map((c) => c.booking_id).filter(Boolean) as string[];

  const [enrichedProfiles, bookingsResult] = await Promise.all([
    fetchEnrichedProfiles(userIds),
    bookingIds.length > 0
      ? supabaseServer
          .from("bookings")
          .select("id, court, start_time, end_time, status")
          .in("id", bookingIds)
      : Promise.resolve({ data: [] as { id: string; court: string; start_time: string; end_time: string; status: string }[], error: null }),
  ]);

  const bookings = bookingsResult.data || [];

  const enriched = challenges.map((challenge) => ({
    ...challenge,
    challenger: enrichedProfiles.find((p) => p.id === challenge.challenger_id),
    opponent: enrichedProfiles.find((p) => p.id === challenge.opponent_id),
    booking: bookings.find((b) => b.id === challenge.booking_id),
  }));

  const now = new Date();

  // Auto-cancel pending challenges whose scheduled date has passed
  const toCancel = enriched.filter(
    (c) => c.status === "pending" && c.scheduled_date && new Date(c.scheduled_date) < now,
  );
  if (toCancel.length > 0) {
    try {
      const cancelIds = toCancel.map((c) => c.id);
      await supabaseServer
        .from("arena_challenges")
        .update({ status: "cancelled" })
        .in("id", cancelIds);
      const cancelSet = new Set(cancelIds);
      enriched.forEach((c) => {
        if (cancelSet.has(c.id)) c.status = "cancelled";
      });
    } catch (err) {
      console.error("Error auto-cancelling expired challenges:", err);
    }
  }

  // Auto-transition accepted challenges to awaiting_score when booking/date has passed
  const toAwaitScore = enriched.filter((c) => {
    if (c.status !== "accepted") return false;
    const refDate = c.booking?.start_time || c.scheduled_date;
    return refDate && new Date(refDate) < now;
  });
  if (toAwaitScore.length > 0) {
    try {
      const ids = toAwaitScore.map((c) => c.id);
      await supabaseServer
        .from("arena_challenges")
        .update({ status: "awaiting_score" })
        .in("id", ids);
      const awaitingSet = new Set(ids);
      enriched.forEach((c) => {
        if (awaitingSet.has(c.id)) c.status = "awaiting_score";
      });
    } catch (err) {
      console.error("❌ Error auto-transitioning to awaiting_score:", err);
    }
  }

  return enriched;
}

// ─── Notifications ────────────────────────────────────────────────────────────

interface NewChallengeNotifParams {
  challengeId: string;
  challengerId: string;
  opponentId: string;
  message?: string | null;
  court?: string | null;
  scheduledDate?: string | null;
  matchType?: string | null;
  challengeType?: string | null;
  bookingId?: string | null;
}

/**
 * Send a notification + internal message to the opponent when a new challenge is created.
 * Non-fatal: logs errors but never throws.
 */
export async function notifyOpponentOfNewChallenge({
  challengeId,
  challengerId,
  opponentId,
  message,
  court,
  scheduledDate,
  matchType,
  challengeType,
  bookingId,
}: NewChallengeNotifParams): Promise<void> {
  try {
    const [challengerResult, opponentResult] = await Promise.all([
      supabaseServer.from("profiles").select("full_name").eq("id", challengerId).single(),
      supabaseServer.from("profiles").select("role").eq("id", opponentId).single(),
    ]);

    const challenger = challengerResult.data;
    const opponent = opponentResult.data;

    const opponentDashboard = opponent?.role === "maestro" ? "maestro" : "atleta";
    const hasBookedCourt = Boolean(bookingId);
    const notificationType = hasBookedCourt ? "arena_challenge_booked" : "arena_challenge";
    const notificationTitle = hasBookedCourt
      ? "🎾 Sfida Arena con Campo Prenotato!"
      : "🏆 Nuova Sfida Arena!";

    const challengeTypeLabel = challengeType === "amichevole" ? "Amichevole" : "Ranked";
    const matchTypeLabel = matchType === "doppio" ? "Doppio" : "Singolo";

    const details: string[] = [];
    if (court) details.push(`Campo: ${court}`);
    if (scheduledDate) {
      const scheduled = new Date(scheduledDate);
      details.push(
        `Data: ${scheduled.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
      );
      details.push(
        `Ora: ${scheduled.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
      );
    }
    details.push(`Tipo: ${challengeTypeLabel}`);
    details.push(`Match: ${matchTypeLabel}`);

    const detailsSuffix = details.length > 0 ? ` (${details.join(" · ")})` : "";
    const challengerName = challenger?.full_name || "Un atleta";

    const notificationMessage = hasBookedCourt
      ? message
        ? `${challengerName} ti ha sfidato e ha gia prenotato il campo!${detailsSuffix} Messaggio: "${message}"`
        : `${challengerName} ti ha sfidato e ha gia prenotato il campo Arena!${detailsSuffix}`
      : message
        ? `${challengerName} ti ha sfidato!${detailsSuffix} Messaggio: "${message}"`
        : `${challengerName} ti ha sfidato in Arena!${detailsSuffix}`;

    await Promise.all([
      supabaseServer.from("notifications").insert([
        {
          user_id: opponentId,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          action_url: `/dashboard/${opponentDashboard}/arena/challenge/${challengeId}`,
          is_read: false,
        },
      ]),
      supabaseServer.from("internal_messages").insert([
        {
          sender_id: challengerId,
          recipient_id: opponentId,
          subject: notificationTitle,
          content: notificationMessage,
        },
      ]),
    ]);
  } catch (err) {
    console.error("Error creating notification:", err);
    // Non-fatal: challenge was already created successfully
  }
}

interface StatusChangeNotifParams {
  challengeId: string;
  data: any; // enriched challenge row returned by DB update
  status: string;
  previousStatus: string | null;
  winnerId?: string | null;
  score?: string | null;
  linkedBookingId?: string | null;
}

/**
 * Send notifications to affected players when a challenge status changes.
 * Non-fatal: logs errors but never throws.
 */
export async function notifyChallengeStatusChange({
  challengeId,
  data,
  status,
  previousStatus,
  winnerId,
  score,
  linkedBookingId,
}: StatusChangeNotifParams): Promise<void> {
  try {
    let notificationTitle = "";
    let notificationContent = "";
    let recipientIds: string[] = [];

    if (status === "accepted") {
      if (previousStatus === "counter_proposal") {
        notificationTitle = "✅ Modifiche Confermate!";
        notificationContent = `${data.challenger.full_name} ha confermato le tue modifiche alla sfida!`;
        recipientIds = [data.opponent_id];
      } else {
        notificationTitle = "✅ Sfida Accettata!";
        notificationContent = `${data.opponent.full_name} ha accettato la tua sfida!`;
        recipientIds = [data.challenger_id];
      }
    } else if (status === "declined") {
      if (previousStatus === "counter_proposal") {
        notificationTitle = "❌ Modifiche Rifiutate";
        notificationContent = `${data.challenger.full_name} ha rifiutato le tue modifiche alla sfida.`;
        recipientIds = [data.opponent_id];
      } else {
        notificationTitle = "❌ Sfida Rifiutata";
        notificationContent = `${data.opponent.full_name} ha rifiutato la tua sfida.`;
        recipientIds = [data.challenger_id];
      }
    } else if (status === "counter_proposal") {
      notificationTitle = "✏️ Sfida Modificata";
      notificationContent = `${data.opponent.full_name} ha proposto delle modifiche alla tua sfida. Rivedi i dettagli e conferma.`;
      recipientIds = [data.challenger_id];
    } else if (status === "completed") {
      const resolvedWinnerId = winnerId || data.winner_id;
      const loserId =
        resolvedWinnerId === data.challenger_id ? data.opponent_id : data.challenger_id;
      const winnerName =
        resolvedWinnerId === data.challenger_id
          ? data.challenger.full_name
          : data.opponent.full_name;
      notificationTitle = "🏁 Sfida Completata";
      notificationContent = `La sfida è terminata! Vincitore: ${winnerName}${score ? ` (${score})` : ""}`;
      recipientIds = [loserId];
    } else if (status === "cancelled") {
      notificationTitle = "🚫 Sfida Annullata";
      notificationContent = linkedBookingId
        ? "La sfida Arena è stata annullata e la prenotazione collegata è stata annullata."
        : "La sfida Arena è stata annullata.";
      recipientIds = [data.challenger_id, data.opponent_id];
    }

    if (!notificationContent || recipientIds.length === 0) return;

    const uniqueRecipientIds = Array.from(new Set(recipientIds));

    const { data: recipients } = await supabaseServer
      .from("profiles")
      .select("id, role")
      .in("id", uniqueRecipientIds);

    const recipientRoleMap = new Map(
      (recipients || []).map((r: any) => [r.id, r.role]),
    );

    await Promise.all([
      supabaseServer.from("notifications").insert(
        uniqueRecipientIds.map((recipientId) => ({
          user_id: recipientId,
          type: "arena_challenge",
          title: notificationTitle,
          message: notificationContent,
          action_url: `/dashboard/${
            recipientRoleMap.get(recipientId) === "maestro" ? "maestro" : "atleta"
          }/arena/challenge/${challengeId}`,
          is_read: false,
        })),
      ),
      supabaseServer.from("internal_messages").insert(
        uniqueRecipientIds.map((recipientId) => ({
          sender_id:
            data.challenger_id === recipientId ? data.opponent_id : data.challenger_id,
          recipient_id: recipientId,
          subject: "📢 Aggiornamento Sfida Arena",
          content: notificationContent,
        })),
      ),
    ]);
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}
