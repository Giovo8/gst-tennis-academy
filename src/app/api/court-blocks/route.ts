import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/serverClient";

// GET - Fetch court blocks
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const court_id = searchParams.get("court_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("court_blocks")
    .select(`
      *,
      created_by_profile:profiles!court_blocks_created_by_fkey(full_name)
    `)
    .order("start_time", { ascending: true });

  if (court_id) {
    query = query.eq("court_id", court_id);
  }

  if (from) {
    query = query.gte("end_time", from);
  }

  if (to) {
    query = query.lte("start_time", to);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST - Create a new court block
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Verify admin/gestore role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "gestore"].includes(profile.role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { court_id, start_time, end_time, reason, is_recurring, recurrence_pattern, recurrence_end_date } = body;

    if (!court_id || !start_time || !end_time) {
      return NextResponse.json(
        { error: "court_id, start_time e end_time sono obbligatori" },
        { status: 400 }
      );
    }

    // Check for overlapping bookings
    const { data: existingBookings, error: checkError } = await supabase
      .from("bookings")
      .select("id")
      .eq("court_id", court_id)
      .neq("status", "cancelled")
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`);

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json(
        { 
          error: "Esistono prenotazioni in questo slot. Annullarle prima di bloccare il campo.",
          conflicting_bookings: existingBookings.length
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("court_blocks")
      .insert({
        court_id,
        start_time,
        end_time,
        reason: reason || "Blocco manuale",
        is_recurring: is_recurring || false,
        recurrence_pattern,
        recurrence_end_date,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Errore nella creazione del blocco" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a court block
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Verify admin/gestore role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "gestore"].includes(profile.role)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
  }

  const { error } = await supabase
    .from("court_blocks")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
