import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, court, start_time, end_time, type, status")
        .eq("court", court)
        .neq("status", "cancelled")
        .gte("start_time", `${dateStr}T00:00:00`)
        .lte("start_time", `${dateStr}T23:59:59`);

      if (bookingsError) {
        console.error("Error fetching daily bookings:", bookingsError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }

      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

      const { data: courtBlocks, error: blocksError } = await supabase
        .from("court_blocks")
        .select("id, start_time, end_time, reason")
        .eq("court_id", court)
        .eq("is_disabled", false)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString());

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

      return NextResponse.json({
        bookings: [...enrichedBookings, ...enrichedBlocks],
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
