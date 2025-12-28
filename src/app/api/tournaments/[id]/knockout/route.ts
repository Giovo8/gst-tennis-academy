import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

// GET /api/tournaments/[id]/knockout - Get knockout bracket
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseServer;

  try {
    // Fetch knockout matches
    const { data: matches, error: matchesError } = await supabase
      .from("tournament_matches")
      .select(`
        *,
        player1:player1_id(id, user_id, profiles(full_name)),
        player2:player2_id(id, user_id, profiles(full_name)),
        winner:winner_id(id, user_id, profiles(full_name))
      `)
      .eq("tournament_id", params.id)
      .eq("stage", "knockout")
      .order("round_order");

    if (matchesError) throw matchesError;

    // Organize matches by round
    const rounds: { [key: string]: any[] } = {};
    
    (matches || []).forEach((match: any) => {
      const roundName = match.round_name || "Round";
      if (!rounds[roundName]) {
        rounds[roundName] = [];
      }
      rounds[roundName].push(match);
    });

    return NextResponse.json({
      success: true,
      matches: matches || [],
      rounds,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
