import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

// POST /api/tournaments/[id]/advance-stage - Advance tournament to next stage
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

    // Get tournament info
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", params.id)
      .single();

    if (tournamentError) throw tournamentError;

    if (tournament.current_stage === "groups") {
      // Advance from groups to knockout
      
      // Get all groups
      const { data: groups, error: groupsError } = await supabase
        .from("tournament_groups")
        .select("*")
        .eq("tournament_id", params.id)
        .order("group_order");

      if (groupsError) throw groupsError;

      // Get qualified participants from each group
      const qualifiedParticipants = [];

      for (const group of groups || []) {
        const { data: standings } = await supabase
          .rpc("calculate_group_standings", { group_uuid: group.id });

        // Take top N participants based on advancement_count
        const qualified = (standings || []).slice(0, group.advancement_count);
        qualifiedParticipants.push(...qualified);
      }

      if (qualifiedParticipants.length === 0) {
        return NextResponse.json(
          { error: "Nessun partecipante qualificato" },
          { status: 400 }
        );
      }

      // Assign seeding based on group performance
      for (let i = 0; i < qualifiedParticipants.length; i++) {
        await supabase
          .from("tournament_participants")
          .update({ seeding: i + 1 })
          .eq("id", qualifiedParticipants[i].participant_id);
      }

      // Generate knockout matches
      const knockoutRounds = generateKnockoutMatches(
        qualifiedParticipants,
        tournament.match_format
      );

      // Insert knockout matches
      for (const round of knockoutRounds) {
        for (const match of round.matches) {
          await supabase.from("tournament_matches").insert({
            tournament_id: params.id,
            round_name: round.name,
            round_order: round.order,
            stage: "knockout",
            player1_id: match.player1_id,
            player2_id: match.player2_id,
            match_status: "scheduled",
            surface_type: tournament.surface_type,
          });
        }
      }

      // Update tournament stage
      await supabase
        .from("tournaments")
        .update({
          current_stage: "knockout",
          knockout_stage_config: {
            starting_round: knockoutRounds[0].name,
            num_participants: qualifiedParticipants.length,
          },
        })
        .eq("id", params.id);

      return NextResponse.json({
        success: true,
        message: "Fase a gironi completata, eliminazione diretta iniziata",
        qualified_count: qualifiedParticipants.length,
      });
    } else if (tournament.current_stage === "knockout") {
      // Mark tournament as completed
      await supabase
        .from("tournaments")
        .update({ current_stage: "completed" })
        .eq("id", params.id);

      return NextResponse.json({
        success: true,
        message: "Torneo completato",
      });
    } else {
      return NextResponse.json(
        { error: "Fase torneo non valida" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to generate knockout bracket
function generateKnockoutMatches(
  participants: any[],
  matchFormat: string
): Array<{ name: string; order: number; matches: any[] }> {
  const numParticipants = participants.length;
  const rounds = [];

  // Determine starting round based on number of participants
  const roundNames: { [key: number]: string } = {
    2: "Finale",
    4: "Semifinali",
    8: "Quarti di Finale",
    16: "Ottavi di Finale",
    32: "Sedicesimi di Finale",
  };

  let currentRoundSize = numParticipants;
  let roundOrder = 1;

  // Generate first round (with seeding)
  const firstRoundMatches = [];
  for (let i = 0; i < numParticipants / 2; i++) {
    // Seeded bracket: 1 vs last, 2 vs second-last, etc.
    const player1 = participants[i];
    const player2 = participants[numParticipants - 1 - i];

    firstRoundMatches.push({
      player1_id: player1.participant_id,
      player2_id: player2.participant_id,
    });
  }

  rounds.push({
    name: roundNames[currentRoundSize] || `Round ${roundOrder}`,
    order: roundOrder,
    matches: firstRoundMatches,
  });

  // Note: Subsequent rounds will be generated dynamically as matches are completed
  // This is just the initial bracket setup

  return rounds;
}
