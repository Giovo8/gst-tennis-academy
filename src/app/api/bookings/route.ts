import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { verifyAuth, isAdminOrGestore } from "@/lib/auth/verifyAuth";
import { createBookingSchema, updateBookingSchema } from "@/lib/validation/schemas";
import { sanitizeObject, sanitizePhone, sanitizeUuid } from "@/lib/security/sanitize-server";
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from "@/lib/security/rate-limiter";
import { shouldNotifyAdminsForUserBookingDeletion } from "@/lib/bookings/bookingDeletionNotifications";
import { BOOKING_DELETE_SNAPSHOT_FIELDS } from "@/lib/bookings/bookingDeletionEmail";
import logger from "@/lib/logger/secure-logger";
import { HTTP_STATUS, ERROR_MESSAGES, BOOKING_STATUS } from "@/lib/constants/app";
import { normalizeBookingMutation } from "@/lib/bookings/normalizeBookingMutation";
import { validateRestrictedBookingHours, parseItalyLocalToUTC } from "@/lib/bookings/bookingTimeRestrictions";
import {
  handleBookingCreatedSideEffects,
  handleBookingDeletedSideEffects,
} from "@/lib/bookings/bookingService";

export async function GET(req: Request) {
  const startTime = Date.now();

  const authResult = await verifyAuth(req);
  if (!authResult.success) {
    return authResult.response;
  }
  if (!isAdminOrGestore(authResult.data.profile?.role)) {
    return NextResponse.json({ error: ERROR_MESSAGES.FORBIDDEN ?? "Permessi insufficienti" }, { status: 403 });
  }

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
    const rateLimit = await applyRateLimit(clientId, RATE_LIMITS.API_WRITE);
    
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

    // Restrizione oraria per atleti e maestri (admin e gestore non hanno limiti)
    if (profile?.role === 'atleta' || profile?.role === 'maestro') {
      const timeError = validateRestrictedBookingHours(start_time, end_time);
      if (timeError) {
        logger.warn('Booking outside allowed hours', {
          userId: user.id,
          role: profile.role,
          start_time,
          end_time,
        });
        return NextResponse.json(
          { error: timeError },
          { status: HTTP_STATUS.FORBIDDEN }
        );
      }
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

    // Check for court blocks overlapping the requested slot
    const { data: blockConflicts, error: blockConflictError } = await supabaseServer
      .from("court_blocks")
      .select("id")
      .eq("court_id", court)
      .eq("is_disabled", false)
      .lt("start_time", end_time)
      .gt("end_time", start_time);

    if (blockConflictError) {
      logger.error('Error checking court blocks', blockConflictError, {
        userId: user.id,
        court,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    if ((blockConflicts || []).length > 0) {
      logger.warn('Booking blocked by court block', {
        userId: user.id,
        court,
        requestedTime: start_time,
      });
      return NextResponse.json(
        {
          error: "Il campo non è disponibile in questo orario.",
          conflict: true,
        },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // Check for course conflicts overlapping the requested slot
    const bookingStart = new Date(start_time);
    const bookingEnd = new Date(end_time);
    const dateStr = start_time.split("T")[0];
    const DAY_NAMES_COURSE = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const dayName = DAY_NAMES_COURSE[bookingStart.getDay()];

    const { data: courseData, error: courseError } = await supabaseServer
      .from("courses")
      .select("id, schedule_time, schedule_days, schedule_periods, cancelled_dates, start_date, end_date")
      .eq("is_active", true)
      .eq("court_name", court)
      .contains("schedule_days", [dayName]);

    if (courseError) {
      logger.error('Error checking course conflicts', courseError, { userId: user.id, court });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    const hasCourseConflict = (courseData ?? []).some((c) => {
      if (c.start_date && new Date(c.start_date) > bookingStart) return false;
      if (c.end_date && new Date(c.end_date) < bookingStart) return false;
      if (c.cancelled_dates && (c.cancelled_dates as string[]).includes(dateStr)) return false;

      let timeStr: string | null = c.schedule_time ?? null;
      if (c.schedule_periods && (c.schedule_periods as { days: string[]; time: string | null }[]).length > 0) {
        const mp = (c.schedule_periods as { days: string[]; time: string | null }[]).find((p) => p.days.includes(dayName));
        timeStr = mp?.time ?? null;
      }
      if (!timeStr) return false;

      const m = timeStr.match(/(\d{1,2}):(\d{2})\s*[\u2013\-]\s*(\d{1,2}):(\d{2})/);
      if (!m) return false;

      const courseStart = parseItalyLocalToUTC(dateStr, parseInt(m[1], 10), parseInt(m[2], 10));
      const courseEnd = parseItalyLocalToUTC(dateStr, parseInt(m[3], 10), parseInt(m[4], 10));
      return courseStart < bookingEnd && courseEnd > bookingStart;
    });

    if (hasCourseConflict) {
      logger.warn('Booking blocked by scheduled course', {
        userId: user.id,
        court,
        requestedTime: start_time,
      });
      return NextResponse.json(
        {
          error: "Il campo non è disponibile in questo orario (corso programmato).",
          conflict: true,
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
          created_by: user.id,
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
      // Handle race condition: DB constraint violation means slot was taken concurrently
      const isOverlapConstraint =
        error.message?.includes('bookings_no_overlap') ||
        error.code === '23P01';
      if (isOverlapConstraint) {
        logger.warn('Booking overlap constraint violation (race condition)', {
          userId: user.id,
          court,
          start_time,
        });
        return NextResponse.json(
          { error: "Slot già prenotato. Seleziona un altro orario.", conflict: true },
          { status: HTTP_STATUS.CONFLICT }
        );
      }
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

    // Trigger notifications, emails, and activity log
    if (data && data[0]) {
      await handleBookingCreatedSideEffects({
        booking: data[0],
        user,
        profile,
        participants,
        userId: user_id,
        ipAddress: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent"),
        participantsInserted,
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

    // Check for overlapping bookings if court/time is being changed
    const newCourt = (sanitized.court as string | undefined) || booking.court;
    const newStartTime = (sanitized.start_time as string | undefined) || booking.start_time;
    const newEndTime = (sanitized.end_time as string | undefined) || booking.end_time;

    const { data: conflicts, error: conflictError } = await supabaseServer
      .from("bookings")
      .select("id")
      .eq("court", newCourt)
      .neq("id", id)
      .neq("status", BOOKING_STATUS.CANCELLED)
      .neq("status", BOOKING_STATUS.REJECTED)
      .or(`and(start_time.lt.${newEndTime},end_time.gt.${newStartTime})`);

    if (conflictError) {
      logger.error('Error checking booking conflicts on update', conflictError, {
        userId: user.id,
        bookingId: id,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    if ((conflicts || []).length > 0) {
      logger.warn('Booking conflict detected on update', {
        userId: user.id,
        bookingId: id,
        court: newCourt,
        requestedTime: newStartTime,
      });
      return NextResponse.json(
        {
          error: "Slot già prenotato. Seleziona un altro orario.",
          conflict: true,
        },
        { status: HTTP_STATUS.CONFLICT }
      );
    }
    
    const normalizedUpdate = normalizeBookingMutation(sanitized);

    const { data, error } = await supabaseServer
      .from("bookings")
      .update(normalizedUpdate)
      .eq("id", id)
      .select();
    
    if (error) {
      const isOverlapConstraint =
        error.message?.includes('bookings_no_overlap') ||
        error.code === '23P01';
      if (isOverlapConstraint) {
        logger.warn('Booking overlap constraint violation on update (race condition)', {
          userId: user.id,
          bookingId: id,
          court: newCourt,
        });
        return NextResponse.json(
          { error: "Slot già prenotato. Seleziona un altro orario.", conflict: true },
          { status: HTTP_STATUS.CONFLICT }
        );
      }
      logger.error('Failed to update booking', error, { userId: user.id, bookingId: id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    if (shouldNotifyAthlete) {
      const actorDisplayName = profile?.full_name || user.email || "Lo staff";
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

      const bookingTypeForPut = updatedBooking?.type || booking.type;
      const { error: notificationError } = await supabaseServer
        .from("notifications")
        .insert({
          user_id: booking.user_id,
          type: "booking",
          title: bookingTypeForPut === "lezione_privata" ? "Lezione privata modificata" : "Prenotazione campo modificata",
          message: `La tua prenotazione ${bookingCourt} del ${dateLabel} alle ${timeLabel} è stata modificata da ${actorDisplayName}.`,

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

    // Trigger deletion email, athlete notification, and admin notification
    await handleBookingDeletedSideEffects({
      booking,
      bookingId: id,
      user,
      profile,
      bookingParticipants: bookingParticipants || [],
      bookingOwnerFullName,
      bookingOwnerEmail,
      bookingOwnerRole,
      shouldNotifyAthlete,
      shouldNotifyAdmins,
      deletedByOwner,
    });

    logger.info('Booking deleted', { userId: user.id, bookingId: id });
    const duration = Date.now() - startTime;
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
