import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { verifyAuth, isAdminOrGestore } from "@/lib/auth/verifyAuth";
import { sanitizeObject, sanitizeUuid, sanitizeText } from "@/lib/security/sanitize-server";
import logger from "@/lib/logger/secure-logger";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/lib/constants/app";

export async function GET(req: Request) {
  const startTime = Date.now();
  
  try {
    const url = new URL(req.url);
    const bookingId = url.searchParams.get("booking_id");

    if (!bookingId || !sanitizeUuid(bookingId)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Verify user has access to this booking
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;

    // Check booking ownership
    const { data: booking } = await supabaseServer
      .from("bookings")
      .select("user_id")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const hasAccess = booking.user_id === user.id || isAdminOrGestore(profile?.role);
    if (!hasAccess) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Fetch participants
    const { data, error } = await supabaseServer
      .from("booking_participants")
      .select("*")
      .eq("booking_id", bookingId)
      .order("order_index", { ascending: true });

    if (error) {
      logger.error('Error fetching booking participants', error);
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/bookings/participants', HTTP_STATUS.OK, duration);
    return NextResponse.json({ participants: data || [] });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    logger.error('Exception in GET participants', err);
    logger.apiResponse('GET', '/api/bookings/participants', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;

    const rawBody = await req.json();
    const sanitized = sanitizeObject(rawBody);
    
    const { booking_id, full_name, email, user_id } = sanitized;

    if (!booking_id || !sanitizeUuid(booking_id)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return NextResponse.json(
        { error: "Nome partecipante non valido" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Check booking ownership
    const { data: booking } = await supabaseServer
      .from("bookings")
      .select("user_id")
      .eq("id", booking_id)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const canEdit = booking.user_id === user.id || isAdminOrGestore(profile?.role);
    if (!canEdit) {
      logger.security('Unauthorized participant add attempt', {
        userId: user.id,
        bookingId: booking_id,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Check current participant count
    const { data: participants, error: countError } = await supabaseServer
      .from("booking_participants")
      .select("order_index")
      .eq("booking_id", booking_id)
      .order("order_index", { ascending: false })
      .limit(1);

    if (countError) {
      logger.error('Error checking participant count', countError);
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    const currentCount = participants?.length || 0;
    if (currentCount >= 4) {
      return NextResponse.json(
        { error: "Massimo 4 partecipanti per prenotazione" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const nextIndex = currentCount;
    const isRegistered = user_id ? true : false;

    const { data, error } = await supabaseServer
      .from("booking_participants")
      .insert([
        {
          booking_id,
          user_id: user_id || null,
          full_name: sanitizeText(full_name),
          email: email || null,
          is_registered: isRegistered,
          participant_type: 'atleta',
          order_index: nextIndex,
        },
      ])
      .select();

    if (error) {
      logger.error('Failed to add participant', error);
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    const duration = Date.now() - startTime;
    logger.info('Participant added', { bookingId: booking_id, userId: user.id });
    logger.apiResponse('POST', '/api/bookings/participants', HTTP_STATUS.CREATED, duration);
    
    return NextResponse.json({ participant: data?.[0] ?? null }, { status: HTTP_STATUS.CREATED });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    logger.error('Exception in POST participant', err);
    logger.apiResponse('POST', '/api/bookings/participants', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
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
    const bookingId = url.searchParams.get("booking_id");

    if (!id || !sanitizeUuid(id) || !bookingId || !sanitizeUuid(bookingId)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_INPUT },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;

    // Check booking ownership
    const { data: booking } = await supabaseServer
      .from("bookings")
      .select("user_id")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const canEdit = booking.user_id === user.id || isAdminOrGestore(profile?.role);
    if (!canEdit) {
      logger.security('Unauthorized participant delete attempt', {
        userId: user.id,
        bookingId,
      });
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Delete participant
    const { error } = await supabaseServer
      .from("booking_participants")
      .delete()
      .eq("id", id)
      .eq("booking_id", bookingId);

    if (error) {
      logger.error('Failed to delete participant', error);
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    const duration = Date.now() - startTime;
    logger.info('Participant deleted', { bookingId, participantId: id });
    logger.apiResponse('DELETE', '/api/bookings/participants', HTTP_STATUS.OK, duration);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    logger.error('Exception in DELETE participant', err);
    logger.apiResponse('DELETE', '/api/bookings/participants', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
