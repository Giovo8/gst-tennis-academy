/**
 * Booking side-effect orchestration — email, push notifications, activity log.
 * Extracted from /api/bookings/route.ts to keep handlers focused on auth/validation/DB.
 *
 * These functions are fire-and-forget from the handler's perspective:
 * they never affect the HTTP response, only trigger async side effects.
 */

import { supabaseServer } from "@/lib/supabase/serverClient";
import { notifyAdmins } from "@/lib/notifications/notifyAdmins";
import { logActivityServer } from "@/lib/activity/logActivity";
import {
  sendBookingCreatedEmailToGestore,
  sendBookingCreatedEmailToAthlete,
  sendBookingCreatedEmailToMaestro,
  sendBookingDeletedEmailToRecipients,
} from "@/lib/email/booking-notifications";
import { buildAdminsNotificationForUserBookingDeletion } from "@/lib/bookings/bookingDeletionNotifications";
import {
  buildCoachNotificationForPrivateLesson,
  shouldNotifyCoachForPrivateLesson,
} from "@/lib/bookings/privateLessonNotifications";
import { getBookingDeletionMode } from "@/lib/bookings/bookingDeletionEmail";
import { resolveBookingEmailAthleteContext } from "@/lib/bookings/bookingEmailAthleteContext";
import { getAdminBookingNotificationLink } from "@/lib/notifications/links";
import logger from "@/lib/logger/secure-logger";

// ─── Shared types ────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  email?: string | null;
}

interface AuthProfile {
  role?: string | null;
  full_name?: string | null;
}

interface BookingParticipantInput {
  user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
}

interface BookingParticipantRow {
  user_id?: string | null;
  full_name: string | null;
  email: string | null;
  is_registered?: boolean;
  order_index?: number;
}

// ─── POST side effects ────────────────────────────────────────────────────────

/**
 * After a booking is inserted into DB, send notifications, emails, and log activity.
 * Mirrors the exact logic previously inline in the POST handler.
 */
