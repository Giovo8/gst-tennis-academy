import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

// GET /api/tournaments/[id]/matches/[matchId] - Get single match details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; matchId: string } }
) {
  const supabase = supabaseServer;

  try {
    const { data: match, error } = await supabase
      .from("tournament_matches")
      .select(`
        *,
        tournament:tournaments(title, match_format, surface_type),
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
      .eq("id", params.matchId)
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      match,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/tournaments/[id]/matches/[matchId] - Update match score (tennis scoring)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; matchId: string } }
) {
  const supabase = supabaseServer;

  try {
    // Check permission (admin/gestore or match participants)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    // Get current match
    const { data: currentMatch, error: matchError } = await supabase
      .from("tournament_matches")
      .select(`
        *,
        player1:player1_id(user_id),
        player2:player2_id(user_id)
      `)
      .eq("id", params.matchId)
      .single();

    if (matchError) throw matchError;

    // Check permission
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile && ["admin", "gestore"].includes(profile.user_role);
    const isParticipant =
      currentMatch.player1?.user_id === user.id ||
      currentMatch.player2?.user_id === user.id;

    if (!isAdmin && !isParticipant) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const body = await request.json();
    const {
      score_detail, // Tennis scoring: { sets: [{set: 1, p1_games: 6, p2_games: 4, tiebreak: null}, ...] }
      match_status,
      court_number,
      scheduled_time,
      start_time,
      end_time,
      stats, // Optional tennis stats
    } = body;

    // Calculate match result from score_detail
    let player1_sets = 0;
    let player2_sets = 0;
    let winner_id = null;
    let total_games_p1 = 0;
    let total_games_p2 = 0;

    if (score_detail && score_detail.sets) {
      score_detail.sets.forEach((set: any) => {
        total_games_p1 += set.p1_games || 0;
        total_games_p2 += set.p2_games || 0;

        // Determine set winner
        if (set.p1_games > set.p2_games) {
          player1_sets++;
        } else if (set.p2_games > set.p1_games) {
          player2_sets++;
        }
      });

      // Determine match winner based on match_format
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("match_format")
        .eq("id", params.id)
        .single();

      const setsToWin = tournament?.match_format === "best_of_5" ? 3 : 2;

      if (player1_sets >= setsToWin) {
        winner_id = currentMatch.player1_id;
      } else if (player2_sets >= setsToWin) {
        winner_id = currentMatch.player2_id;
      }
    }

    // Calculate match duration
    let duration_minutes = null;
    if (start_time && end_time) {
      const start = new Date(start_time);
      const end = new Date(end_time);
      duration_minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    }

    // Update match
    const updateData: any = {};

    if (score_detail !== undefined) {
      updateData.score_detail = score_detail;
      updateData.player1_sets = player1_sets;
      updateData.player2_sets = player2_sets;
      updateData.winner_id = winner_id;
    }

    if (match_status !== undefined) updateData.match_status = match_status;
    if (court_number !== undefined) updateData.court_number = court_number;
    if (scheduled_time !== undefined) updateData.scheduled_time = scheduled_time;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (duration_minutes !== null) updateData.duration_minutes = duration_minutes;
    if (stats !== undefined) updateData.stats = stats;

    updateData.updated_at = new Date().toISOString();

    const { data: updatedMatch, error: updateError } = await supabase
      .from("tournament_matches")
      .update(updateData)
      .eq("id", params.matchId)
      .select()
      .single();

    if (updateError) throw updateError;

    // If match is completed, update participant stats (trigger will handle this automatically)

    return NextResponse.json({
      success: true,
      message: "Punteggio aggiornato con successo",
      match: updatedMatch,
      winner_id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/tournaments/[id]/matches/[matchId] - Quick score update (simple scoring)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; matchId: string } }
) {
  const supabase = supabaseServer;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "gestore", "Admin", "Gestore"].includes(profile.role)) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const body = await request.json();
    const { player1_score, player2_score } = body;

    if (player1_score === undefined || player2_score === undefined) {
      return NextResponse.json({ error: "Punteggi mancanti" }, { status: 400 });
    }

    // Get current match
    const { data: currentMatch, error: matchError } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("id", params.matchId)
      .single();

    if (matchError) throw matchError;

    const winner_id = player1_score > player2_score ? currentMatch.player1_id : currentMatch.player2_id;

    const { data: updatedMatch, error: updateError } = await supabase
      .from("tournament_matches")
      .update({
        player1_sets: player1_score,
        player2_sets: player2_score,
        winner_id: winner_id,
        match_status: 'completed',
        end_time: new Date().toISOString()
      })
      .eq("id", params.matchId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      match: updatedMatch,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/tournaments/[id]/matches/[matchId] - Delete match (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; matchId: string } }
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

    const { error } = await supabase
      .from("tournament_matches")
      .delete()
      .eq("id", params.matchId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Match eliminato con successo",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
