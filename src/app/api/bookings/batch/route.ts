import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * API per creare prenotazioni multiple in una transazione atomica
 * POST /api/bookings/batch
 * Body: { bookings: Array<BookingData> }
 */
export async function POST(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await request.json();
    const { bookings } = body;

    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid bookings array" },
        { status: 400 }
      );
    }

    // Validazione base su tutti i booking
    for (const booking of bookings) {
      if (!booking.user_id || !booking.court || !booking.start_time || !booking.end_time) {
        return NextResponse.json(
          { error: "Missing required fields in booking" },
          { status: 400 }
        );
      }
    }

    // Check conflitti per TUTTI gli slot prima di inserire
    const conflicts = [];
    
    for (const booking of bookings) {
      const { data: existingBookings, error: conflictError } = await supabase
        .from("bookings")
        .select("id, start_time, end_time, court, manager_confirmed")
        .eq("court", booking.court)
        .neq("status", "cancelled")
        .or(`and(start_time.lt.${booking.end_time},end_time.gt.${booking.start_time})`);

      if (conflictError) {
        return NextResponse.json(
          { error: "Error checking conflicts", details: conflictError.message },
          { status: 500 }
        );
      }

      // Filtra solo prenotazioni confermate
      const confirmedConflicts = existingBookings?.filter(
        (b: any) => b.manager_confirmed === true
      ) || [];

      if (confirmedConflicts.length > 0) {
        conflicts.push({
          start_time: booking.start_time,
          court: booking.court,
          conflict_count: confirmedConflicts.length,
        });
      }
    }

    // Se ci sono conflitti, blocca TUTTA l'operazione
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: `${conflicts.length} slot non disponibili`,
          conflicts,
        },
        { status: 409 }
      );
    }

    // Nessun conflitto: inserisci TUTTE le prenotazioni
    const { data: insertedBookings, error: insertError } = await supabase
      .from("bookings")
      .insert(
        bookings.map((b) => ({
          user_id: b.user_id,
          coach_id: b.coach_id || null,
          court: b.court,
          type: b.type || "campo",
          start_time: b.start_time,
          end_time: b.end_time,
          status: b.status || "pending",
          coach_confirmed: b.coach_confirmed ?? false,
          manager_confirmed: b.manager_confirmed ?? false,
          notes: b.notes || null,
        }))
      )
      .select();

    if (insertError) {
      console.error("Batch insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create bookings", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        bookings: insertedBookings,
        count: insertedBookings?.length || 0,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Batch booking error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
