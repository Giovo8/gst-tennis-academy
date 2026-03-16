import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { verifyAuth, isAdminOrGestore } from "@/lib/auth/verifyAuth";
import { notifyAdmins } from "@/lib/notifications/notifyAdmins";
import { logActivityServer } from "@/lib/activity/logActivity";
import {
  sendBookingCreatedEmailToGestore,
  sendBookingDeletedEmailToRecipients,
} from "@/lib/email/booking-notifications";
import { createBookingSchema, updateBookingSchema } from "@/lib/validation/schemas";
import { sanitizeObject, sanitizePhone, sanitizeUuid } from "@/lib/security/sanitize-server";
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from "@/lib/security/rate-limiter";
import {
  buildAdminsNotificationForUserBookingDeletion,
  shouldNotifyAdminsForUserBookingDeletion,
} from "@/lib/bookings/bookingDeletionNotifications";
import {
  buildCoachNotificationForPrivateLesson,
  shouldNotifyCoachForPrivateLesson,
} from "@/lib/bookings/privateLessonNotifications";
import {
  BOOKING_DELETE_SNAPSHOT_FIELDS,
  getBookingDeletionMode,
} from "@/lib/bookings/bookingDeletionEmail";
import { getAdminBookingNotificationLink } from "@/lib/notifications/links";
import logger from "@/lib/logger/secure-logger";
import { HTTP_STATUS, ERROR_MESSAGES, BOOKING_STATUS } from "@/lib/constants/app";
import { normalizeBookingMutation } from "@/lib/bookings/normalizeBookingMutation";

