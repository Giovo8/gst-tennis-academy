import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;

    const auth = await verifyAuth(request, ['admin', 'gestore']);
    if (!auth.success) return auth.response;

    // Get tournament using service role client
    const { data: tournament, error: tournamentError } = await supabaseServer
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Torneo non trovato' }, { status: 404 });
    }

    // Verify tournament type
    if (tournament.tournament_type !== 'campionato') {
      return NextResponse.json({ error: 'Questo torneo non è un campionato' }, { status: 400 });
    }

    // Check if matches already exist
    const { data: existingMatches } = await supabaseServer
      .from('tournament_matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .limit(1);

    if (existingMatches && existingMatches.length > 0) {
      return NextResponse.json(
        { error: 'Le partite sono già state generate per questo campionato' },
        { status: 400 },
      );
    }

    // Get all participants using service role client
    const { data: participants, error: participantsError } = await supabaseServer
      .from('tournament_participants')
      .select('id, user_id, status')
      .eq('tournament_id', tournamentId);

    if (participantsError) {
      return NextResponse.json(
        { error: `Errore nel recuperare i partecipanti: ${participantsError.message}` },
        { status: 500 },
      );
    }

    if (!participants || participants.length < 2) {
      return NextResponse.json(
        {
          error: `Servono almeno 2 partecipanti per generare il calendario (trovati: ${
            participants?.length || 0
          })`,
        },
        { status: 400 },
      );
    }

    // Generate round-robin schedule
    const participantIds: (string | null)[] = participants.map((p: { id: string }) => p.id);
    const matches: any[] = [];
    let matchNumber = 1;

    // If odd number of participants, add a "bye" (null)
    if (participantIds.length % 2 !== 0) {
      participantIds.push(null);
    }

    const numRounds = participantIds.length - 1;
    const halfSize = participantIds.length / 2;

    // Generate matches using round-robin algorithm
    const playerIndexes = participantIds.map((_: any, i: number) => i);

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
            phase: 'gironi',
            round_name: `Giornata ${round + 1}`,
            round_number: round + 1,
            match_number: matchNumber++,
            player1_id: homeId,
            player2_id: awayId,
            status: 'programmata',
            scheduled_at: null,
          });
        }
      }

      matches.push(...roundMatches);

      // Rotate players (except first one)
      playerIndexes.splice(1, 0, playerIndexes.pop()!);
    }

    // Insert matches using service role client
    const { error: insertError } = await supabaseServer.from('tournament_matches').insert(matches);

    if (insertError) {
      console.error('Error inserting matches:', insertError);
      return NextResponse.json({ error: 'Errore nella creazione delle partite' }, { status: 500 });
    }

    // Update tournament phase using service role client
    const { error: updateError } = await supabaseServer
      .from('tournaments')
      .update({
        current_phase: 'completato',
        status: 'In Corso',
        start_date: tournament.start_date || new Date().toISOString(),
      })
      .eq('id', tournamentId);

    if (updateError) {
      console.error('Error updating tournament:', updateError);
    }

    return NextResponse.json({
      message: 'Calendario del campionato generato con successo',
      matches_created: matches.length,
      rounds: numRounds,
      participants: participants.length,
    });
  } catch (error) {
    console.error('Error generating championship:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
