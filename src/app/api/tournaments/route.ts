import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

async function getUserProfileFromRequest(req: Request) {
  const authHeader = (req as any).headers?.get?.("authorization") ?? null;
  const token = authHeader?.replace("Bearer ", "") ?? null;
  console.log('[API DEBUG] Token:', token);
  if (!token) return { user: null, profile: null };
  const { data: userData, error: userErr } = await supabaseServer.auth.getUser(token);
  if (userErr || !userData?.user) {
    console.log('[API DEBUG] userErr:', userErr, 'userData:', userData);
    return { user: null, profile: null };
  }
  const user = userData.user;
  const { data: profile } = await supabaseServer.from("profiles").select("id, role, full_name").eq("id", user.id).single();
  console.log('[API DEBUG] user:', user, 'profile:', profile);
  return { user, profile };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const upcoming = url.searchParams.get("upcoming");

    if (id) {
      const { data, error } = await supabaseServer
        .from("tournaments")
        .select(`*`)
        .eq("id", id)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 404 });
      if (!data) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });

      // count participants
      const { count, error: countErr } = await supabaseServer
        .from("tournament_participants")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", id);
      if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

      // try to load creator profile if exists
      let creator = null;
      if (data && data.created_by) {
        const { data: p } = await supabaseServer.from('profiles').select('id, full_name, email').eq('id', data.created_by).single();
        creator = p ?? null;
      }

      return NextResponse.json({ tournament: data, created_by_profile: creator, current_participants: count ?? 0 });
    }

    let query = supabaseServer
      .from("tournaments")
      .select("*")
      .order("starts_at", { ascending: true });

    if (upcoming === "true") {
      query = query.gte("starts_at", new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tournaments: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, profile } = await getUserProfileFromRequest(req);
    console.log('[API DEBUG] POST user:', user, 'profile:', profile, 'role:', profile?.role);
    if (!profile || !["gestore", "admin"].includes(String(profile.role).toLowerCase())) {
      console.log('[API DEBUG] Forbidden: role check failed', profile?.role);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { data, error } = await supabaseServer
      .from("tournaments")
      .insert([body])
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ tournament: data?.[0] }, { status: 201 });
  } catch (err: any) {
    console.error('[tournaments POST] error:', err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { user, profile } = await getUserProfileFromRequest(req);
    if (!profile || !["gestore", "admin"].includes(String(profile.role).toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { data, error } = await supabaseServer
      .from("tournaments")
      .update(body)
      .eq("id", id)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ tournament: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { user, profile } = await getUserProfileFromRequest(req);
    if (!profile || !["gestore", "admin"].includes(String(profile.role).toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseServer.from("tournaments").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
