import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { parseItalyLocalToUTC } from "@/lib/bookings/bookingTimeRestrictions";

/**
 * API per verificare disponibilità slot in tempo reale
 * GET /api/bookings/availability
 *
 * Modalità giornaliera (tutte le prenotazioni di un campo in un giorno):
 *   Query params: date (YYYY-MM-DD), court
 *   Restituisce: { bookings: [{id, start_time, end_time, type, status, isBlock, reason}], court_blocks: [...] }
 *
 * Modalità slot singolo (compatibilità precedente):
 *   Query params: date (YYYY-MM-DD), court, start_time (HH:mm)
 *   Restituisce: { available, slot, conflicting_bookings }
 */
export async function GET(request: Request) {
  const supabase = supabaseServer;

  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const court = searchParams.get("court");
    const startTime = searchParams.get("start_time");

    if (!dateStr || !court) {
      return NextResponse.json(
        { error: "Missing required parameters: date, court" },
        { status: 400 }
      );
    }

    // ── Modalità giornaliera: restituisce tutte le occupazioni del giorno ──
    if (!startTime) {
      const startOfDay = `${dateStr}T00:00:00`;
      const endOfDay = `${dateStr}T23:59:59.999`;

      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, court, start_time, end_time, type, status")
        .eq("court", court)
        .neq("status", "cancelled")
        .neq("status", "rejected")
        .neq("status", "pending")
        .lt("start_time", endOfDay)
        .gt("end_time", startOfDay);

      if (bookingsError) {
        console.error("Error fetching daily bookings:", bookingsError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }

      const { data: courtBlocks, error: blocksError } = await supabase
        .from("court_blocks")
        .select("id, start_time, end_time, reason")
        .eq("court_id", court)
        .eq("is_disabled", false)
        .lt("start_time", endOfDay)
        .gt("end_time", startOfDay);

      if (blocksError) {
        console.error("Error fetching court blocks:", blocksError);
      }

      const enrichedBookings = (bookings ?? []).map((b) => ({ ...b, isBlock: false }));
      const enrichedBlocks = (courtBlocks ?? []).map((b) => ({
        id: b.id,
        court: court,
        start_time: b.start_time,
        end_time: b.end_time,
        type: "blocco",
        status: "blocked",
        reason: b.reason,
        isBlock: true,
      }));

      // Query active courses for this court and day
      const DAY_NAMES = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
      const selectedDate = new Date(dateStr + "T12:00:00");
      const dayName = DAY_NAMES[selectedDate.getDay()];

      const { data: courseData } = await supabase
        .from("courses")
        .select("id, name, court_name, schedule_time, schedule_days, schedule_periods, cancelled_dates, start_date, end_date, extra_dates, lesson_overrides, lesson_time_overrides")
        .eq("is_active", true);

      const enrichedCourses = (courseData ?? [])
        .filter((c) => {
          if (c.start_date && c.start_date > dateStr) return false;
          if (c.end_date && c.end_date < dateStr) return false;
          if (c.cancelled_dates && c.cancelled_dates.includes(dateStr)) return false;
          const isExtraDate = c.extra_dates && (c.extra_dates as string[]).includes(dateStr);
          const isRegularDay = (c.schedule_days as string[]).includes(dayName);
          return isExtraDate || isRegularDay;
        })
        .flatMap((c) => {
          let courseCourtForDay: string | null = c.court_name ?? null;
          let timeStr: string | null = c.schedule_time ?? null;
          // lesson_overrides: per-date court override has highest priority
          if (c.lesson_overrides && (c.lesson_overrides as Record<string, string>)[dateStr]) {
            courseCourtForDay = (c.lesson_overrides as Record<string, string>)[dateStr];
          } else if (c.schedule_periods && c.schedule_periods.length > 0) {
            const mp = c.schedule_periods.find((p: { days: string[]; time: string | null; court: string | null }) => p.days.includes(dayName));
            if (mp?.court) courseCourtForDay = mp.court;
          }
          if (courseCourtForDay !== court) return [];
          // lesson_time_overrides: per-date time override has highest priority
          if (c.lesson_time_overrides && (c.lesson_time_overrides as Record<string, string>)[dateStr]) {
            timeStr = (c.lesson_time_overrides as Record<string, string>)[dateStr];
          } else if (c.schedule_periods && c.schedule_periods.length > 0) {
            const mp = c.schedule_periods.find((p: { days: string[]; time: string | null; court: string | null }) => p.days.includes(dayName));
            if (mp) timeStr = mp.time ?? null;
          }
          if (!timeStr) return [];
          const m = timeStr.match(/(\d{1,2}):(\d{2})\s*[\u2013\-]\s*(\d{1,2}):(\d{2})/);
          if (!m) return [];
          const start = parseItalyLocalToUTC(dateStr, parseInt(m[1], 10), parseInt(m[2], 10));
          const end = parseItalyLocalToUTC(dateStr, parseInt(m[3], 10), parseInt(m[4], 10));
          return [{
            id: c.id,
            court,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            type: "corso",
            status: "confirmed",
            isBlock: false,
            isCourse: true,
            courseName: c.name,
          }];
        });

      return NextResponse.json({
        bookings: [...enrichedBookings, ...enrichedBlocks, ...enrichedCourses],
      });
    }

    // ── Modalità slot singolo (compatibilità precedente) ──
    const date = new Date(dateStr);
    const [hour, minute] = startTime.split(":").map(Number);

    const slotStart = new Date(date);
    slotStart.setHours(hour, minute || 0, 0, 0);

    const slotEnd = new Date(slotStart);
    slotEnd.setHours(slotStart.getHours() + 1, 0, 0, 0);

    const { data: overlappingBookings, error } = await supabase
      .from("bookings")
      .select("id, user_id, court, start_time, end_time, status")
      .eq("court", court)
      .neq("status", "cancelled")
      .neq("status", "rejected")
      .neq("status", "pending")
      .or(`and(start_time.lt.${slotEnd.toISOString()},end_time.gt.${slotStart.toISOString()})`);

    if (error) {
      console.error("Error checking availability:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({
      available: (overlappingBookings?.length ?? 0) === 0,
      slot: {
        court,
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
      },
      conflicting_bookings: overlappingBookings?.length ?? 0,
    });
  } catch (error) {
    console.error("Error in availability check:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
