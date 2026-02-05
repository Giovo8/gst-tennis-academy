import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { verifyAuth, isAdminOrGestore } from "@/lib/auth/verifyAuth";
import { createNotification } from "@/lib/notifications/createNotification";
import { notifyAdmins } from "@/lib/notifications/notifyAdmins";
import { logActivityServer } from "@/lib/activity/logActivity";
import { createBookingSchema, updateBookingSchema } from "@/lib/validation/schemas";
import { sanitizeObject, sanitizeUuid } from "@/lib/security/sanitize-server";
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from "@/lib/security/rate-limiter";
import logger from "@/lib/logger/secure-logger";
import { HTTP_STATUS, ERROR_MESSAGES, TIME_CONSTANTS, BOOKING_STATUS } from "@/lib/constants/app";

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

    // Validate 24h advance (only for regular users)
    const bookingStartTime = new Date(start_time);
    const now = new Date();
    const advanceTime = new Date(now.getTime() + TIME_CONSTANTS.TWENTY_FOUR_HOURS_MS);
    
    // Admin and gestore can bypass 24h advance requirement
    if (bookingStartTime < advanceTime && !canBookForOthers) {
      return NextResponse.json(
        { error: "Le prenotazioni devono essere effettuate con almeno 24 ore di anticipo" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Check for overlapping confirmed bookings on the same court
    const { data: conflicts, error: conflictError } = await supabaseServer
      .from("bookings")
      .select("id, user_id, status, manager_confirmed, start_time, end_time")
      .eq("court", court)
      .neq("status", BOOKING_STATUS.CANCELLED)
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

    // Filter to only confirmed bookings (manager_confirmed = true)
    const confirmedConflicts = conflicts?.filter(b => b.manager_confirmed === true) || [];

    if (confirmedConflicts.length > 0) {
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

    // Determine status and confirmation flags
    const bookingStatus = bookingData.status || BOOKING_STATUS.PENDING;
    const coachConfirmed = bookingData.coach_confirmed ?? false;
    const managerConfirmed = bookingData.manager_confirmed ?? false;

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
          status: bookingStatus,
          coach_confirmed: coachConfirmed,
          manager_confirmed: managerConfirmed,
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
        is_registered: p.is_registered || false,
        participant_type: 'atleta',
        order_index: index,
      }));

      const { error: participantsError, data: insertedParticipants } = await supabaseServer
        .from("booking_participants")
        .insert(participantsData)
        .select();

      if (participantsError) {
        logger.warn('Failed to insert booking participants', {
          bookingId,
          error: participantsError,
        });
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
      const startTime = new Date(booking.start_time).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Get user name for notification
      const { data: userProfile } = await supabaseServer
        .from("profiles")
        .select("full_name")
        .eq("id", user_id)
        .single();

      await notifyAdmins({
        type: "booking",
        title: "Nuova prenotazione",
        message: `${userProfile?.full_name || "Un utente"} ha prenotato il campo ${booking.court} per il ${startDate} alle ${startTime}`,
        link: "/dashboard/admin/bookings",
      });

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
      .select("user_id")
      .eq("id", id)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Authorization check
    const canEdit = booking.user_id === user.id || isAdminOrGestore(profile?.role);
    if (!canEdit) {
      logger.security('Unauthorized booking update attempt', {
        userId: user.id,
        bookingId: id,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }
    
    const rawBody = await req.json();
    const sanitized = sanitizeObject(rawBody);
    
    const { data, error } = await supabaseServer
      .from("bookings")
      .update(sanitized)
      .eq("id", id)
      .select();
    
    if (error) {
      logger.error('Failed to update booking', error, { userId: user.id, bookingId: id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
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
      .select("user_id")
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
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }
    
    const { error } = await supabaseServer.from("bookings").delete().eq("id", id);
    
    if (error) {
      logger.error('Failed to delete booking', error, { userId: user.id, bookingId: id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
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
