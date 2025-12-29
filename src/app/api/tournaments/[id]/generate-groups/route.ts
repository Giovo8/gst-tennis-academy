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
    // Verifica autenticazione
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Rimuove "Bearer "
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

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
    const allMatches: any[] = [];
    let totalMatches = 0;
    
    for (const group of groups) {
      const groupParticipants = groupAssignments[group.id];
      
      // Generate all possible match pairings (round-robin)
      for (let i = 0; i < groupParticipants.length; i++) {
        for (let j = i + 1; j < groupParticipants.length; j++) {
          totalMatches++;
          
          allMatches.push({
            tournament_id: tournamentId,
            phase: 'gironi',
            round_number: 0,
            round_name: group.group_name,
            match_number: totalMatches,
            player1_id: groupParticipants[i].id,
            player2_id: groupParticipants[j].id,
            status: 'programmata',
            scheduled_at: null
          });
        }
      }
    }
    
    // Insert all matches at once
    const { data: insertedMatches, error: matchError } = await supabaseServer
      .from("tournament_matches")
      .insert(allMatches)
      .select();
    
    if (matchError) {
      console.error('Error inserting matches:', matchError);
      return NextResponse.json(
        { error: `Errore nella creazione delle partite: ${matchError.message}` },
        { status: 500 }
      );
    }

    // Aggiorna lo stato del torneo
    await supabaseServer
      .from("tournaments")
      .update({
        current_phase: 'gironi',
        status: 'In Corso'
      })
      .eq("id", tournamentId);

    return NextResponse.json({
      success: true,
      message: `${numGroups} gironi creati con successo`,
      groups: groups.map(g => ({
        id: g.id,
        name: g.group_name,
        participants: groupAssignments[g.id].length
      })),
      total_matches: allMatches.length
    });

  } catch (error: any) {
    console.error('Error generating groups:', error);
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}
