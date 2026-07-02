import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { verifyAuth, isAdminOrGestore } from "@/lib/auth/verifyAuth";
import { sanitizeUuid } from "@/lib/security/sanitize-server";
import { parseItalyLocalToUTC } from "@/lib/bookings/bookingTimeRestrictions";
import { HTTP_STATUS, ERROR_MESSAGES, BOOKING_STATUS } from "@/lib/constants/app";
import logger from "@/lib/logger/secure-logger";

/**
 * POST /api/bookings/confirm?id=<bookingId>
 *
 * Confirms a pending private-lesson booking.
 * Allowed: admin, gestore, or the maestro assigned to that booking.
 *
 * Flow:
 *  1. Auth + permission check.
 *  2. Verify booking is in `pending` state.
 *  3. Re-run full conflict check (slot might have been taken while pending).
 *     → On conflict: return 409 { conflict: true } so the UI can redirect to edit.
 *  4. Update status → `confirmed`.
 *  5. Notify the athlete.
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
      .select("id, user_id, coach_id, court, type, status, start_time, end_time, notes")
      .eq("id", id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Only admin, gestore, or the assigned coach may confirm
    const isPrivileged = isAdminOrGestore(profile?.role);
    const isAssignedCoach = profile?.role === "maestro" && booking.coach_id === user.id;
    if (!isPrivileged && !isAssignedCoach) {
      logger.security("Unauthorized confirm attempt", { userId: user.id, bookingId: id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Booking must be pending
    if (booking.status !== BOOKING_STATUS.PENDING) {
      return NextResponse.json(
        { error: "Solo le prenotazioni in attesa possono essere confermate." },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // ── Conflict check (slot might have been taken while pending) ──────────
    const { data: conflicts, error: conflictError } = await supabaseServer
      .from("bookings")
      .select("id")
      .eq("court", booking.court)
      .neq("id", id)
      .neq("status", BOOKING_STATUS.CANCELLED)
      .neq("status", BOOKING_STATUS.REJECTED)
      .neq("status", BOOKING_STATUS.PENDING)
      .or(`and(start_time.lt.${booking.end_time},end_time.gt.${booking.start_time})`);

    if (conflictError) {
      logger.error("Error checking conflicts on confirm", conflictError, { bookingId: id });
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    if ((conflicts || []).length > 0) {
      logger.warn("Confirm blocked: slot taken since pending", { bookingId: id, court: booking.court });
      return NextResponse.json(
        {
          error:
            "Lo slot è stato occupato nel frattempo. Modifica data/ora/campo prima di confermare.",
          conflict: true,
        },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // Check court blocks
    const { data: blockConflicts } = await supabaseServer
      .from("court_blocks")
      .select("id")
      .eq("court_id", booking.court)
      .eq("is_disabled", false)
      .lt("start_time", booking.end_time)
      .gt("end_time", booking.start_time);

    if ((blockConflicts || []).length > 0) {
      return NextResponse.json(
        {
          error: "Il campo non è disponibile in questo orario. Modifica la prenotazione prima di confermare.",
          conflict: true,
        },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // Check course conflicts
    const dateStr = booking.start_time.split("T")[0];
    const DAY_NAMES = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const bookingStart = new Date(booking.start_time);
    const bookingEnd = new Date(booking.end_time);
    const dayName = DAY_NAMES[bookingStart.getDay()];

    const { data: courseData } = await supabaseServer
      .from("courses")
      .select(
        "id, court_name, schedule_time, schedule_days, schedule_periods, cancelled_dates, start_date, end_date, extra_dates, lesson_overrides, lesson_time_overrides"
      )
      .eq("is_active", true);

    const hasCourseConflict = (courseData ?? []).some((c) => {
      if (c.start_date && c.start_date > dateStr) return false;
      if (c.end_date && c.end_date < dateStr) return false;
      if (c.cancelled_dates && (c.cancelled_dates as string[]).includes(dateStr)) return false;
      const isExtra = c.extra_dates && (c.extra_dates as string[]).includes(dateStr);
      const isRegular = (c.schedule_days as string[]).includes(dayName);
      if (!isExtra && !isRegular) return false;

      let courseCourtForDay: string | null = c.court_name ?? null;
      let timeStr: string | null = c.schedule_time ?? null;
      if (c.lesson_overrides && (c.lesson_overrides as Record<string, string>)[dateStr]) {
        courseCourtForDay = (c.lesson_overrides as Record<string, string>)[dateStr];
      } else if ((c.schedule_periods as any[])?.length > 0) {
        const mp = (c.schedule_periods as any[]).find((p) => p.days.includes(dayName));
        if (mp?.court) courseCourtForDay = mp.court;
      }
      const normalizedCourseCourt = courseCourtForDay?.trim();
      // Courses without a resolved court for the day must not block court bookings.
      if (!normalizedCourseCourt) return false;
      if (normalizedCourseCourt !== booking.court) return false;
      if (c.lesson_time_overrides && (c.lesson_time_overrides as Record<string, string>)[dateStr]) {
        timeStr = (c.lesson_time_overrides as Record<string, string>)[dateStr];
      } else if ((c.schedule_periods as any[])?.length > 0) {
        const mp = (c.schedule_periods as any[]).find((p) => p.days.includes(dayName));
        if (mp) timeStr = mp.time ?? null;
      }
      if (!timeStr) return false;
      const m = timeStr.match(/(\d{1,2}):(\d{2})\s*[\u2013\-]\s*(\d{1,2}):(\d{2})/);
      if (!m) return false;
      const cStart = parseItalyLocalToUTC(dateStr, parseInt(m[1], 10), parseInt(m[2], 10));
      const cEnd = parseItalyLocalToUTC(dateStr, parseInt(m[3], 10), parseInt(m[4], 10));
      return cStart < bookingEnd && cEnd > bookingStart;
    });

    if (hasCourseConflict) {
      return NextResponse.json(
        {
          error: "Il campo non è disponibile (corso programmato). Modifica la prenotazione prima di confermare.",
          conflict: true,
        },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // ── Confirm the booking ──────────────────────────────────────────────────
    const { error: updateError } = await supabaseServer
      .from("bookings")
      .update({ status: BOOKING_STATUS.CONFIRMED })
      .eq("id", id);

    if (updateError) {
      logger.error("Failed to confirm booking", updateError, { bookingId: id });
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
      title: "Lezione privata confermata",
      message: `La tua lezione privata sul ${booking.court} del ${startDateLabel} alle ${startTimeStr} è stata confermata.`,
      link: `/dashboard/atleta/bookings/${booking.id}`,
      is_read: false,
    });

    if (notifError) {
      logger.warn("Failed to create confirm notification for athlete", {
        bookingId: id,
        userId: booking.user_id,
        error: notifError.message,
      });
    }

    const duration = Date.now() - startTime;
    logger.info("Booking confirmed", { bookingId: id, confirmedBy: user.id });
    logger.apiResponse("POST", "/api/bookings/confirm", HTTP_STATUS.OK, duration);

    return NextResponse.json({ success: true });
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error("Exception in bookings/confirm POST", err);
    logger.apiResponse("POST", "/api/bookings/confirm", HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
