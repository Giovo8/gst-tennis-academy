import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

// GET /api/tournaments/[id]/matches - Get all matches for tournament
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer;
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage"); // 'groups' or 'knockout'
  const status = searchParams.get("status"); // 'scheduled', 'in_progress', 'completed'

  try {
    let query = supabase
      .from("tournament_matches")
      .select(`
        *,
        player1:player1_id(
          id,
          user_id,
          seeding,
          profiles(full_name, avatar_url)
        ),
        player2:player2_id(
          id,
          user_id,
          seeding,
          profiles(full_name, avatar_url)
        ),
        winner:winner_id(
          id,
          user_id,
          profiles(full_name)
        )
      `)
      .eq("tournament_id", params.id);

    if (stage) query = query.eq("stage", stage);
    if (status) query = query.eq("match_status", status);

    query = query.order("round_order").order("scheduled_time");

    const { data: matches, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      matches: matches || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/tournaments/[id]/matches - Create new match (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer;

  try {
    // Check admin/gestore permission
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "gestore"].includes(profile.user_role)) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const body = await request.json();
    const {
      player1_id,
      player2_id,
      round_name,
      round_order,
      stage,
      scheduled_time,
      court_number,
      surface_type,
    } = body;

    // Validate players exist
    const { data: player1 } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("id", player1_id)
      .single();

    const { data: player2 } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("id", player2_id)
      .single();

    if (!player1 || !player2) {
      return NextResponse.json(
        { error: "Partecipanti non trovati" },
        { status: 400 }
      );
    }

    // Create match
    const { data: match, error: matchError } = await supabase
      .from("tournament_matches")
      .insert({
        tournament_id: params.id,
        player1_id,
        player2_id,
        round_name,
        round_order,
        stage,
        scheduled_time,
        court_number,
        surface_type,
        match_status: "scheduled",
      })
      .select()
      .single();

    if (matchError) throw matchError;

    return NextResponse.json({
      success: true,
      message: "Match creato con successo",
      match,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
