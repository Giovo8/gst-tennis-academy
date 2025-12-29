import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';

export async function GET() {
  try {
    const supabase = supabaseServer;

    // Get all tournaments with participants
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select(`
        *,
        participants:tournament_participants(
          id,
          user_id,
          status,
          profiles(id, full_name, avatar_url)
        )
      `);

    if (tournamentsError) {
      console.error('Error fetching tournaments:', tournamentsError);
      return NextResponse.json(
        { error: 'Errore nel recupero dei tornei' },
        { status: 500 }
      );
    }

    // Get all matches
    const { data: matches, error: matchesError } = await supabase
      .from('tournament_matches')
      .select('*');

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return NextResponse.json(
        { error: 'Errore nel recupero dei match' },
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

    // Get all participants with their user info
    const { data: allParticipants } = await supabase
      .from('tournament_participants')
      .select('*, profiles(id, full_name, avatar_url)');

    // Initialize player stats
    allParticipants?.forEach(participant => {
      if (!playerStats.has(participant.user_id)) {
        playerStats.set(participant.user_id, {
          player_id: participant.user_id,
          player_name: participant.profiles?.full_name || 'Unknown',
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
    tournaments?.forEach(tournament => {
      tournament.participants?.forEach((p: any) => {
        const stats = playerStats.get(p.user_id);
        if (stats) {
          stats.tournaments_played++;
        }
      });
    });

    // Process matches for statistics
    matches?.forEach(match => {
      if (match.status !== 'completed' || !match.winner_id) return;

      const player1Stats = allParticipants?.find(p => p.id === match.player1_id);
      const player2Stats = allParticipants?.find(p => p.id === match.player2_id);

      if (!player1Stats || !player2Stats) return;

      const p1 = playerStats.get(player1Stats.user_id);
      const p2 = playerStats.get(player2Stats.user_id);

      if (!p1 || !p2) return;

      // Update matches played
      p1.matches_played++;
      p2.matches_played++;

      // Update matches won/lost
      if (match.winner_id === match.player1_id) {
        p1.matches_won++;
        p2.matches_lost++;
      } else {
        p2.matches_won++;
        p1.matches_lost++;
      }

      // Count sets and games
      const sets = match.sets || [];
      sets.forEach((set: any) => {
        p1.games_won += set.player1_score || 0;
        p1.games_lost += set.player2_score || 0;
        p2.games_won += set.player2_score || 0;
        p2.games_lost += set.player1_score || 0;

        if (set.player1_score > set.player2_score) {
          p1.sets_won++;
          p2.sets_lost++;
        } else {
          p2.sets_won++;
          p1.sets_lost++;
        }
      });
    });

    // Calculate win rates and tournament wins
    playerStats.forEach(stats => {
      if (stats.matches_played > 0) {
        stats.win_rate = (stats.matches_won / stats.matches_played) * 100;
      }

      // Count tournament wins
      tournaments?.forEach(tournament => {
        if (tournament.status === 'Completato' || tournament.status === 'Concluso') {
          // Find winner from completed matches
          const tournamentMatches = matches?.filter(m => m.tournament_id === tournament.id && m.status === 'completed');
          const finalMatch = tournamentMatches?.find(m => m.round?.includes('final') || m.round === 'finale');
          
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
      const completedMatches = tournamentMatches.filter(m => m.status === 'completed');
      
      return {
        id: tournament.id,
        title: tournament.title,
        tournament_type: tournament.tournament_type,
        status: tournament.status,
        start_date: tournament.start_date,
        participants_count: tournament.participants?.length || 0,
        matches_total: tournamentMatches.length,
        matches_completed: completedMatches.length,
        completion_rate: tournamentMatches.length > 0 
          ? (completedMatches.length / tournamentMatches.length) * 100 
          : 0
      };
    });

    // Overall statistics
    const totalMatches = matches?.length || 0;
    const completedMatches = matches?.filter(m => m.status === 'completed').length || 0;
    const totalSets = matches?.reduce((sum, m) => sum + (m.sets?.length || 0), 0) || 0;
    
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

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
