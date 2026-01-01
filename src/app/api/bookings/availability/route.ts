import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * API per verificare disponibilità slot in tempo reale
 * GET /api/bookings/availability
 * Query params: date (YYYY-MM-DD), court, start_time (HH:mm)
 */
export async function GET(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const court = searchParams.get("court");
    const startTime = searchParams.get("start_time");

    if (!dateStr || !court || !startTime) {
      return NextResponse.json(
        { error: "Missing required parameters: date, court, start_time" },
        { status: 400 }
      );
    }

    // Parse parametri
    const date = new Date(dateStr);
    const [hour, minute] = startTime.split(":").map(Number);
    
    // Crea slot start e end
    const slotStart = new Date(date);
    slotStart.setHours(hour, minute || 0, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(slotStart.getHours() + 1, 0, 0, 0);

    // Query per trovare prenotazioni che si sovrappongono
    const { data: overlappingBookings, error } = await supabase
      .from("bookings")
      .select("id, user_id, court, start_time, end_time, status, manager_confirmed")
      .eq("court", court)
      .neq("status", "cancelled")
      .or(`and(start_time.lt.${slotEnd.toISOString()},end_time.gt.${slotStart.toISOString()})`);

    if (error) {
      console.error("Error checking availability:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    // Filtra solo prenotazioni confermate
    const confirmedBookings = overlappingBookings?.filter(
      (b) => b.manager_confirmed === true
    ) || [];

    const available = confirmedBookings.length === 0;

    return NextResponse.json({
      available,
      slot: {
        court,
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
      },
      conflicting_bookings: confirmedBookings.length,
    });
  } catch (error) {
    console.error("Error in availability check:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
