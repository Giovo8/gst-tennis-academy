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
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    // Get tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json(
        { error: 'Torneo non trovato' },
        { status: 404 }
      );
    }

    // Check permissions (admin or gestore)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isGestore = profile?.role === 'gestore';

    if (!isAdmin && !isGestore) {
      return NextResponse.json(
        { error: 'Non hai i permessi per questa azione' },
        { status: 403 }
      );
    }

    // Verify tournament is in group stage
    if (tournament.current_phase !== 'gironi') {
      return NextResponse.json(
        { error: 'Il torneo deve essere in fase gironi' },
        { status: 400 }
      );
    }

    // Get all groups
    const { data: groups, error: groupsError } = await supabase
      .from('tournament_groups')
      .select('id, group_name')
      .eq('tournament_id', tournamentId)
      .order('group_name');

    if (groupsError || !groups || groups.length === 0) {
      return NextResponse.json(
        { error: 'Nessun girone trovato' },
        { status: 400 }
      );
    }

    // Get all participants with their groups
    const { data: allParticipants, error: participantsError } = await supabase
      .from('tournament_participants')
      .select('id, user_id, group_id')
      .eq('tournament_id', tournamentId)
      .not('group_id', 'is', null);

    if (participantsError || !allParticipants) {
      return NextResponse.json(
        { error: 'Errore nel recupero dei partecipanti' },
        { status: 500 }
      );
    }

    // Fetch profiles for participants
    const userIds = allParticipants.map(p => p.user_id).filter(Boolean);
    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      (profiles || []).forEach((p: any) => profilesMap.set(p.id, p));
    }

    // Enrich participants with profile data
    const enrichedParticipants = allParticipants.map((p: any) => ({
      ...p,
      profiles: profilesMap.get(p.user_id) || null
    }));

    // Get all matches to calculate standings
    const { data: matches, error: matchesError } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('phase', 'gironi')
      .in('status', ['completata', 'completed']);

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return NextResponse.json(
        { error: 'Errore nel recupero delle partite' },
        { status: 500 }
      );
    }

    // Calculate standings for each group
    const groupStandings: Record<string, any[]> = {};

    for (const group of groups) {
      const groupParticipants = enrichedParticipants.filter(p => p.group_id === group.id);
      const groupMatches = matches?.filter(m => 
        m.round_name && m.round_name.includes(group.group_name)
      ) || [];

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

    // Determine how many teams advance per group (from tournament settings)
    const teamsPerGroup = tournament.teams_advancing || 2;
    const qualifiedParticipants: any[] = [];

    // Collect qualified participants with their seeding info
    for (const group of groups) {
      const standings = groupStandings[group.id];
      const qualified = standings.slice(0, teamsPerGroup);

      qualified.forEach((standing, index) => {
        qualifiedParticipants.push({
          participant: standing.participant,
          groupName: group.group_name,
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

    // Update participants with their group positions
    for (const qualified of qualifiedParticipants) {
      await supabase
        .from('tournament_participants')
        .update({ group_position: qualified.groupPosition })
        .eq('id', qualified.participant.id);
    }

    // Seed participants for knockout bracket
    // Standard seeding: 1A vs 2B, 1B vs 2A, 1C vs 2D, 1D vs 2C, etc.
    const firstPlaceTeams = qualifiedParticipants.filter(p => p.groupPosition === 1);
    const secondPlaceTeams = qualifiedParticipants.filter(p => p.groupPosition === 2);

    // Helper function to get round name
    const getRoundName = (numParticipants: number): string => {
      if (numParticipants === 2) return "Finale";
      if (numParticipants === 4) return "Semifinali";
      if (numParticipants === 8) return "Quarti di Finale";
      if (numParticipants === 16) return "Ottavi di Finale";
      if (numParticipants === 32) return "Sedicesimi di Finale";
      return `Round di ${numParticipants}`;
    };

    // Create bracket matches
    const bracketMatches: any[] = [];
    let matchNumber = 1;
    const numQualified = qualifiedParticipants.length;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(numQualified)));
    const totalRounds = Math.log2(bracketSize);

    // Pair 1st from each group with 2nd from different group
    for (let i = 0; i < firstPlaceTeams.length; i++) {
      const secondIndex = (i + 1) % secondPlaceTeams.length; // Rotate to avoid same-group matchups
      
      if (secondPlaceTeams[secondIndex]) {
        bracketMatches.push({
          tournament_id: tournamentId,
          phase: 'eliminazione',
          round_number: 1,
          round_name: getRoundName(qualifiedParticipants.length),
          match_number: matchNumber++,
          player1_id: firstPlaceTeams[i].participant.id,
          player2_id: secondPlaceTeams[secondIndex].participant.id,
          match_status: 'scheduled',
          status: 'programmata',
          scheduled_at: null,
          player1_score: 0,
          player2_score: 0,
          winner_id: null,
          stage: 'eliminazione',
          bracket_position: matchNumber - 1
        });
      }
    }

    // Generate subsequent rounds (empty, will be populated as matches complete)
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round);
      const roundParticipants = bracketSize / Math.pow(2, round - 1);
      
      for (let i = 0; i < matchesInRound; i++) {
        bracketMatches.push({
          tournament_id: tournamentId,
          phase: 'eliminazione',
          round_number: round,
          round_name: getRoundName(roundParticipants),
          match_number: matchNumber++,
          player1_id: null,
          player2_id: null,
          match_status: 'pending',
          status: 'programmata',
          scheduled_at: null,
          player1_score: 0,
          player2_score: 0,
          winner_id: null,
          stage: 'eliminazione',
          bracket_position: matchNumber - 1
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
      .update({ 
        current_phase: 'eliminazione',
        status: 'In Corso'
      })
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
