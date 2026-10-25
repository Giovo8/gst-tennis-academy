import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth, isAdminOrGestore } from '@/lib/auth/verifyAuth';
import logger from '@/lib/logger/secure-logger';
import { getBestOf } from '@/lib/tournaments/getBestOf';
import { computeMatchResult } from '@/lib/tournaments/tennisScore';

// PUT /api/tournaments/[id]/matches/[matchId] - Update match score (tennis scoring)
// Body: { sets: [{ player1_score, player2_score }, ...], retired_player?: 1 | 2 }
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; matchId: string }> },
) {
  const params = await context.params;
  const supabase = supabaseServer;

  try {
    // Admin/gestore o partecipanti dell'incontro (verificato sotto)
    const auth = await verifyAuth(request);
    if (!auth.success) return auth.response;
    const userId = auth.data.user.id;
    const isAdmin = isAdminOrGestore(auth.data.profile?.role);

    const { data: currentMatch, error: matchError } = await supabase
      .from('tournament_matches')
      .select(
        `
        *,
        player1:player1_id(user_id),
        player2:player2_id(user_id),
        tournament:tournaments(best_of, match_format, tournament_type)
      `,
      )
      .eq('id', params.matchId)
      .eq('tournament_id', params.id)
      .maybeSingle();

    if (matchError) throw matchError;
    if (!currentMatch) {
      return NextResponse.json({ error: 'Partita non trovata' }, { status: 404 });
    }

    const isParticipant =
      currentMatch.player1?.user_id === userId || currentMatch.player2?.user_id === userId;

    if (!isAdmin && !isParticipant) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 });
    }

    // Una volta inserito il punteggio, solo admin/gestore possono modificarlo
    const alreadyScored =
      (Array.isArray(currentMatch.sets) && currentMatch.sets.length > 0) ||
      currentMatch.match_status === 'completed';
    if (!isAdmin && alreadyScored) {
      return NextResponse.json(
        { error: 'Il punteggio è già stato inserito: solo un admin può modificarlo' },
        { status: 403 },
      );
    }

    if (!currentMatch.player1_id || !currentMatch.player2_id) {
      return NextResponse.json(
        { error: 'La partita non ha ancora entrambi i giocatori' },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const retiredPlayer = body?.retired_player ?? null;
    if (retiredPlayer !== null && retiredPlayer !== 1 && retiredPlayer !== 2) {
      return NextResponse.json({ error: 'retired_player deve essere 1 o 2' }, { status: 400 });
    }

    const bestOf = getBestOf(currentMatch.tournament);
    const result = computeMatchResult(body?.sets, bestOf, retiredPlayer);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const winner_id = result.winner === 1 ? currentMatch.player1_id : currentMatch.player2_id;

    const { data: updatedMatch, error: updateError } = await supabase
      .from('tournament_matches')
      .update({
        sets: result.sets,
        winner_id,
        match_status: 'completed',
        status: 'completata',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.matchId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Nel campionato le giornate sono indipendenti (punteggi inseribili in qualsiasi ordine):
    // nessun avanzamento del vincitore e nessuna chiusura automatica del torneo.
    const isCampionato = currentMatch.tournament?.tournament_type === 'campionato';

    if (!isCampionato && !isGroupMatch(currentMatch)) {
      await advanceWinnerToNextRound(
        supabase,
        params.id,
        updatedMatch.round_number,
        updatedMatch.match_number,
        winner_id,
      );
    }

    return NextResponse.json({
      success: true,
      message: result.retired
        ? 'Ritiro registrato con successo'
        : 'Punteggio aggiornato con successo',
      match: updatedMatch,
      winner_id,
      sets_summary: `${result.setsWon[0]}-${result.setsWon[1]}`,
    });
  } catch (error) {
    logger.error('Error updating match score:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Le partite dei gironi (round 0) non hanno un turno successivo: avanzare il vincitore
 * chiuderebbe il torneo ("Concluso") o sovrascriverebbe il tabellone.
 */
function isGroupMatch(match: { phase?: string | null; round_number?: number | null }) {
  return match.phase === 'gironi' || match.round_number === 0;
}

/**
 * Avanza il vincitore di un match al turno successivo
 * @param supabase Client Supabase
 * @param tournamentId ID del torneo
 * @param currentRound Numero del turno corrente
 * @param currentMatchNumber Numero del match corrente
 * @param winnerId ID del vincitore
 */
async function advanceWinnerToNextRound(
  supabase: SupabaseClient,
  tournamentId: string,
  currentRound: number,
  currentMatchNumber: number,
  winnerId: string,
) {
  try {
    // Calcola quale match del turno successivo
    const nextRound = currentRound + 1;

    // Carica tutti i match del round corrente per capire la posizione
    const { data: currentRoundMatches } = await supabase
      .from('tournament_matches')
      .select('match_number')
      .eq('tournament_id', tournamentId)
      .eq('round_number', currentRound)
      .order('match_number', { ascending: true });

    // Trova la posizione del match corrente nel suo round (0-indexed)
    const positionInRound =
      currentRoundMatches?.findIndex(
        (m: { match_number: number }) => m.match_number === currentMatchNumber,
      ) ?? -1;

    if (positionInRound === -1) {
      logger.error('Could not find current match position');
      return;
    }

    // Il match successivo è alla posizione Math.floor(positionInRound / 2) nel round successivo
    const nextMatchPositionInRound = Math.floor(positionInRound / 2);

    // Trova tutti i match del turno successivo
    const { data: nextRoundMatches } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('round_number', nextRound)
      .order('match_number', { ascending: true });

    if (!nextRoundMatches || nextRoundMatches.length === 0) {
      // Torneo completato - aggiorna lo status
      const { error: tournamentUpdateError } = await supabase
        .from('tournaments')
        .update({ status: 'Concluso' })
        .eq('id', tournamentId);

      if (tournamentUpdateError) {
        logger.error('Error updating tournament status', tournamentUpdateError);
      }

      return;
    }

    // Prendi il match alla posizione calcolata
    const nextMatch = nextRoundMatches[nextMatchPositionInRound];

    if (!nextMatch) {
      logger.error('Next match not found at position', undefined, { nextMatchPositionInRound });
      return;
    }

    // Determina se il vincitore va in player1 o player2
    // Match pari (0, 2, 4...) -> player1 del prossimo
    // Match dispari (1, 3, 5...) -> player2 del prossimo
    const isPlayer1 = positionInRound % 2 === 0;

    const updateData: Record<string, unknown> = {};
    if (isPlayer1) {
      updateData.player1_id = winnerId;
      if (nextMatch.player2_id) {
        updateData.match_status = 'scheduled';
        updateData.status = 'programmata';
      }
    } else {
      updateData.player2_id = winnerId;
      if (nextMatch.player1_id) {
        updateData.match_status = 'scheduled';
        updateData.status = 'programmata';
      }
    }

    // Aggiorna il match successivo
    const { error: updateError } = await supabase
      .from('tournament_matches')
      .update(updateData)
      .eq('id', nextMatch.id);

    if (updateError) {
      logger.error('Error updating next match', updateError);
    }
  } catch (error) {
    logger.error('Error in advanceWinnerToNextRound', error);
  }
}
