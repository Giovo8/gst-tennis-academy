import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';

export async function GET() {
  try {
    const supabase = supabaseServer;

    // Get all tournaments
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('*');

    if (tournamentsError) {
      console.error('Error fetching tournaments:', tournamentsError);
      return NextResponse.json(
        { error: 'Errore nel recupero dei tornei', details: tournamentsError.message },
        { status: 500 }
      );
    }

    // Get all participants
    const { data: allParticipants, error: participantsError } = await supabase
      .from('tournament_participants')
      .select('*');

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return NextResponse.json(
        { error: 'Errore nel recupero dei partecipanti', details: participantsError.message },
        { status: 500 }
      );
    }

    // Get all profiles for participants
    const userIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a map of profiles for quick lookup
    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Get all matches
    const { data: matches, error: matchesError } = await supabase
      .from('tournament_matches')
      .select('*');

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return NextResponse.json(
        { error: 'Errore nel recupero dei match', details: matchesError.message },
        { status: 500 }
      );
    }

    // Calculate player statistics
    const playerStats = new Map<string, {
      player_id: string;
      player_name: string;
      tournaments_played: number;
      tournaments_won: number;
      matches_played: number;
      matches_won: number;
      matches_lost: number;
      sets_won: number;
      sets_lost: number;
      games_won: number;
      games_lost: number;
      win_rate: number;
    }>();

    // Initialize player stats from participants
    allParticipants?.forEach((participant: any) => {
      if (!playerStats.has(participant.user_id)) {
        const profile: any = profilesMap.get(participant.user_id);
        playerStats.set(participant.user_id, {
          player_id: participant.user_id,
          player_name: profile?.full_name || 'Sconosciuto',
          tournaments_played: 0,
          tournaments_won: 0,
          matches_played: 0,
          matches_won: 0,
          matches_lost: 0,
          sets_won: 0,
          sets_lost: 0,
          games_won: 0,
          games_lost: 0,
          win_rate: 0
        });
      }
    });

    // Count tournaments per player
    const tournamentsPerPlayer = new Map<string, Set<string>>();
    allParticipants?.forEach(participant => {
      if (!tournamentsPerPlayer.has(participant.user_id)) {
        tournamentsPerPlayer.set(participant.user_id, new Set());
      }
      tournamentsPerPlayer.get(participant.user_id)?.add(participant.tournament_id);
    });

    tournamentsPerPlayer.forEach((tournamentIds, userId) => {
      const stats = playerStats.get(userId);
      if (stats) {
        stats.tournaments_played = tournamentIds.size;
      }
    });

    // Process matches for statistics
    matches?.forEach(match => {
      // Check if match is completed (can be 'completed' or 'completata')
      if ((match.status !== 'completed' && match.status !== 'completata' && match.match_status !== 'completata') || !match.winner_id) return;

      const player1Participant = allParticipants?.find(p => p.id === match.player1_id);
      const player2Participant = allParticipants?.find(p => p.id === match.player2_id);

      if (!player1Participant || !player2Participant) return;

      const p1 = playerStats.get(player1Participant.user_id);
      const p2 = playerStats.get(player2Participant.user_id);

      if (!p1 || !p2) return;

      // Update matches played
      p1.matches_played++;
      p2.matches_played++;

      // Update matches won/lost
      if (match.winner_id === match.player1_id) {
        p1.matches_won++;
        p2.matches_lost++;
      } else if (match.winner_id === match.player2_id) {
        p2.matches_won++;
        p1.matches_lost++;
      }

      // Count sets and games
      const sets = match.sets || [];
      if (Array.isArray(sets)) {
        sets.forEach((set: any) => {
          const p1Score = set.player1_score || 0;
          const p2Score = set.player2_score || 0;
          
          p1.games_won += p1Score;
          p1.games_lost += p2Score;
          p2.games_won += p2Score;
          p2.games_lost += p1Score;

          if (p1Score > p2Score) {
            p1.sets_won++;
            p2.sets_lost++;
          } else if (p2Score > p1Score) {
            p2.sets_won++;
            p1.sets_lost++;
          }
        });
      }
    });

    // Calculate win rates and tournament wins
    playerStats.forEach(stats => {
      if (stats.matches_played > 0) {
        stats.win_rate = (stats.matches_won / stats.matches_played) * 100;
      }

      // Count tournament wins
      tournaments?.forEach(tournament => {
        if (tournament.status === 'Completato' || tournament.status === 'Concluso') {
          // Find winner from completed matches - look for final matches
          const tournamentMatches = matches?.filter(m => m.tournament_id === tournament.id && 
            (m.status === 'completed' || m.status === 'completata' || m.match_status === 'completata'));
          
          // Try to find final match
          const finalMatch = tournamentMatches?.find(m => {
            const roundName = (m.round_name || m.round || '').toLowerCase();
            return roundName.includes('final') || roundName.includes('finale');
          });
          
          if (finalMatch && finalMatch.winner_id) {
            const winnerParticipant = allParticipants?.find(p => p.id === finalMatch.winner_id);
            if (winnerParticipant && winnerParticipant.user_id === stats.player_id) {
              stats.tournaments_won++;
            }
          }
        }
      });
    });

    // Convert to array and sort by win rate
    const rankedPlayers = Array.from(playerStats.values())
      .filter(p => p.matches_played > 0)
      .sort((a, b) => {
        // Sort by tournaments won first, then win rate, then matches won
        if (b.tournaments_won !== a.tournaments_won) {
          return b.tournaments_won - a.tournaments_won;
        }
        if (b.win_rate !== a.win_rate) {
          return b.win_rate - a.win_rate;
        }
        return b.matches_won - a.matches_won;
      });

    // Tournament statistics
    const tournamentStats = tournaments?.map(tournament => {
      const tournamentMatches = matches?.filter(m => m.tournament_id === tournament.id) || [];
      const completedMatches = tournamentMatches.filter(m => 
        m.status === 'completed' || m.status === 'completata' || m.match_status === 'completata'
      );
      const tournamentParticipants = allParticipants?.filter(p => p.tournament_id === tournament.id) || [];
      
      return {
        id: tournament.id,
        title: tournament.title,
        tournament_type: tournament.tournament_type,
        status: tournament.status,
        start_date: tournament.start_date,
        participants_count: tournamentParticipants.length,
        matches_total: tournamentMatches.length,
        matches_completed: completedMatches.length,
        completion_rate: tournamentMatches.length > 0 
          ? (completedMatches.length / tournamentMatches.length) * 100 
          : 0
      };
    }) || [];

    // Overall statistics
    const totalMatches = matches?.length || 0;
    const completedMatches = matches?.filter(m => 
      m.status === 'completed' || m.status === 'completata' || m.match_status === 'completata'
    ).length || 0;
    const totalSets = matches?.reduce((sum, m) => {
      const sets = m.sets || [];
      return sum + (Array.isArray(sets) ? sets.length : 0);
    }, 0) || 0;
    
    const report = {
      overview: {
        total_tournaments: tournaments?.length || 0,
        active_tournaments: tournaments?.filter(t => t.status === 'In Corso' || t.status === 'In corso').length || 0,
        completed_tournaments: tournaments?.filter(t => t.status === 'Completato' || t.status === 'Concluso').length || 0,
        total_players: playerStats.size,
        active_players: rankedPlayers.length,
        total_matches: totalMatches,
        completed_matches: completedMatches,
        total_sets: totalSets
      },
      player_rankings: rankedPlayers.slice(0, 50), // Top 50 players
      tournament_stats: tournamentStats,
      top_performers: {
        most_tournaments_won: rankedPlayers.slice(0, 5),
        highest_win_rate: [...rankedPlayers]
          .filter(p => p.matches_played >= 5)
          .sort((a, b) => b.win_rate - a.win_rate)
          .slice(0, 5),
        most_matches_played: [...rankedPlayers]
          .sort((a, b) => b.matches_played - a.matches_played)
          .slice(0, 5)
      }
    };

    return NextResponse.json({ report });

  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Errore interno del server', details: error?.message },
      { status: 500 }
    );
  }
}
