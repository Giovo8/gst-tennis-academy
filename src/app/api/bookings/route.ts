import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const user_id = url.searchParams.get("user_id");
    const coach_id = url.searchParams.get("coach_id");

    if (id) {
      const { data, error } = await supabaseServer
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 404 });
      return NextResponse.json({ booking: data });
    }

    let query = supabaseServer
      .from("bookings")
      .select("*")
      .order("start_time", { ascending: true });
    
    if (user_id) query = query.eq("user_id", user_id);
    if (coach_id) query = query.eq("coach_id", coach_id);
    
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bookings: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, coach_id, court, type, start_time, end_time } = body;

    if (!user_id || !court || !start_time || !end_time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validazione 24h anticipo
    const startTime = new Date(start_time);
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    if (startTime < twentyFourHoursFromNow) {
      return NextResponse.json(
        { error: "Le prenotazioni devono essere effettuate con almeno 24 ore di anticipo" },
        { status: 400 }
      );
    }

    // Check for overlapping confirmed bookings on the same court
    const { data: conflicts, error: conflictError } = await supabaseServer
      .from("bookings")
      .select("id")
      .eq("court", court)
      .eq("manager_confirmed", true)
      .or(`and(start_time.lte.${end_time},end_time.gte.${start_time})`)
      .limit(1);

    if (conflictError) {
      return NextResponse.json({ error: conflictError.message }, { status: 500 });
    }

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: "Time slot not available" }, { status: 409 });
    }

    // Determine status and confirmation flags based on booking type and user making the booking
    const bookingStatus = body.status || "pending";
    const coachConfirmed = body.coach_confirmed ?? false;
    const managerConfirmed = body.manager_confirmed ?? false;

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
          notes: body.notes || null,
        },
      ])
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ booking: data?.[0] ?? null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request" }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    
    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Check if booking exists and belongs to user
    const { data: booking } = await supabaseServer
      .from("bookings")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    
    const body = await req.json();
    const { data, error } = await supabaseServer
      .from("bookings")
      .update(body)
      .eq("id", id)
      .select();
    
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ booking: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    
    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Check if booking exists and belongs to user
    const { data: booking } = await supabaseServer
      .from("bookings")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    
    const { error } = await supabaseServer.from("bookings").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