export async function GET(req: Request) {
  const startTime = Date.now();
  
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const user_id = url.searchParams.get("user_id");
    const coach_id = url.searchParams.get("coach_id");

    // Validate UUID if provided
    if (id && !sanitizeUuid(id)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (id) {
      const { data: booking, error: bookingError } = await supabaseServer
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();
      
      if (bookingError) {
        logger.error('Booking not found', bookingError, { bookingId: id });
        return NextResponse.json(
          { error: ERROR_MESSAGES.NOT_FOUND },
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }

      // Fetch participants
      const { data: participants } = await supabaseServer
        .from("booking_participants")
        .select("*")
        .eq("booking_id", id)
        .order("order_index", { ascending: true });

      const duration = Date.now() - startTime;
      logger.apiResponse('GET', '/api/bookings', HTTP_STATUS.OK, duration);
      return NextResponse.json({ 
        booking: {
          ...booking,
          participants: participants || []
        } 
      });
    }

    let query = supabaseServer
      .from("bookings")
      .select("*")
      .order("start_time", { ascending: true });
    
    if (user_id) query = query.eq("user_id", user_id);
    if (coach_id) query = query.eq("coach_id", coach_id);
    
    const { data: bookings, error } = await query;
    
    if (error) {
      logger.error('Database error fetching bookings', error);
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Fetch participants for all bookings
    const bookingIds = bookings?.map(b => b.id) || [];
    let allParticipants: any[] = [];

    if (bookingIds.length > 0) {
      const { data: participants } = await supabaseServer
        .from("booking_participants")
        .select("*")
        .in("booking_id", bookingIds);
      
      allParticipants = participants || [];
    }

    // Merge participants with bookings
    const bookingsWithParticipants = (bookings || []).map(booking => ({
      ...booking,
      participants: allParticipants.filter(p => p.booking_id === booking.id)
    }));
    
    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/bookings', HTTP_STATUS.OK, duration);
    return NextResponse.json({ bookings: bookingsWithParticipants });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    logger.error('Exception in bookings GET', err);
    logger.apiResponse('GET', '/api/bookings', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const clientId = getClientIdentifier(req);
    const rateLimit = applyRateLimit(clientId, RATE_LIMITS.API_WRITE);
    
    if (!rateLimit.allowed) {
      logger.security('Booking creation rate limit exceeded', { clientId });
      return NextResponse.json(
        { 
          error: ERROR_MESSAGES.RATE_LIMIT,
          retryAfter: rateLimit.reset,
        },
        { 
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          },
        }
      );
    }

    // Authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;
    
    // Parse and sanitize input
    const rawBody = await req.json();
    const sanitized = sanitizeObject(rawBody);

    // Validate with Zod
    const validationResult = createBookingSchema.safeParse(sanitized);
    
    if (!validationResult.success) {
      logger.warn('Booking validation failed', {
        userId: user.id,
        errors: validationResult.error.errors,
      });
      return NextResponse.json(
        {
          error: ERROR_MESSAGES.INVALID_INPUT,
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const bookingData = validationResult.data;
    const { user_id, coach_id, court, type, start_time, end_time, participants } = bookingData;

    // Authorization: users can only book for themselves, admin/gestore for anyone
    const canBookForOthers = isAdminOrGestore(profile?.role);
    if (user_id !== user.id && !canBookForOthers) {
      logger.security('Unauthorized booking attempt for other user', {
        userId: user.id,
        targetUserId: user_id,
      });
      return NextResponse.json(
        { error: "Non autorizzato a prenotare per altri utenti" },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Check for overlapping active bookings on the same court
    const { data: conflicts, error: conflictError } = await supabaseServer
      .from("bookings")
      .select("id, user_id, status, start_time, end_time")
      .eq("court", court)
      .neq("status", BOOKING_STATUS.CANCELLED)
      .neq("status", BOOKING_STATUS.REJECTED)
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`);

    if (conflictError) {
      logger.error('Error checking booking conflicts', conflictError, {
        userId: user.id,
        court,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    if ((conflicts || []).length > 0) {
      logger.warn('Booking conflict detected', {
        userId: user.id,
        court,
        requestedTime: start_time,
      });
      return NextResponse.json(
        { 
          error: "Slot già prenotato. Seleziona un altro orario.",
          conflict: true 
        },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    const normalizedBooking = normalizeBookingMutation(bookingData);

    const { data, error } = await supabaseServer
      .from("bookings")
      .insert([
        {
          user_id,
          coach_id: coach_id || null,
          court,
          type: type || "campo",
          start_time,
          end_time,
          status: normalizedBooking.status,
          coach_confirmed: normalizedBooking.coach_confirmed,
          manager_confirmed: normalizedBooking.manager_confirmed,
          notes: bookingData.notes || null,
        },
      ])
      .select();

    if (error) {
      logger.error('Failed to create booking', error, { userId: user.id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Insert booking participants if provided
    let participantsInserted = 0;
    if (data && data[0] && participants && participants.length > 0) {
      const bookingId = data[0].id;
      const participantsData = participants.map((p, index) => ({
        booking_id: bookingId,
        user_id: p.user_id || null,
        full_name: p.full_name,
        email: p.email || null,
        phone: p.phone ? sanitizePhone(p.phone) : null,
        is_registered: p.is_registered || false,
        participant_type: 'atleta',
        order_index: index,
      }));

      const { error: participantsError, data: insertedParticipants } = await supabaseServer
        .from("booking_participants")
        .insert(participantsData)
        .select();

      if (participantsError) {
        const missingPhoneColumn = participantsError.message?.toLowerCase().includes('phone');

        if (missingPhoneColumn) {
          const fallbackParticipantsData = participantsData.map(({ phone: _phone, ...participant }) => participant);
          const { error: fallbackError, data: fallbackInsertedParticipants } = await supabaseServer
            .from("booking_participants")
            .insert(fallbackParticipantsData)
            .select();

          if (fallbackError) {
            logger.warn('Failed to insert booking participants after phone fallback', {
              bookingId,
              error: fallbackError,
            });
          } else {
            participantsInserted = fallbackInsertedParticipants?.length || 0;
          }
        } else {
          logger.warn('Failed to insert booking participants', {
            bookingId,
            error: participantsError,
          });
        }
      } else {
        participantsInserted = insertedParticipants?.length || 0;
      }
    }

    // Notify admins/gestori about new booking
    if (data && data[0]) {
      const booking = data[0];
      const startDate = new Date(booking.start_time).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const startTimeLabel = new Date(booking.start_time).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Get user name for notification
      const { data: userProfile } = await supabaseServer
        .from("profiles")
        .select("full_name, email")
        .eq("id", user_id)
        .single();

      if (shouldNotifyCoachForPrivateLesson({ bookingType: booking.type, coachId: booking.coach_id })) {
        const coachNotification = buildCoachNotificationForPrivateLesson({
          athleteName: userProfile?.full_name || profile?.full_name || user.email || "Un utente",
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

      await notifyAdmins({
        type: "booking",
        title: "Nuova prenotazione",
        message: `${userProfile?.full_name || "Un utente"} ha prenotato il campo ${booking.court} per il ${startDate} alle ${startTimeLabel}`,
        link: getAdminBookingNotificationLink(booking.id),
      });

      // Send email only when an athlete creates the booking
      if (profile?.role === "atleta") {
        const athleteDisplayName = userProfile?.full_name || profile.full_name || "Un atleta";
        const bookingMode = booking.type === "campo"
          ? (participants && participants.length > 2 ? "doppio" : "singolo")
          : undefined;
        const participantUserIds: string[] = Array.from(
          new Set<string>(
            (participants || [])
              .map((participant) => participant.user_id)
              .filter((participantUserId): participantUserId is string => Boolean(participantUserId))
          )
        );
        const participantEmailsFromPayload = (participants || [])
          .map((participant) => participant.email?.trim().toLowerCase())
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
            for (const participantProfile of participantProfiles || []) {
              const normalizedEmail = participantProfile.email?.trim().toLowerCase();
              if (!normalizedEmail || !normalizedEmail.includes("@")) continue;
              participantEmailsFromProfilesById.set(participantProfile.id, normalizedEmail);
            }
          }
        }

        const athleteRecipientEmails = Array.from(
          new Set(
            [
              userProfile?.email?.trim().toLowerCase() || user.email?.trim().toLowerCase(),
              ...participantEmailsFromPayload,
              ...participantUserIds
                .map((participantUserId) => participantEmailsFromProfilesById.get(participantUserId))
                .filter((email): email is string => Boolean(email)),
            ].filter((email): email is string => Boolean(email && email.includes("@")))
          )
        );
        const normalizedAthleteName = athleteDisplayName.trim().toLowerCase();
        const additionalAthleteNames = Array.from(
          new Set(
            (participants || [])
              .map((participant) => participant.full_name?.trim())
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
      }

      // Log activity
      await logActivityServer({
        userId: user_id,
        action: "booking.create",
        entityType: "booking",
        entityId: booking.id,
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
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

    const duration = Date.now() - startTime;
    logger.info('Booking created successfully', {
      userId: user.id,
      bookingId: data[0].id,
      participantsCount: participantsInserted,
    });
    logger.apiResponse('POST', '/api/bookings', HTTP_STATUS.CREATED, duration);
    
    return NextResponse.json({ booking: data?.[0] ?? null }, { status: HTTP_STATUS.CREATED });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    logger.error('Exception in bookings POST', err);
    logger.apiResponse('POST', '/api/bookings', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function PUT(req: Request) {
  const startTime = Date.now();
  
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id || !sanitizeUuid(id)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
    
    // Authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;

    // Check if booking exists
    const { data: booking } = await supabaseServer
      .from("bookings")
      .select("user_id, coach_id, court, type, start_time, end_time, notes")
      .eq("id", id)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Authorization check
    const canEdit = isAdminOrGestore(profile?.role);
    if (!canEdit) {
      logger.security('Unauthorized booking update attempt', {
        userId: user.id,
        bookingId: id,
        role: profile?.role,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const updatedByManager = booking.user_id !== user.id;

    let shouldNotifyAthlete = false;
    if (updatedByManager) {
      const { data: ownerProfile, error: ownerProfileError } = await supabaseServer
        .from("profiles")
        .select("role")
        .eq("id", booking.user_id)
        .single();

      if (ownerProfileError) {
        logger.warn("Failed to resolve booking owner role before update", {
          bookingId: id,
          ownerId: booking.user_id,
          error: ownerProfileError.message,
        });
      }

      shouldNotifyAthlete = ownerProfile?.role === "atleta";
    }
    
    const rawBody = await req.json();
    const sanitized = sanitizeObject(rawBody);
    
    const normalizedUpdate = normalizeBookingMutation(sanitized);

    const { data, error } = await supabaseServer
      .from("bookings")
      .update(normalizedUpdate)
      .eq("id", id)
      .select();
    
    if (error) {
      logger.error('Failed to update booking', error, { userId: user.id, bookingId: id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    if (shouldNotifyAthlete) {
      const actorRoleLabel = profile?.role === "admin" ? "admin" : "gestore";
      const updatedBooking = data?.[0];
      const bookingCourt = updatedBooking?.court || booking.court || "campo";
      const bookingStartTime = updatedBooking?.start_time || booking.start_time;

      const bookingDate = new Date(bookingStartTime);
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
          title: "Prenotazione modificata",
          message: `La tua prenotazione ${bookingCourt} del ${dateLabel} alle ${timeLabel} è stata modificata da un ${actorRoleLabel}.`,
          link: "/dashboard/atleta/bookings",
          is_read: false,
        });

      if (notificationError) {
        logger.warn("Failed to create booking update notification", {
          bookingId: id,
          recipientUserId: booking.user_id,
          error: notificationError.message,
        });
      }
    }
    
    const duration = Date.now() - startTime;
    logger.apiResponse('PUT', '/api/bookings', HTTP_STATUS.OK, duration);
    return NextResponse.json({ booking: data?.[0] });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    logger.error('Exception in bookings PUT', err);
    logger.apiResponse('PUT', '/api/bookings', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function DELETE(req: Request) {
  const startTime = Date.now();
  
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id || !sanitizeUuid(id)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
    
    // Authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;

    // Check if booking exists
    const { data: booking } = await supabaseServer
      .from("bookings")
      .select(BOOKING_DELETE_SNAPSHOT_FIELDS)
      .eq("id", id)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Authorization check
    const canDelete = booking.user_id === user.id || isAdminOrGestore(profile?.role);
    if (!canDelete) {
      logger.security('Unauthorized booking deletion attempt', {
        userId: user.id,
        bookingId: id,
        role: profile?.role,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }
    
    const deletedByManager = isAdminOrGestore(profile?.role) && booking.user_id !== user.id;
    const deletedByOwner = booking.user_id === user.id;

    const { data: bookingParticipants, error: bookingParticipantsError } = await supabaseServer
      .from("booking_participants")
      .select("user_id, full_name, email, is_registered, order_index")
      .eq("booking_id", id)
      .order("order_index", { ascending: true });

    if (bookingParticipantsError) {
      logger.warn("Failed to fetch booking participants before deletion email", {
        bookingId: id,
        error: bookingParticipantsError.message,
      });
    }

    let shouldNotifyAthlete = false;
    let bookingOwnerRole: string | null = null;
    let bookingOwnerFullName: string | null = null;
    let bookingOwnerEmail: string | null = null;

    if (deletedByManager || deletedByOwner) {
      const { data: ownerProfile, error: ownerProfileError } = await supabaseServer
        .from("profiles")
        .select("role, full_name, email")
        .eq("id", booking.user_id)
        .single();

      if (ownerProfileError) {
        logger.warn("Failed to resolve booking owner role before deletion", {
          bookingId: id,
          ownerId: booking.user_id,
          error: ownerProfileError.message,
        });
      } else {
        bookingOwnerRole = ownerProfile?.role || null;
        bookingOwnerFullName = ownerProfile?.full_name || null;
        bookingOwnerEmail = ownerProfile?.email || null;
      }

      shouldNotifyAthlete = deletedByManager && ownerProfile?.role === "atleta";
    }

    const shouldNotifyAdmins = shouldNotifyAdminsForUserBookingDeletion({
      actorUserId: user.id,
      bookingOwnerId: booking.user_id,
      actorRole: profile?.role,
      ownerRole: bookingOwnerRole,
    });

    const { error } = await supabaseServer.from("bookings").delete().eq("id", id);
    
    if (error) {
      logger.error('Failed to delete booking', error, { userId: user.id, bookingId: id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    const bookingOwnerDisplayName = bookingOwnerFullName || user.email || "Un utente";
    const bookingOwnerNormalizedEmail = bookingOwnerEmail?.trim().toLowerCase();
    const participantUserIds: string[] = Array.from(
      new Set<string>(
        (bookingParticipants || [])
          .map((participant: { user_id?: string | null }) => participant.user_id)
          .filter((participantUserId): participantUserId is string => Boolean(participantUserId))
      )
    );
    const participantEmailsFromRows = (bookingParticipants || [])
      .map((participant) => participant.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email && email.includes("@")));
    const participantEmailsFromProfilesById = new Map<string, string>();

    if (participantUserIds.length > 0) {
      const { data: participantProfiles, error: participantProfilesError } = await supabaseServer
        .from("profiles")
        .select("id, email")
        .in("id", participantUserIds);

      if (participantProfilesError) {
        logger.warn("Failed to resolve participant emails before deletion email", {
          bookingId: id,
          error: participantProfilesError.message,
        });
      } else {
        for (const participantProfile of participantProfiles || []) {
          const normalizedEmail = participantProfile.email?.trim().toLowerCase();
          if (!normalizedEmail || !normalizedEmail.includes("@")) continue;
          participantEmailsFromProfilesById.set(participantProfile.id, normalizedEmail);
        }
      }
    }

    const athleteRecipientEmails = Array.from(
      new Set(
        [
          bookingOwnerNormalizedEmail || (deletedByOwner ? user.email?.trim().toLowerCase() : null),
          ...participantEmailsFromRows,
          ...participantUserIds
            .map((participantUserId) => participantEmailsFromProfilesById.get(participantUserId))
            .filter((email): email is string => Boolean(email)),
        ].filter((email): email is string => Boolean(email && email.includes("@")))
      )
    );

    const normalizedOwnerName = bookingOwnerDisplayName.trim().toLowerCase();
    const additionalAthleteNames: string[] = Array.from(
      new Set<string>(
        (bookingParticipants || [])
          .map((participant) => participant.full_name?.trim())
          .filter((name): name is string => Boolean(name))
          .filter((name) => name.toLowerCase() !== normalizedOwnerName)
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
        logger.warn("Failed to resolve coach name for booking deletion email", {
          bookingId: id,
          coachId: booking.coach_id,
          error: coachProfileError.message,
        });
      } else {
        coachName = coachProfile?.full_name?.trim() || null;
      }
    }

    const bookingMode = getBookingDeletionMode(booking.type, bookingParticipants?.length || 0);

    await sendBookingDeletedEmailToRecipients({
      bookingId: id,
      athleteName: bookingOwnerDisplayName,
      athleteEmail: bookingOwnerEmail || (deletedByOwner ? user.email : null),
      athleteRecipientEmails,
      additionalAthleteNames,
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
    
    if (shouldNotifyAthlete) {
      const actorRoleLabel = profile?.role === "admin" ? "admin" : "gestore";
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
          title: "Prenotazione eliminata",
          message: `La tua prenotazione ${booking.court} del ${dateLabel} alle ${timeLabel} è stata eliminata da un ${actorRoleLabel}.`,
          link: "/dashboard/atleta/bookings",
          is_read: false,
        });

      if (notificationError) {
        logger.warn("Failed to create booking deletion notification", {
          bookingId: id,
          recipientUserId: booking.user_id,
          error: notificationError.message,
        });
      }
    }

    if (shouldNotifyAdmins) {
      const notification = buildAdminsNotificationForUserBookingDeletion({
        userName: bookingOwnerFullName || profile?.full_name || user.email || "Un utente",
        court: booking.court,
        startTime: booking.start_time,
      });

      await notifyAdmins(notification);
    }

    const duration = Date.now() - startTime;
    logger.info('Booking deleted', { userId: user.id, bookingId: id });
    logger.apiResponse('DELETE', '/api/bookings', HTTP_STATUS.OK, duration);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    logger.error('Exception in bookings DELETE', err);
    logger.apiResponse('DELETE', '/api/bookings', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