export async function handleBookingCreatedSideEffects({
  booking,
  user,
  profile,
  participants,
  userId,
  ipAddress,
  userAgent,
  participantsInserted,
}: {
  booking: any;
  user: AuthUser;
  profile: AuthProfile | null;
  participants?: BookingParticipantInput[];
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  participantsInserted: number;
}): Promise<void> {
  const startDate = new Date(booking.start_time).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
  const startTimeLabel = new Date(booking.start_time).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });

  // Fetch user profile for notification and email building
  const { data: userProfile } = await supabaseServer
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", userId)
    .single();

  const athleteContextForNotifications = resolveBookingEmailAthleteContext({
    owner: userProfile,
    participants,
    fallbackName: userProfile?.full_name || profile?.full_name || user.email || "Un utente",
  });

  const normalizeName = (value: string | null | undefined): string =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  const athleteNames = Array.from(
    new Set(
      [
        athleteContextForNotifications.athleteName,
        ...athleteContextForNotifications.additionalAthleteNames,
      ]
        .map((name) => name?.trim())
        .filter((name): name is string => Boolean(name))
    )
  );
  const athleteNamesLabel = athleteNames.join(", ") || athleteContextForNotifications.athleteName;
  const actorDisplayName = profile?.full_name || user.email || "Uno staff";
  const actorRole = String(profile?.role || "").toLowerCase();
  const actorIsStaff = actorRole === "admin" || actorRole === "gestore" || actorRole === "maestro";
  const actorMatchesSingleAthlete =
    athleteNames.length === 1 &&
    normalizeName(athleteNames[0]) === normalizeName(actorDisplayName);
  const shouldMentionActorExplicitly = actorIsStaff && !actorMatchesSingleAthlete;

  // Push notification to coach for private lessons
  if (shouldNotifyCoachForPrivateLesson({ bookingType: booking.type, coachId: booking.coach_id })) {
    const coachNotification = buildCoachNotificationForPrivateLesson({
      athleteName: athleteContextForNotifications.athleteName,
      court: booking.court,
      startTime: booking.start_time,
    });

    const { error: coachNotificationError } = await supabaseServer
      .from("notifications")
      .insert({
        user_id: booking.coach_id,
        ...coachNotification,
        is_read: false,
      });

    if (coachNotificationError) {
      logger.warn("Failed to create coach private lesson notification", {
        bookingId: booking.id,
        coachId: booking.coach_id,
        error: coachNotificationError.message,
      });
    }
  }

  // Fetch coach display name for admin notification message
  let coachDisplayName: string | null = null;
  if (booking.type === "lezione_privata" && booking.coach_id) {
    const { data: coachProfileForNotif } = await supabaseServer
      .from("profiles")
      .select("full_name")
      .eq("id", booking.coach_id)
      .single();
    coachDisplayName = coachProfileForNotif?.full_name ?? null;
  }

  const buildAdminNotifMessage = (): string => {
    const coachSuffix = coachDisplayName ? ` · Maestro: ${coachDisplayName}` : "";
    if (shouldMentionActorExplicitly) {
      return `${actorDisplayName} ha prenotato il ${booking.court} per ${athleteNamesLabel} il ${startDate} alle ${startTimeLabel}${booking.type === "lezione_privata" ? coachSuffix : ""}`;
    }
    return `${athleteNamesLabel} ha prenotato il ${booking.court} il ${startDate} alle ${startTimeLabel}${booking.type === "lezione_privata" ? coachSuffix : ""}`;
  };

  const notesText = (booking.notes || "").toLowerCase();
  const isArenaChallengeBooking = notesText.includes("sfida arena");

  // Notify admins/gestori via push
  await notifyAdmins({
    type: isArenaChallengeBooking ? "arena_challenge_booked" : "booking",
    title: isArenaChallengeBooking
      ? "Sfida Arena Creata"
      : booking.type === "lezione_privata"
        ? "Nuova lezione privata"
        : "Nuova prenotazione campo",
    message: isArenaChallengeBooking
      ? shouldMentionActorExplicitly
        ? `${actorDisplayName} ha creato una sfida Arena per ${athleteNamesLabel} sul ${booking.court} il ${startDate} alle ${startTimeLabel}`
        : `${athleteNamesLabel} ha creato una sfida Arena sul ${booking.court} il ${startDate} alle ${startTimeLabel}`
      : buildAdminNotifMessage(),
    link: isArenaChallengeBooking
      ? "/dashboard/admin/arena"
      : getAdminBookingNotificationLink(booking.id),
  });

  // ── Email logic ────────────────────────────────────────────────────────────

  if (profile?.role === "atleta") {
    // Athlete self-booking → email to gestore
    const athleteDisplayName = userProfile?.full_name || profile.full_name || "Un atleta";
    const bookingMode =
      booking.type === "campo"
        ? participants && participants.length > 2
          ? "doppio"
          : "singolo"
        : undefined;

    const participantUserIds: string[] = Array.from(
      new Set<string>(
        (participants || [])
          .map((p) => p.user_id)
          .filter((uid): uid is string => Boolean(uid))
      )
    );
    const participantEmailsFromPayload = (participants || [])
      .map((p) => p.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email && email.includes("@")));

    const participantEmailsFromProfilesById = new Map<string, string>();
    if (participantUserIds.length > 0) {
      const { data: participantProfiles, error: participantProfilesError } = await supabaseServer
        .from("profiles")
        .select("id, email")
        .in("id", participantUserIds);

      if (participantProfilesError) {
        logger.warn("Failed to resolve participant emails for booking email", {
          bookingId: booking.id,
          error: participantProfilesError.message,
        });
      } else {
        for (const pp of participantProfiles || []) {
          const normalizedEmail = pp.email?.trim().toLowerCase();
          if (!normalizedEmail || !normalizedEmail.includes("@")) continue;
          participantEmailsFromProfilesById.set(pp.id, normalizedEmail);
        }
      }
    }

    const athleteRecipientEmails = Array.from(
      new Set(
        [
          userProfile?.email?.trim().toLowerCase() || user.email?.trim().toLowerCase(),
          ...participantEmailsFromPayload,
          ...participantUserIds
            .map((uid) => participantEmailsFromProfilesById.get(uid))
            .filter((email): email is string => Boolean(email)),
        ].filter((email): email is string => Boolean(email && email.includes("@")))
      )
    );

    const normalizedAthleteName = athleteDisplayName.trim().toLowerCase();
    const additionalAthleteNames = Array.from(
      new Set(
        (participants || [])
          .map((p) => p.full_name?.trim())
          .filter((name): name is string => Boolean(name))
          .filter((name) => name.toLowerCase() !== normalizedAthleteName)
      )
    );

    let coachName: string | null = null;
    if (booking.type === "lezione_privata" && booking.coach_id) {
      const { data: coachProfile, error: coachProfileError } = await supabaseServer
        .from("profiles")
        .select("full_name")
        .eq("id", booking.coach_id)
        .single();

      if (coachProfileError) {
        logger.warn("Failed to resolve coach name for booking email", {
          bookingId: booking.id,
          coachId: booking.coach_id,
          error: coachProfileError.message,
        });
      } else {
        coachName = coachProfile?.full_name?.trim() || null;
      }
    }

    await sendBookingCreatedEmailToGestore({
      bookingId: booking.id,
      bookedByName: athleteDisplayName,
      athleteName: athleteDisplayName,
      athleteEmail: userProfile?.email || user.email || null,
      athleteRecipientEmails,
      additionalAthleteNames,
      coachId: booking.coach_id || null,
      coachName,
      court: booking.court,
      type: booking.type || "campo",
      bookingMode,
      startTime: booking.start_time,
      endTime: booking.end_time,
      notes: booking.notes || null,
    });
  } else {
    // Gestore/admin/maestro created booking → email to athlete (and maestro if private lesson)
    const athleteEmailContext = resolveBookingEmailAthleteContext({
      owner: userProfile,
      participants,
    });
    const bookingModeForEmail =
      booking.type === "campo"
        ? participants && participants.length > 2
          ? "doppio"
          : "singolo"
        : undefined;

    let coachNameForEmail: string | null = null;
    if (booking.type === "lezione_privata" && booking.coach_id) {
      const { data: coachProfileForEmail } = await supabaseServer
        .from("profiles")
        .select("full_name")
        .eq("id", booking.coach_id)
        .single();
      coachNameForEmail = coachProfileForEmail?.full_name?.trim() || null;
    }

    if (athleteEmailContext.athleteRecipientEmails.length > 0) {
      await sendBookingCreatedEmailToAthlete({
        bookingId: booking.id,
        bookedByName: actorDisplayName,
        athleteName: athleteEmailContext.athleteName,
        athleteEmail: athleteEmailContext.athleteEmail,
        athleteRecipientEmails: athleteEmailContext.athleteRecipientEmails,
        additionalAthleteNames: athleteEmailContext.additionalAthleteNames,
        coachId: booking.coach_id || null,
        coachName: coachNameForEmail,
        court: booking.court,
        type: booking.type || "campo",
        bookingMode: bookingModeForEmail,
        startTime: booking.start_time,
        endTime: booking.end_time,
        notes: booking.notes || null,
      });
    }

    if (booking.type === "lezione_privata" && booking.coach_id) {
      await sendBookingCreatedEmailToMaestro({
        bookingId: booking.id,
        bookedByName: actorDisplayName,
        athleteName: athleteEmailContext.athleteName,
        athleteEmail: athleteEmailContext.athleteEmail,
        coachId: booking.coach_id,
        coachName: coachNameForEmail,
        court: booking.court,
        type: booking.type,
        startTime: booking.start_time,
        endTime: booking.end_time,
        notes: booking.notes || null,
      });
    }
  }

  // Activity log
  await logActivityServer({
    userId,
    action: "booking.create",
    entityType: "booking",
    entityId: booking.id,
    ipAddress: ipAddress ?? undefined,
    userAgent: userAgent ?? undefined,
    metadata: {
      court: booking.court,
      type: booking.type,
      startTime: booking.start_time,
      endTime: booking.end_time,
      status: booking.status,
      participantsCount: participantsInserted,
    },
  });
}

