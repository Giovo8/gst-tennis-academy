import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

// GET /api/tournaments/[id]/groups - Get groups for a tournament
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = context.params instanceof Promise ? await context.params : context.params;
  const supabase = supabaseServer;

  try {
    // Fetch groups with participants
    const { data: groups, error: groupsError } = await supabase
      .from("tournament_groups")
      .select(`
        *,
        tournament:tournaments(title, match_format, surface_type)
      `)
      .eq("tournament_id", params.id)
      .order("group_order");

    if (groupsError) throw groupsError;

    // For each group, fetch participants with standings
    const groupsWithStandings = await Promise.all(
      (groups || []).map(async (group: any) => {
        const { data: standings, error: standingsError } = await supabase
          .rpc("calculate_group_standings", { group_uuid: group.id });

        if (standingsError) {
          console.error("Error calculating standings:", standingsError);
        }

        return {
          ...group,
          standings: standings || [],
        };
      })
    );

    return NextResponse.json({
      success: true,
      groups: groupsWithStandings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/tournaments/[id]/groups - Create groups for tournament
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = context.params instanceof Promise ? await context.params : context.params;
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
    const { num_groups, participants_per_group, advancement_count } = body;

    // Fetch tournament participants
    const { data: participants, error: participantsError } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", params.id)
      .eq("status", "confirmed");

    if (participantsError) throw participantsError;

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { error: "Nessun partecipante confermato" },
        { status: 400 }
      );
    }

    // Shuffle participants for random group assignment
    const shuffled = [...participants].sort(() => Math.random() - 0.5);

    // Create groups
    const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const groups = [];

    for (let i = 0; i < num_groups; i++) {
      const { data: group, error: groupError } = await supabase
        .from("tournament_groups")
        .insert({
          tournament_id: params.id,
          group_name: `Gruppo ${groupNames[i]}`,
          group_order: i + 1,
          max_participants: participants_per_group,
          advancement_count: advancement_count || 2,
        })
        .select()
        .single();

      if (groupError) throw groupError;
      groups.push(group);
    }

    // Assign participants to groups (round-robin distribution)
    for (let i = 0; i < shuffled.length; i++) {
      const groupIndex = i % num_groups;
      const participant = shuffled[i];

      await supabase
        .from("tournament_participants")
        .update({
          group_id: groups[groupIndex].id,
          group_position: Math.floor(i / num_groups) + 1,
        })
        .eq("id", participant.id);
    }

    // Update tournament stage
    await supabase
      .from("tournaments")
      .update({
        current_stage: "groups",
        group_stage_config: {
          num_groups,
          participants_per_group,
          advancement_count,
        },
      })
      .eq("id", params.id);

    return NextResponse.json({
      success: true,
      message: "Gironi creati con successo",
      groups,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
