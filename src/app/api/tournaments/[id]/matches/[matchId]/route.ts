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
  context: { params: Promise<{ id: string; matchId: string }> | { id: string; matchId: string } }
) {
  const params = context.params instanceof Promise ? await context.params : context.params;
  const supabase = supabaseServer;

  try {
    // Check permission (admin/gestore or match participants)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    // Get current match and tournament info
    const { data: currentMatch, error: matchError } = await supabase
      .from("tournament_matches")
      .select(`
        *,
        player1:player1_id(user_id),
        player2:player2_id(user_id),
        tournament:tournaments(best_of)
      `)
      .eq("id", params.matchId)
      .single();

    if (matchError) throw matchError;

    // Check permission
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile && ["admin", "gestore"].includes(profile.role?.toLowerCase() || "");
    const isParticipant =
      currentMatch.player1?.user_id === user.id ||
      currentMatch.player2?.user_id === user.id;

    if (!isAdmin && !isParticipant) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const body = await request.json();
    const { sets } = body; // Array: [{ player1_score: 6, player2_score: 3 }, ...]

    if (!sets || !Array.isArray(sets)) {
      return NextResponse.json({ error: "Sets array richiesto" }, { status: 400 });
    }

    // Validate tennis scoring
    for (const set of sets) {
      const { player1_score, player2_score } = set;
      
      // Basic validation
      if (typeof player1_score !== 'number' || typeof player2_score !== 'number') {
        return NextResponse.json({ error: "Punteggi devono essere numeri" }, { status: 400 });
      }

      // Tennis rules validation
      const max_score = Math.max(player1_score, player2_score);
      const min_score = Math.min(player1_score, player2_score);
      
      // Must win by 2 games (unless tiebreak 7-6)
      if (max_score === 7 && min_score === 6) {
        // Valid: 7-6 (tiebreak)
        continue;
      } else if (max_score >= 6) {
        if (max_score - min_score < 2) {
          return NextResponse.json({ 
            error: `Punteggio non valido: ${player1_score}-${player2_score}. Devi vincere con 2 game di differenza.` 
          }, { status: 400 });
        }
      } else {
        return NextResponse.json({ 
          error: `Punteggio non valido: ${player1_score}-${player2_score}. Servono almeno 6 game per vincere un set.` 
        }, { status: 400 });
      }
    }

    // Calculate sets won by each player
    let player1_sets_won = 0;
    let player2_sets_won = 0;

    sets.forEach((set: any) => {
      if (set.player1_score > set.player2_score) {
        player1_sets_won++;
      } else if (set.player2_score > set.player1_score) {
        player2_sets_won++;
      }
    });

    // Determine winner based on best_of format
    const bestOf = (currentMatch.tournament as any)?.best_of || 3;
    const setsToWin = Math.ceil(bestOf / 2); // 2 for best of 3, 3 for best of 5
    
    let winner_id = null;
    let match_status = 'in_progress';
    let status = 'in_corso';

    if (player1_sets_won >= setsToWin) {
      winner_id = currentMatch.player1_id;
      match_status = 'completed';
      status = 'completata';
    } else if (player2_sets_won >= setsToWin) {
      winner_id = currentMatch.player2_id;
      match_status = 'completed';
      status = 'completata';
    }

    // Update match
    const { data: updatedMatch, error: updateError } = await supabase
      .from("tournament_matches")
      .update({
        sets,
        winner_id,
        match_status,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.matchId)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log('✅ Match updated:', {
      id: updatedMatch.id,
      winner_id,
      match_status,
      round_number: updatedMatch.round_number,
      match_number: updatedMatch.match_number
    });

    // If match completed, advance winner to next round
    if (winner_id && match_status === 'completed') {
      console.log('🎯 Calling advanceWinnerToNextRound...');
      await advanceWinnerToNextRound(
        supabase,
        params.id,
        updatedMatch.round_number,
        updatedMatch.match_number,
        winner_id
      );
    } else {
      console.log('⏸️ Match not completed yet or no winner:', { winner_id, match_status });
    }

    return NextResponse.json({
      success: true,
      message: "Punteggio aggiornato con successo",
      match: updatedMatch,
      winner_id,
      sets_summary: `${player1_sets_won}-${player2_sets_won}`,
    });
  } catch (error: any) {
    console.error('Error updating match score:', error);
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
        status: 'completata',
        end_time: new Date().toISOString()
      })
      .eq("id", params.matchId)
      .select()
      .single();

    if (updateError) throw updateError;
    
    // Se il match è completato, avanza il vincitore al turno successivo
    if (winner_id) {
      await advanceWinnerToNextRound(
        supabase,
        params.id,
        updatedMatch.round_number,
        updatedMatch.match_number,
        winner_id
      );
    }

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

/**
 * Avanza il vincitore di un match al turno successivo
 * @param supabase Client Supabase
 * @param tournamentId ID del torneo
 * @param currentRound Numero del turno corrente
 * @param currentMatchNumber Numero del match corrente
 * @param winnerId ID del vincitore
 */
async function advanceWinnerToNextRound(
  supabase: any,
  tournamentId: string,
  currentRound: number,
  currentMatchNumber: number,
  winnerId: string
) {
  try {
    console.log('🏆 advanceWinnerToNextRound called:', {
      tournamentId,
      currentRound,
      currentMatchNumber,
      winnerId
    });

    // Calcola quale match del turno successivo
    const nextRound = currentRound + 1;
    
    // Carica tutti i match del round corrente per capire la posizione
    const { data: currentRoundMatches } = await supabase
      .from("tournament_matches")
      .select("match_number")
      .eq("tournament_id", tournamentId)
      .eq("round_number", currentRound)
      .order("match_number", { ascending: true });
    
    // Trova la posizione del match corrente nel suo round (0-indexed)
    const positionInRound = currentRoundMatches?.findIndex((m: { match_number: number }) => m.match_number === currentMatchNumber) ?? -1;
    
    if (positionInRound === -1) {
      console.error('❌ Could not find current match position');
      return;
    }
    
    // Il match successivo è alla posizione Math.floor(positionInRound / 2) nel round successivo
    const nextMatchPositionInRound = Math.floor(positionInRound / 2);
    
    console.log('📊 Searching for next match:', {
      nextRound,
      positionInRound,
      nextMatchPositionInRound
    });

    // Trova tutti i match del turno successivo
    const { data: nextRoundMatches } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("round_number", nextRound)
      .order("match_number", { ascending: true });
    
    if (!nextRoundMatches || nextRoundMatches.length === 0) {
      console.log('✅ No next match found - tournament completed! Updating tournament status to Concluso...');
      
      // Aggiorna lo status del torneo a "Concluso"
      const { error: tournamentUpdateError } = await supabase
        .from("tournaments")
        .update({ status: 'Concluso' })
        .eq("id", tournamentId);
      
      if (tournamentUpdateError) {
        console.error('❌ Error updating tournament status:', tournamentUpdateError);
      } else {
        console.log('✅ Tournament status updated to Concluso');
      }
      
      return;
    }
    
    // Prendi il match alla posizione calcolata
    const nextMatch = nextRoundMatches[nextMatchPositionInRound];
    
    if (!nextMatch) {
      console.error('❌ Next match not found at position', nextMatchPositionInRound);
      return;
    }
    
    console.log('✅ Found next match:', {
      id: nextMatch.id,
      match_number: nextMatch.match_number,
      round_name: nextMatch.round_name,
      current_player1: nextMatch.player1_id,
      current_player2: nextMatch.player2_id
    });

    // Determina se il vincitore va in player1 o player2
    // Match pari (0, 2, 4...) -> player1 del prossimo
    // Match dispari (1, 3, 5...) -> player2 del prossimo
    const isPlayer1 = positionInRound % 2 === 0;
    
    console.log(`🎯 Winner goes to: ${isPlayer1 ? 'player1' : 'player2'} (positionInRound: ${positionInRound})`);

    const updateData: Record<string, unknown> = {};
    if (isPlayer1) {
      updateData.player1_id = winnerId;
      // Se player2 è già presente, il match può iniziare
      if (nextMatch.player2_id) {
        updateData.match_status = 'scheduled';
        updateData.status = 'programmata';
        console.log('✅ Both players now present, match can be scheduled');
      } else {
        console.log('⏳ Waiting for player2');
      }
    } else {
      updateData.player2_id = winnerId;
      // Se player1 è già presente, il match può iniziare
      if (nextMatch.player1_id) {
        updateData.match_status = 'scheduled';
        updateData.status = 'programmata';
        console.log('✅ Both players now present, match can be scheduled');
      } else {
        console.log('⏳ Waiting for player1');
      }
    }
    
    console.log('📝 Updating next match with data:', updateData);

    // Aggiorna il match successivo
    const { data: updated, error: updateError } = await supabase
      .from("tournament_matches")
      .update(updateData)
      .eq("id", nextMatch.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating next match:', updateError);
    } else {
      console.log('✅ Next match updated successfully:', updated);
    }
  } catch (error) {
    console.error('❌ Error in advanceWinnerToNextRound:', error);
  }
}

