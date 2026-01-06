import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { verifyAuth, isAdminOrGestore } from "@/lib/auth/verifyAuth";
import { createNotification } from "@/lib/notifications/createNotification";
import { notifyAdmins } from "@/lib/notifications/notifyAdmins";

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // ✅ SECURITY FIX: Verifica autenticazione
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;
    const body = await req.json();
    const { user_id, coach_id, court, type, start_time, end_time } = body;

    if (!user_id || !court || !start_time || !end_time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ✅ SECURITY FIX: L'utente può prenotare solo per sé stesso, admin/gestore per chiunque
    const canBookForOthers = isAdminOrGestore(profile?.role);
    if (user_id !== user.id && !canBookForOthers) {
      return NextResponse.json(
        { error: "Non autorizzato a prenotare per altri utenti" },
        { status: 403 }
      );
    }

    // Validazione 24h anticipo (solo per utenti normali)
    const startTime = new Date(start_time);
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Admin e gestore possono bypassare il limite 24h
    if (startTime < twentyFourHoursFromNow && !canBookForOthers) {
      return NextResponse.json(
        { error: "Le prenotazioni devono essere effettuate con almeno 24 ore di anticipo" },
        { status: 400 }
      );
    }

    // Check for overlapping confirmed bookings on the same court
    const { data: conflicts, error: conflictError } = await supabaseServer
      .from("bookings")
      .select("id, user_id, status, manager_confirmed, start_time, end_time")
      .eq("court", court)
      .neq("status", "cancelled") // Ignore cancelled bookings
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`);

    if (conflictError) {
      // Log only in development
      if (process.env.NODE_ENV === "development") {
        console.error("Error checking conflicts:", conflictError);
      }
      return NextResponse.json({ error: conflictError.message }, { status: 500 });
    }

    // Filter to only confirmed bookings (manager_confirmed = true)
    const confirmedConflicts = conflicts?.filter(b => b.manager_confirmed === true) || [];

    if (confirmedConflicts.length > 0) {
      return NextResponse.json(
        { 
          error: "Slot già prenotato. Seleziona un altro orario.",
          conflict: true 
        },
        { status: 409 }
      );
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

    // Notify admins/gestori about new booking
    if (data && data[0]) {
      const booking = data[0];
      const startDate = new Date(booking.start_time).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const startTime = new Date(booking.start_time).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Get user name for notification
      const { data: userProfile } = await supabaseServer
        .from("profiles")
        .select("full_name")
        .eq("id", user_id)
        .single();

      await notifyAdmins({
        type: "booking",
        title: "Nuova prenotazione",
        message: `${userProfile?.full_name || "Un utente"} ha prenotato il campo ${booking.court} per il ${startDate} alle ${startTime}`,
        link: "/dashboard/admin/bookings",
      });
    }

    return NextResponse.json({ booking: data?.[0] ?? null }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    
    // ✅ Usa verifyAuth helper
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;

    // Check if booking exists and belongs to user
    const { data: booking } = await supabaseServer
      .from("bookings")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
    }

    // Admin/gestore possono modificare qualsiasi prenotazione
    const canEdit = booking.user_id === user.id || isAdminOrGestore(profile?.role);
    if (!canEdit) {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    
    // ✅ Usa verifyAuth helper
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;

    // Check if booking exists and belongs to user
    const { data: booking } = await supabaseServer
      .from("bookings")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
    }

    // Admin/gestore possono eliminare qualsiasi prenotazione
    const canDelete = booking.user_id === user.id || isAdminOrGestore(profile?.role);
    if (!canDelete) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    
    const { error } = await supabaseServer.from("bookings").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
