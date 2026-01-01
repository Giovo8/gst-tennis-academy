import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { verifyAuth, isAdminOrGestore } from "@/lib/auth/verifyAuth";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    const course_id = url.searchParams.get("course_id");
    const status = url.searchParams.get("status");

    let query = supabaseServer
      .from("enrollments")
      .select(`
        *,
        profiles:user_id(full_name, email),
        courses(title, start_date, end_date, price)
      `)
      .order("enrolled_at", { ascending: false });

    if (user_id) query = query.eq("user_id", user_id);
    if (course_id) query = query.eq("course_id", course_id);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ enrollments: data });
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
    const { user_id, course_id } = body;

    if (!user_id || !course_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ✅ SECURITY FIX: L'utente può iscrivere solo sé stesso, admin/gestore chiunque
    const canEnrollOthers = isAdminOrGestore(profile?.role);
    if (user_id !== user.id && !canEnrollOthers) {
      return NextResponse.json(
        { error: "Non autorizzato a iscrivere altri utenti" },
        { status: 403 }
      );
    }

    // Check if course has available spots
    const { data: course, error: courseError } = await supabaseServer
      .from("courses")
      .select("max_participants, current_participants")
      .eq("id", course_id)
      .single();

    if (courseError) {
      return NextResponse.json({ error: courseError.message }, { status: 404 });
    }

    if (course.current_participants >= course.max_participants) {
      return NextResponse.json({ error: "Course is full" }, { status: 409 });
    }

    // Create enrollment
    const { data, error } = await supabaseServer
      .from("enrollments")
      .insert([{ user_id, course_id, status: body.status || "pending", payment_status: body.payment_status || "pending" }])
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Update course participants count
    await supabaseServer
      .from("courses")
      .update({ current_participants: course.current_participants + 1 })
      .eq("id", course_id);

    return NextResponse.json({ enrollment: data?.[0] }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // ✅ SECURITY FIX: Verifica autenticazione
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;

    // Verifica che l'enrollment appartenga all'utente o sia admin
    const { data: enrollment } = await supabaseServer
      .from("enrollments")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment non trovato" }, { status: 404 });
    }

    const canEdit = enrollment.user_id === user.id || isAdminOrGestore(profile?.role);
    if (!canEdit) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const body = await req.json();
    const { data, error } = await supabaseServer
      .from("enrollments")
      .update(body)
      .eq("id", id)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ enrollment: data?.[0] });
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

    // ✅ SECURITY FIX: Verifica autenticazione
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, profile } = authResult.data;

    // Get enrollment to verify ownership and update course participants
    const { data: enrollment, error: enrollError } = await supabaseServer
      .from("enrollments")
      .select("course_id, user_id")
      .eq("id", id)
      .single();

    if (enrollError) return NextResponse.json({ error: enrollError.message }, { status: 404 });

    const canDelete = enrollment.user_id === user.id || isAdminOrGestore(profile?.role);
    if (!canDelete) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    // Delete enrollment
    const { error } = await supabaseServer.from("enrollments").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Update course participants count
    const { data: course } = await supabaseServer
      .from("courses")
      .select("current_participants")
      .eq("id", enrollment.course_id)
      .single();

    if (course && course.current_participants > 0) {
      await supabaseServer
        .from("courses")
        .update({ current_participants: course.current_participants - 1 })
        .eq("id", enrollment.course_id);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
