import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

type CompetitionType = 'torneo' | 'campionato';
type CompetitionFormat = 'eliminazione_diretta' | 'round_robin' | 'girone_eliminazione';

interface TournamentBody {
  title: string;
  starts_at: string;
  max_participants: number;
  status: string;
  competition_type?: CompetitionType;
  format?: CompetitionFormat;
  rounds_data?: any[];
  groups_data?: any[];
  standings?: any[];
  [key: string]: any;
}

async function getUserProfileFromRequest(req: Request) {
  const authHeader = (req as any).headers?.get?.("authorization") ?? null;
  const token = authHeader?.replace("Bearer ", "") ?? null;
  if (!token) return { user: null, profile: null };
  const { data: userData, error: userErr } = await supabaseServer.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { user: null, profile: null };
  }
  const user = userData.user;
  const { data: profile } = await supabaseServer.from("profiles").select("id, role, full_name").eq("id", user.id).single();
  return { user, profile };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const upcoming = url.searchParams.get("upcoming");
    const type = url.searchParams.get("type") as CompetitionType | null;

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

    // Filter by competition type if provided
    if (type && (type === 'torneo' || type === 'campionato')) {
      query = query.eq("competition_type", type);
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
    if (!profile || !["gestore", "admin"].includes(String(profile.role).toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: TournamentBody = await req.json();
    
    // Validate competition_type
    if (body.competition_type && !['torneo', 'campionato'].includes(body.competition_type)) {
      return NextResponse.json({ error: "Invalid competition_type. Must be 'torneo' or 'campionato'" }, { status: 400 });
    }

    // Validate format
    if (body.format && !['eliminazione_diretta', 'round_robin', 'girone_eliminazione'].includes(body.format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    // Set defaults if not provided
    if (!body.competition_type) {
      body.competition_type = 'torneo';
    }
    if (!body.format) {
      body.format = 'eliminazione_diretta';
    }

    // Validate max_participants based on format
    if (body.format === 'eliminazione_diretta' && ![2, 4, 8, 16, 32, 64, 128].includes(body.max_participants)) {
      return NextResponse.json({ 
        error: "For eliminazione_diretta, max_participants must be a power of 2 (2, 4, 8, 16, 32, 64, 128)" 
      }, { status: 400 });
    }

    if ((body.format === 'round_robin' || body.format === 'girone_eliminazione') && body.max_participants < 3) {
      return NextResponse.json({ 
        error: "For round_robin or girone_eliminazione, max_participants must be at least 3" 
      }, { status: 400 });
    }

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