// ─── DELETE side effects ──────────────────────────────────────────────────────

/**
 * After a booking is deleted from DB, send email to all recipients,
 * push notification to the athlete (if deleted by staff), and notify admins.
 * Mirrors the exact logic previously inline in the DELETE handler.
 */
export async function handleBookingDeletedSideEffects({
  booking,
  bookingId,
  user,
  profile,
  bookingParticipants,
  bookingOwnerFullName,
  bookingOwnerEmail,
  bookingOwnerRole,
  shouldNotifyAthlete,
  shouldNotifyAdmins,
  deletedByOwner,
}: {
  booking: any;
  bookingId: string;
  user: AuthUser;
  profile: AuthProfile | null;
  bookingParticipants: BookingParticipantRow[];
  bookingOwnerFullName: string | null;
  bookingOwnerEmail: string | null;
  bookingOwnerRole: string | null;
  shouldNotifyAthlete: boolean;
  shouldNotifyAdmins: boolean;
  deletedByOwner: boolean;
}): Promise<void> {
  const bookingOwnerDisplayName = bookingOwnerFullName || user.email || "Un utente";

  // Resolve participant emails (from payload + profile lookup for registered users)
  const participantUserIds: string[] = Array.from(
    new Set<string>(
      bookingParticipants
        .map((p) => p.user_id)
        .filter((uid): uid is string => Boolean(uid))
    )
  );
  const participantEmailsFromProfilesById = new Map<string, string>();

  if (participantUserIds.length > 0) {
    const { data: participantProfiles, error: participantProfilesError } = await supabaseServer
      .from("profiles")
      .select("id, email")
      .in("id", participantUserIds);

    if (participantProfilesError) {
      logger.warn("Failed to resolve participant emails before deletion email", {
        bookingId,
        error: participantProfilesError.message,
      });
    } else {
      for (const pp of participantProfiles || []) {
        const normalizedEmail = pp.email?.trim().toLowerCase();
        if (!normalizedEmail || !normalizedEmail.includes("@")) continue;
        participantEmailsFromProfilesById.set(pp.id, normalizedEmail);
      }
    }
  }

  const participantsForDeletionEmail = bookingParticipants.map((p) => ({
    full_name: p.full_name || null,
    email:
      p.email ||
      (p.user_id ? participantEmailsFromProfilesById.get(p.user_id) || null : null),
  }));

  const athleteContextForDeletionEmail = resolveBookingEmailAthleteContext({
    owner: {
      full_name: bookingOwnerFullName,
      email: bookingOwnerEmail || (deletedByOwner ? user.email || null : null),
      role: bookingOwnerRole,
    },
    participants: participantsForDeletionEmail,
    fallbackName: bookingOwnerDisplayName,
  });

  // Fetch coach name if private lesson
  let coachName: string | null = null;
  if (booking.type === "lezione_privata" && booking.coach_id) {
    const { data: coachProfile, error: coachProfileError } = await supabaseServer
      .from("profiles")
      .select("full_name")
      .eq("id", booking.coach_id)
      .single();

    if (coachProfileError) {
      logger.warn("Failed to resolve coach name for booking deletion email", {
        bookingId,
        coachId: booking.coach_id,
        error: coachProfileError.message,
      });
    } else {
      coachName = coachProfile?.full_name?.trim() || null;
    }
  }

  const bookingMode = getBookingDeletionMode(booking.type, bookingParticipants.length);

  // Send deletion email to all recipients
  await sendBookingDeletedEmailToRecipients({
    bookingId,
    athleteName: athleteContextForDeletionEmail.athleteName,
    athleteEmail: athleteContextForDeletionEmail.athleteEmail,
    athleteRecipientEmails: athleteContextForDeletionEmail.athleteRecipientEmails,
    additionalAthleteNames: athleteContextForDeletionEmail.additionalAthleteNames,
    coachId: booking.coach_id || null,
    coachName,
    court: booking.court,
    type: booking.type || "campo",
    bookingMode,
    startTime: booking.start_time,
    endTime: booking.end_time || booking.start_time,
    notes: booking.notes || null,
    deletedByName: profile?.full_name || user.email || "Utente piattaforma",
    deletedByRole: profile?.role || "utente",
  });

  // Push notification to the athlete if deletion was by staff
  if (shouldNotifyAthlete) {
    const actorDisplayName = profile?.full_name || user.email || "Lo staff";
    const bookingDate = new Date(booking.start_time);
    const dateLabel = bookingDate.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeLabel = bookingDate.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const { error: notificationError } = await supabaseServer
      .from("notifications")
      .insert({
        user_id: booking.user_id,
        type: "booking",
        title:
          booking.type === "lezione_privata"
            ? "Lezione privata eliminata"
            : "Prenotazione campo eliminata",
        message: `La tua prenotazione ${booking.court} del ${dateLabel} alle ${timeLabel} è stata eliminata da ${actorDisplayName}.`,
        link: "/dashboard/atleta/bookings",
        is_read: false,
      });

    if (notificationError) {
      logger.warn("Failed to create booking deletion notification", {
        bookingId,
        recipientUserId: booking.user_id,
        error: notificationError.message,
      });
    }
  }

  // Notify admins if an athlete self-deleted
  if (shouldNotifyAdmins) {
    const notification = buildAdminsNotificationForUserBookingDeletion({
      userName: athleteContextForDeletionEmail.athleteName,
      court: booking.court,
      startTime: booking.start_time,
      bookingType: booking.type,
    });

    await notifyAdmins(notification);
  }
}
