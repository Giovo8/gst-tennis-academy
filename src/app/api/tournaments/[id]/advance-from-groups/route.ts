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

    // Check permissions (admin, gestore, or creator)
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

    // Verify tournament is in group stage
    if (tournament.phase !== 'group_stage') {
      return NextResponse.json(
        { error: 'Il torneo deve essere in fase gironi' },
        { status: 400 }
      );
    }

    // Get all groups
    const { data: groups, error: groupsError } = await supabase
      .from('tournament_groups')
      .select('id, name')
      .eq('tournament_id', tournamentId)
      .order('name');

    if (groupsError || !groups || groups.length === 0) {
      return NextResponse.json(
        { error: 'Nessun girone trovato' },
        { status: 400 }
      );
    }

    // Get all participants with their groups
    const { data: allParticipants, error: participantsError } = await supabase
      .from('tournament_participants')
      .select(`
        id,
        user_id,
        group_id,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('tournament_id', tournamentId)
      .not('group_id', 'is', null);

    if (participantsError || !allParticipants) {
      return NextResponse.json(
        { error: 'Errore nel recupero dei partecipanti' },
        { status: 500 }
      );
    }

    // Get all matches to calculate standings
    const { data: matches, error: matchesError } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .not('group_id', 'is', null)
      .eq('status', 'completed');

    if (matchesError) {
      return NextResponse.json(
        { error: 'Errore nel recupero delle partite' },
        { status: 500 }
      );
    }

    // Calculate standings for each group
    const groupStandings: Record<string, any[]> = {};

    for (const group of groups) {
      const groupParticipants = allParticipants.filter(p => p.group_id === group.id);
      const groupMatches = matches?.filter(m => m.group_id === group.id) || [];

      const standings = groupParticipants.map(participant => {
        const participantMatches = groupMatches.filter(
          m => m.player1_id === participant.id || m.player2_id === participant.id
        );

        let points = 0;
        let matchesWon = 0;
        let matchesLost = 0;
        let setsWon = 0;
        let setsLost = 0;
        let gamesWon = 0;
        let gamesLost = 0;

        participantMatches.forEach(match => {
          const isPlayer1 = match.player1_id === participant.id;
          const sets = match.sets || [];

          sets.forEach((set: any) => {
            const playerScore = isPlayer1 ? set.player1_score : set.player2_score;
            const opponentScore = isPlayer1 ? set.player2_score : set.player1_score;

            gamesWon += playerScore;
            gamesLost += opponentScore;

            if (playerScore > opponentScore) {
              setsWon++;
            } else {
              setsLost++;
            }
          });

          if (match.winner_id === participant.id) {
            points += 2; // 2 points for win
            matchesWon++;
          } else {
            points += 0; // 0 points for loss
            matchesLost++;
          }
        });

        return {
          participant,
          points,
          matchesPlayed: participantMatches.length,
          matchesWon,
          matchesLost,
          setsWon,
          setsLost,
          setsDiff: setsWon - setsLost,
          gamesWon,
          gamesLost,
          gamesDiff: gamesWon - gamesLost
        };
      });

      // Sort standings: points desc, then set diff desc, then games diff desc
      standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
        return b.gamesDiff - a.gamesDiff;
      });

      groupStandings[group.id] = standings;
    }

    // Determine how many teams advance per group (default: top 2)
    const teamsPerGroup = 2;
    const qualifiedParticipants: any[] = [];

    // Collect qualified participants with their seeding info
    for (const group of groups) {
      const standings = groupStandings[group.id];
      const qualified = standings.slice(0, teamsPerGroup);

      qualified.forEach((standing, index) => {
        qualifiedParticipants.push({
          participant: standing.participant,
          groupName: group.name,
          groupPosition: index + 1, // 1st, 2nd, etc.
          points: standing.points,
          setsDiff: standing.setsDiff,
          gamesDiff: standing.gamesDiff
        });
      });
    }

    if (qualifiedParticipants.length < 2) {
      return NextResponse.json(
        { error: 'Non ci sono abbastanza partecipanti qualificati' },
        { status: 400 }
      );
    }

    // Seed participants for knockout bracket
    // Standard seeding: 1A vs 2B, 1B vs 2A, 1C vs 2D, 1D vs 2C, etc.
    const firstPlaceTeams = qualifiedParticipants.filter(p => p.groupPosition === 1);
    const secondPlaceTeams = qualifiedParticipants.filter(p => p.groupPosition === 2);

    // Create bracket matches
    const bracketMatches: any[] = [];
    let matchNumber = 1;

    // Pair 1st from each group with 2nd from different group
    for (let i = 0; i < firstPlaceTeams.length; i++) {
      const secondIndex = (i + 1) % secondPlaceTeams.length; // Rotate to avoid same-group matchups
      
      if (secondPlaceTeams[secondIndex]) {
        bracketMatches.push({
          tournament_id: tournamentId,
          round: 'round_of_' + qualifiedParticipants.length,
          match_number: matchNumber++,
          player1_id: firstPlaceTeams[i].participant.id,
          player2_id: secondPlaceTeams[secondIndex].participant.id,
          status: 'pending',
          scheduled_time: null
        });
      }
    }

    // Insert bracket matches
    const { error: insertError } = await supabase
      .from('tournament_matches')
      .insert(bracketMatches);

    if (insertError) {
      console.error('Error inserting bracket matches:', insertError);
      return NextResponse.json(
        { error: 'Errore nella creazione del bracket eliminatorio' },
        { status: 500 }
      );
    }

    // Update tournament phase to knockout
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({ phase: 'knockout' })
      .eq('id', tournamentId);

    if (updateError) {
      console.error('Error updating tournament phase:', updateError);
      return NextResponse.json(
        { error: 'Errore nell\'aggiornamento della fase del torneo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Partecipanti avanzati alla fase eliminatoria',
      qualified: qualifiedParticipants.length,
      matches_created: bracketMatches.length,
      details: qualifiedParticipants.map(p => ({
        name: p.participant.profiles?.full_name || 'Unknown',
        group: p.groupName,
        position: p.groupPosition,
        points: p.points
      }))
    });

  } catch (error) {
    console.error('Error advancing from groups:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
