import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

async function getUserProfileFromRequest(req: Request) {
  const authHeader = (req as any).headers?.get?.("authorization") ?? null;
  const token = authHeader?.replace("Bearer ", "") ?? null;
  if (!token) return { user: null, profile: null };
  const { data: userData, error: userErr } = await supabaseServer.auth.getUser(token);
  if (userErr || !userData?.user) return { user: null, profile: null };
  const user = userData.user;
  const { data: profile } = await supabaseServer.from("profiles").select("id, role, full_name").eq("id", user.id).single();
  return { user, profile };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    const tournament_id = url.searchParams.get("tournament_id");

    let query = supabaseServer
      .from("tournament_participants")
      .select(`*`)
      .order("created_at", { ascending: false });

    if (user_id) query = query.eq("user_id", user_id);
    if (tournament_id) query = query.eq("tournament_id", tournament_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // fetch profile info for listed user_ids (if profiles table exists)
    const userIds = (data || []).map((r: any) => r.user_id).filter(Boolean);
    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseServer.from('profiles').select('id, full_name, email').in('id', userIds);
      (profiles || []).forEach((p: any) => profilesMap.set(p.id, p));
    }

    const enriched = (data || []).map((r: any) => ({ ...r, profiles: profilesMap.get(r.user_id) || null }));
    return NextResponse.json({ participants: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, tournament_id } = body;
    if (!user_id || !tournament_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { user, profile } = await getUserProfileFromRequest(req);
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // If the requester is trying to register someone else, allow gestore/admin.
    // Allow `maestro` (coach) to register other users only if the target is an `atleta`.
    if (String(profile.id) !== String(user_id)) {
      const roleLower = String(profile.role).toLowerCase();
      if (["gestore", "admin"].includes(roleLower)) {
        // allowed
      } else if (roleLower === "maestro") {
        // verify target is atleta
        const { data: targetProfile, error: tErr } = await supabaseServer.from('profiles').select('id, role').eq('id', user_id).single();
        if (tErr || !targetProfile) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
        if (String(targetProfile.role).toLowerCase() !== 'atleta') {
          return NextResponse.json({ error: 'Forbidden: can only register athletes' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Check tournament and capacity
    const { data: tournament, error: tErr } = await supabaseServer
      .from("tournaments")
      .select("max_participants")
      .eq("id", tournament_id)
      .single();
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 404 });
    if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });

    const { count, error: countErr } = await supabaseServer
      .from("tournament_participants")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournament_id);
    if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

    if ((count ?? 0) >= (tournament.max_participants ?? 0)) {
      return NextResponse.json({ error: "Tournament is full" }, { status: 409 });
    }

    // Create participation
    const { data, error } = await supabaseServer
      .from("tournament_participants")
      .insert([body])
      .select();

    if (error) {
      // unique violation or other
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ participant: data?.[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const user_id = url.searchParams.get("user_id");
    const tournament_id = url.searchParams.get("tournament_id");

    if (id) {
      // find participant to check permissions
      const { data: part, error: pErr } = await supabaseServer.from("tournament_participants").select("id, user_id").eq("id", id).single();
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 404 });

      const { user, profile } = await getUserProfileFromRequest(req);
      if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      // Allow owner, gestore/admin, and maestro (coach) if the participant is an atleta
      if (String(profile.id) === String(part.user_id)) {
        // owner allowed
      } else {
        const roleLower = String(profile.role).toLowerCase();
        if (["gestore", "admin"].includes(roleLower)) {
          // allowed
        } else if (roleLower === 'maestro') {
          // check participant's role
          const { data: pProfile, error: ppErr } = await supabaseServer.from('profiles').select('id, role').eq('id', part.user_id).single();
          if (ppErr || !pProfile) return NextResponse.json({ error: 'Participant profile not found' }, { status: 404 });
          if (String(pProfile.role).toLowerCase() !== 'atleta') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        } else {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      const { error } = await supabaseServer.from("tournament_participants").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (user_id && tournament_id) {
      const { user, profile } = await getUserProfileFromRequest(req);
      if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      if (String(profile.id) === String(user_id)) {
        // owner allowed to remove self
      } else {
        const roleLower = String(profile.role).toLowerCase();
        if (["gestore", "admin"].includes(roleLower)) {
          // allowed
        } else if (roleLower === 'maestro') {
          // only if target user is atleta
          const { data: targetProfile, error: tpErr } = await supabaseServer.from('profiles').select('id, role').eq('id', user_id).single();
          if (tpErr || !targetProfile) return NextResponse.json({ error: 'Target profile not found' }, { status: 404 });
          if (String(targetProfile.role).toLowerCase() !== 'atleta') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        } else {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      const { error } = await supabaseServer
        .from("tournament_participants")
        .delete()
        .eq("user_id", user_id)
        .eq("tournament_id", tournament_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing id or (user_id and tournament_id)" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
