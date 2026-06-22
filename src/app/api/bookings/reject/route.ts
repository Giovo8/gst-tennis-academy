import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { verifyAuth, isAdminOrGestore } from "@/lib/auth/verifyAuth";
import { sanitizeUuid } from "@/lib/security/sanitize-server";
import { HTTP_STATUS, ERROR_MESSAGES, BOOKING_STATUS } from "@/lib/constants/app";
import logger from "@/lib/logger/secure-logger";

/**
 * POST /api/bookings/reject?id=<bookingId>
 *
 * Rejects a pending private-lesson booking.
 * Allowed: admin, gestore, or the maestro assigned to that booking.
 *
 * Flow:
 *  1. Auth + permission check.
 *  2. Verify booking is in `pending` state.
 *  3. Update status → `rejected`.
 *  4. Notify the athlete.
 */
export async function POST(req: Request) {
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

    const authResult = await verifyAuth(req);
    if (!authResult.success) return authResult.response;
    const { user, profile } = authResult.data;

    // Fetch booking
    const { data: booking, error: fetchError } = await supabaseServer
      .from("bookings")
      .select("id, user_id, coach_id, court, type, status, start_time, end_time")
      .eq("id", id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Only admin, gestore, or the assigned coach may reject
    const isPrivileged = isAdminOrGestore(profile?.role);
    const isAssignedCoach = profile?.role === "maestro" && booking.coach_id === user.id;
    if (!isPrivileged && !isAssignedCoach) {
      logger.security("Unauthorized reject attempt", { userId: user.id, bookingId: id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Booking must be pending
    if (booking.status !== BOOKING_STATUS.PENDING) {
      return NextResponse.json(
        { error: "Solo le prenotazioni in attesa possono essere rifiutate." },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // ── Reject the booking ───────────────────────────────────────────────────
    const { error: updateError } = await supabaseServer
      .from("bookings")
      .update({ status: BOOKING_STATUS.REJECTED })
      .eq("id", id);

    if (updateError) {
      logger.error("Failed to reject booking", updateError, { bookingId: id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Notify athlete
    const startDateLabel = new Date(booking.start_time).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Rome",
    });
    const startTimeStr = new Date(booking.start_time).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    });

    const { error: notifError } = await supabaseServer.from("notifications").insert({
      user_id: booking.user_id,
      type: "booking",
      title: "Lezione privata non confermata",
      message: `La tua richiesta di lezione privata sul ${booking.court} del ${startDateLabel} alle ${startTimeStr} non è stata accettata.`,
      link: `/dashboard/atleta/bookings/${booking.id}`,
      is_read: false,
    });

    if (notifError) {
      logger.warn("Failed to create reject notification for athlete", {
        bookingId: id,
        userId: booking.user_id,
        error: notifError.message,
      });
    }

    const duration = Date.now() - startTime;
    logger.info("Booking rejected", { bookingId: id, rejectedBy: user.id });
    logger.apiResponse("POST", "/api/bookings/reject", HTTP_STATUS.OK, duration);

    return NextResponse.json({ success: true });
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error("Exception in bookings/reject POST", err);
    logger.apiResponse("POST", "/api/bookings/reject", HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
