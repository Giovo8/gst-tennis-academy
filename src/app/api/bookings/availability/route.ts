import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { parseItalyLocalToUTC } from '@/lib/bookings/bookingTimeRestrictions';
import { resolveCourseCourtsForDate } from '@/lib/bookings/courseConflicts';
import { getRouteAuth, unauthorized } from '@/lib/auth/routeAuth';

/**
 * GET /api/bookings/availability?date=YYYY-MM-DD&court=<nome campo>
 * Occupazioni di un campo in un giorno (prenotazioni confermate, blocchi, corsi),
 * senza dati personali. Usa la service role per vedere anche le prenotazioni
 * altrui, quindi richiede un utente loggato.
 * Restituisce: { bookings: [{ id, start_time, end_time, type, status, isBlock, ... }] }
 */
export async function GET(request: Request) {
  const supabase = supabaseServer;

  const auth = await getRouteAuth();
  if (!auth) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const court = searchParams.get('court');

    if (!dateStr || !court || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        { error: 'Parametri richiesti: date (YYYY-MM-DD), court' },
        { status: 400 },
      );
    }

    const startOfDay = `${dateStr}T00:00:00`;
    const endOfDay = `${dateStr}T23:59:59.999`;

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, court, start_time, end_time, type, status')
      .eq('court', court)
      .neq('status', 'cancelled')
      .neq('status', 'rejected')
      .neq('status', 'pending')
      .lt('start_time', endOfDay)
      .gt('end_time', startOfDay);

    if (bookingsError) {
      console.error('Error fetching daily bookings:', bookingsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const { data: courtBlocks, error: blocksError } = await supabase
      .from('court_blocks')
      .select('id, start_time, end_time, reason')
      .eq('court_id', court)
      .eq('is_disabled', false)
      .lt('start_time', endOfDay)
      .gt('end_time', startOfDay);

    if (blocksError) {
      console.error('Error fetching court blocks:', blocksError);
    }

    const enrichedBookings = (bookings ?? []).map((b) => ({ ...b, isBlock: false }));
    const enrichedBlocks = (courtBlocks ?? []).map((b) => ({
      id: b.id,
      court: court,
      start_time: b.start_time,
      end_time: b.end_time,
      type: 'blocco',
      status: 'blocked',
      reason: b.reason,
      isBlock: true,
    }));

    // Query active courses for this court and day
    const DAY_NAMES = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
    const selectedDate = new Date(dateStr + 'T12:00:00');
    const dayName = DAY_NAMES[selectedDate.getDay()];

    const { data: courseData } = await supabase
      .from('courses')
      .select(
        'id, name, court_name, schedule_time, schedule_days, schedule_periods, cancelled_dates, start_date, end_date, extra_dates, lesson_overrides, lesson_time_overrides',
      )
      .eq('is_active', true);

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
        let timeStr: string | null = c.schedule_time ?? null;
        const courtsForDay = resolveCourseCourtsForDate(c, dateStr, dayName);
        if (!courtsForDay.includes(court)) return [];
        // lesson_time_overrides: per-date time override has highest priority
        if (
          c.lesson_time_overrides &&
          (c.lesson_time_overrides as Record<string, string>)[dateStr]
        ) {
          timeStr = (c.lesson_time_overrides as Record<string, string>)[dateStr];
        } else if (c.schedule_periods && c.schedule_periods.length > 0) {
          const mp = c.schedule_periods.find(
            (p: { days: string[]; time: string | null; court: string | null }) =>
              p.days.includes(dayName),
          );
          if (mp) timeStr = mp.time ?? null;
        }
        if (!timeStr) return [];
        const m = timeStr.match(/(\d{1,2}):(\d{2})\s*[\u2013\-]\s*(\d{1,2}):(\d{2})/);
        if (!m) return [];
        const start = parseItalyLocalToUTC(dateStr, parseInt(m[1], 10), parseInt(m[2], 10));
        const end = parseItalyLocalToUTC(dateStr, parseInt(m[3], 10), parseInt(m[4], 10));
        return [
          {
            id: c.id,
            court,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            type: 'corso',
            status: 'confirmed',
            isBlock: false,
            isCourse: true,
            courseName: c.name,
          },
        ];
      });

    return NextResponse.json({
      bookings: [...enrichedBookings, ...enrichedBlocks, ...enrichedCourses],
    });
  } catch (error) {
    console.error('Error in availability check:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
