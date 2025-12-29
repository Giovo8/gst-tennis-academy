import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

// Genera gironi e match round-robin per torneo girone_eliminazione
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = context.params instanceof Promise ? await context.params : context.params;
  const tournamentId = params.id;

  try {
    // Get tournament
    const { data: tournament, error: tournamentError } = await supabaseServer
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: "Torneo non trovato" }, { status: 404 });
    }

    // Check tournament type
    if (tournament.tournament_type !== 'girone_eliminazione') {
      return NextResponse.json({ 
        error: "Questo endpoint è solo per tornei di tipo 'girone_eliminazione'" 
      }, { status: 400 });
    }

    // Check phase
    if (tournament.current_phase !== 'gironi') {
      return NextResponse.json({ 
        error: `Il torneo deve essere in fase 'gironi'. Fase attuale: ${tournament.current_phase}` 
      }, { status: 400 });
    }

    // Check if groups already exist
    const { data: existingGroups } = await supabaseServer
      .from("tournament_groups")
      .select("id")
      .eq("tournament_id", tournamentId);

    if (existingGroups && existingGroups.length > 0) {
      return NextResponse.json({ 
        error: "I gironi sono già stati generati per questo torneo" 
      }, { status: 400 });
    }

    // Get participants
    const { data: participants, error: participantsError } = await supabaseServer
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("seed", { ascending: true });

    if (participantsError) {
      return NextResponse.json({ error: participantsError.message }, { status: 500 });
    }

    if (!participants || participants.length < 4) {
      return NextResponse.json({ 
        error: "Servono almeno 4 partecipanti per generare i gironi" 
      }, { status: 400 });
    }

    const numGroups = tournament.num_groups || 4;
    const teamsPerGroup = Math.ceil(participants.length / numGroups);

    // Create groups
    const groups = [];
    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    
    for (let i = 0; i < numGroups; i++) {
      const { data: group, error: groupError } = await supabaseServer
        .from("tournament_groups")
        .insert({
          tournament_id: tournamentId,
          group_name: `Girone ${groupNames[i]}`,
          group_order: i + 1
        })
        .select()
        .single();

      if (groupError) {
        return NextResponse.json({ error: groupError.message }, { status: 500 });
      }

      groups.push(group);
    }

    // Distribute participants to groups (snake draft for fairness)
    const groupAssignments: { [key: string]: any[] } = {};
    groups.forEach(g => groupAssignments[g.id] = []);

    let currentGroupIndex = 0;
    let direction = 1; // 1 for forward, -1 for backward

    for (const participant of participants) {
      const group = groups[currentGroupIndex];
      groupAssignments[group.id].push(participant);

      // Update participant with group_id
      await supabaseServer
        .from("tournament_participants")
        .update({ group_id: group.id })
        .eq("id", participant.id);

      // Snake draft pattern
      currentGroupIndex += direction;
      if (currentGroupIndex >= numGroups) {
        currentGroupIndex = numGroups - 1;
        direction = -1;
      } else if (currentGroupIndex < 0) {
        currentGroupIndex = 0;
        direction = 1;
      }
    }

    // Generate round-robin matches for each group
    let totalMatches = 0;
    for (const group of groups) {
      const groupParticipants = groupAssignments[group.id];
      
      // Generate all possible match pairings (round-robin)
      for (let i = 0; i < groupParticipants.length; i++) {
        for (let j = i + 1; j < groupParticipants.length; j++) {
          const matchNumber = totalMatches + 1;
          
          await supabaseServer
            .from("tournament_matches")
            .insert({
              tournament_id: tournamentId,
              round_number: 0, // Group stage = round 0
              round_name: group.group_name,
              match_number: matchNumber,
              player1_id: groupParticipants[i].id,
              player2_id: groupParticipants[j].id,
              match_status: 'scheduled',
              group_id: group.id
            });

          totalMatches++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${numGroups} gironi creati con successo`,
      groups: groups.map(g => ({
        id: g.id,
        name: g.group_name,
        participants: groupAssignments[g.id].length
      })),
      total_matches: totalMatches
    });

  } catch (error: any) {
    console.error('Error generating groups:', error);
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}
