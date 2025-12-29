import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: tournamentId } = await params;
    const supabase = supabaseServer;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    // Get tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*, created_by')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json(
        { error: 'Torneo non trovato' },
        { status: 404 }
      );
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isGestore = profile?.role === 'gestore';
    const isCreator = tournament.created_by === user.id;

    if (!isAdmin && !isGestore && !isCreator) {
      return NextResponse.json(
        { error: 'Non hai i permessi per questa azione' },
        { status: 403 }
      );
    }

    // Verify tournament type
    if (tournament.tournament_type !== 'campionato') {
      return NextResponse.json(
        { error: 'Questo torneo non è un campionato' },
        { status: 400 }
      );
    }

    // Verify tournament is in the correct phase
    if (tournament.phase !== 'registration' && tournament.phase !== 'not_started') {
      return NextResponse.json(
        { error: 'Il campionato è già iniziato' },
        { status: 400 }
      );
    }

    // Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from('tournament_participants')
      .select('id, user_id, profiles(id, full_name, avatar_url)')
      .eq('tournament_id', tournamentId)
      .eq('status', 'accepted');

    if (participantsError || !participants || participants.length < 2) {
      return NextResponse.json(
        { error: 'Servono almeno 2 partecipanti per generare il calendario' },
        { status: 400 }
      );
    }

    // Check if matches already exist
    const { data: existingMatches } = await supabase
      .from('tournament_matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .limit(1);

    if (existingMatches && existingMatches.length > 0) {
      return NextResponse.json(
        { error: 'Le partite sono già state generate per questo campionato' },
        { status: 400 }
      );
    }

    // Generate round-robin schedule
    const participantIds = participants.map(p => p.id);
    const matches: any[] = [];
    let matchNumber = 1;

    // If odd number of participants, add a "bye" (null)
    if (participantIds.length % 2 !== 0) {
      participantIds.push(null as any);
    }

    const numRounds = participantIds.length - 1;
    const halfSize = participantIds.length / 2;

    // Generate matches using round-robin algorithm
    const playerIndexes = participantIds.map((_, i) => i);

    for (let round = 0; round < numRounds; round++) {
      const roundMatches = [];

      for (let match = 0; match < halfSize; match++) {
        const home = playerIndexes[match];
        const away = playerIndexes[participantIds.length - 1 - match];

        const homeId = participantIds[home];
        const awayId = participantIds[away];

        // Skip if either is a bye
        if (homeId && awayId) {
          roundMatches.push({
            tournament_id: tournamentId,
            round: `giornata_${round + 1}`,
            round_number: round + 1,
            match_number: matchNumber++,
            player1_id: homeId,
            player2_id: awayId,
            status: 'pending',
            scheduled_time: null
          });
        }
      }

      matches.push(...roundMatches);

      // Rotate players (except first one)
      playerIndexes.splice(1, 0, playerIndexes.pop()!);
    }

    // Insert matches
    const { error: insertError } = await supabase
      .from('tournament_matches')
      .insert(matches);

    if (insertError) {
      console.error('Error inserting matches:', insertError);
      return NextResponse.json(
        { error: 'Errore nella creazione delle partite' },
        { status: 500 }
      );
    }

    // Update tournament phase
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({ 
        phase: 'in_progress',
        start_date: tournament.start_date || new Date().toISOString()
      })
      .eq('id', tournamentId);

    if (updateError) {
      console.error('Error updating tournament:', updateError);
    }

    return NextResponse.json({
      message: 'Calendario del campionato generato con successo',
      matches_created: matches.length,
      rounds: numRounds,
      participants: participants.length
    });

  } catch (error) {
    console.error('Error generating championship:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
