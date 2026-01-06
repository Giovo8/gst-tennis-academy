'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Calendar, RefreshCw, Users } from 'lucide-react';
import BracketMatchCard from './BracketMatchCard';
import { getAvatarUrl } from '@/lib/utils';

interface Participant {
  id: string;
  user_id: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface Match {
  id: string;
  round_name?: string;
  round_number: number;
  match_number: number;
  player1?: Participant;
  player2?: Participant;
  player1_id: string;
  player2_id: string;
  sets?: Array<{ player1_score: number; player2_score: number }>;
  winner_id?: string;
  status: string;
  scheduled_at?: string;
}

interface Standing {
  participant: Participant;
  position: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesDrawn: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  setsDiff: number;
  gamesWon: number;
  gamesLost: number;
  gamesDiff: number;
  points: number;
}

type TabType = 'participants' | 'calendar' | 'standings';

interface ChampionshipStandingsViewProps {
  tournamentId: string;
  participants: Participant[];
  bestOf: number;
  onMatchUpdate?: () => void;
  isAdmin?: boolean;
}

export default function ChampionshipStandingsView({
  tournamentId,
  participants,
  bestOf = 3,
  onMatchUpdate,
  isAdmin = false
}: ChampionshipStandingsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('participants');
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadMatches();
  }, [tournamentId]);

  useEffect(() => {
    if (matches.length > 0) {
      calculateStandings();
    }
  }, [matches, participants]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const { supabase } = await import('@/lib/supabase/client');

      // Carica i match con i participant IDs
      const { data, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;

      // Crea una mappa dei participants per ID
      const participantsMap = new Map();
      participants.forEach(p => {
        participantsMap.set(p.id, p);
      });

      // Arricchisci i match con i dati dei partecipanti
      const enrichedMatches = (data || []).map((match: any) => ({
        ...match,
        player1: participantsMap.get(match.player1_id),
        player2: participantsMap.get(match.player2_id)
      }));

      setMatches(enrichedMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStandings = () => {
    const standingsMap = new Map<string, Standing>();

    // Initialize standings for all participants
    participants.forEach(participant => {
      standingsMap.set(participant.id, {
        participant,
        position: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesDrawn: 0,
        matchesLost: 0,
        setsWon: 0,
        setsLost: 0,
        setsDiff: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesDiff: 0,
        points: 0
      });
    });

    // Calculate stats from completed matches
    matches
      .filter(m => m.status === 'completata' && m.winner_id)
      .forEach(match => {
        const player1Stats = standingsMap.get(match.player1_id);
        const player2Stats = standingsMap.get(match.player2_id);

        if (!player1Stats || !player2Stats) return;

        // Update matches played
        player1Stats.matchesPlayed++;
        player2Stats.matchesPlayed++;

        // Count sets and games from match sets
        const sets = match.sets || [];
        sets.forEach(set => {
          player1Stats.setsWon += set.player1_score > set.player2_score ? 1 : 0;
          player1Stats.setsLost += set.player1_score < set.player2_score ? 1 : 0;
          player1Stats.gamesWon += set.player1_score;
          player1Stats.gamesLost += set.player2_score;

          player2Stats.setsWon += set.player2_score > set.player1_score ? 1 : 0;
          player2Stats.setsLost += set.player2_score < set.player1_score ? 1 : 0;
          player2Stats.gamesWon += set.player2_score;
          player2Stats.gamesLost += set.player1_score;
        });

        // Update win/loss and points
        if (match.winner_id === match.player1_id) {
          player1Stats.matchesWon++;
          player1Stats.points += 2; // 2 points for win
          player2Stats.matchesLost++;
        } else if (match.winner_id === match.player2_id) {
          player2Stats.matchesWon++;
          player2Stats.points += 2;
          player1Stats.matchesLost++;
        }
      });

    // Calculate differentials
    standingsMap.forEach(standing => {
      standing.setsDiff = standing.setsWon - standing.setsLost;
      standing.gamesDiff = standing.gamesWon - standing.gamesLost;
    });

    // Sort standings
    const sortedStandings = Array.from(standingsMap.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
      return b.gamesDiff - a.gamesDiff;
    });

    // Assign positions
    sortedStandings.forEach((standing, index) => {
      standing.position = index + 1;
    });

    setStandings(sortedStandings);
  };

  const handleGenerateChampionship = async () => {
    if (!confirm('Sei sicuro di voler generare il calendario del campionato?')) {
      return;
    }

    setGenerating(true);
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Non autenticato');
      }

      const res = await fetch(`/api/tournaments/${tournamentId}/generate-championship`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Calendario generato con successo!');
        await loadMatches();
        if (onMatchUpdate) onMatchUpdate();
      } else {
        alert(data.error || 'Errore nella generazione del calendario');
      }
    } catch (error) {
      console.error('Error generating championship:', error);
      alert('Errore nella generazione del calendario');
    } finally {
      setGenerating(false);
    }
  };

  const handleScoreSubmit = async (matchId: string, sets: Array<{ player1_score: number; player2_score: number }>) => {
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Non autenticato');
      }

      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ sets })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Errore nell\'aggiornamento del punteggio');
      }

      await loadMatches();
      if (onMatchUpdate) onMatchUpdate();
    } catch (error) {
      console.error('Error updating match:', error);
      throw error;
    }
  };

  const getRounds = () => {
    const rounds = new Set<number>();
    matches.forEach(m => {
      if (m.round_number) rounds.add(m.round_number);
    });
    return Array.from(rounds).sort((a, b) => a - b);
  };

  const rounds = getRounds();
  const filteredMatches = selectedRound
    ? matches.filter(m => m.round_number === selectedRound)
    : matches;

  if (matches.length === 0 && !loading) {
    return (
      <div className="rounded-md border border-gray-200 bg-white p-6 text-center">
        <Calendar className="mx-auto h-12 w-12 text-secondary/40 mb-4" />
        <h3 className="text-lg font-semibold text-secondary mb-2">Calendario non ancora generato</h3>
        <p className="text-sm text-secondary/70 mb-6">
          Genera il calendario per iniziare il campionato.
        </p>
        {isAdmin && (
          <button
            onClick={handleGenerateChampionship}
            disabled={generating}
            className="rounded-md bg-secondary px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generazione...' : 'Genera Calendario'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-100">
        <button
          onClick={() => setActiveTab('participants')}
          className={`px-4 py-3 text-sm font-semibold transition-all relative ${
            activeTab === 'participants'
              ? 'text-secondary'
              : 'text-secondary/70 hover:text-secondary'
          }`}
        >
          <Users className="h-4 w-4 inline-block mr-2" />
          Partecipanti
          {activeTab === 'participants' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-3 text-sm font-semibold transition-all relative ${
            activeTab === 'calendar'
              ? 'text-secondary'
              : 'text-secondary/70 hover:text-secondary'
          }`}
        >
          <Calendar className="h-4 w-4 inline-block mr-2" />
          Calendario
          {activeTab === 'calendar' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('standings')}
          className={`px-4 py-3 text-sm font-semibold transition-all relative ${
            activeTab === 'standings'
              ? 'text-secondary'
              : 'text-secondary/70 hover:text-secondary'
          }`}
        >
          <Trophy className="h-4 w-4 inline-block mr-2" />
          Classifica
          {activeTab === 'standings' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'participants' && (
        <div className="space-y-3">
          {participants.length === 0 ? (
            <div className="bg-white rounded-md p-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-secondary/20" />
              <h3 className="text-xl font-semibold text-secondary mb-2">Nessun partecipante</h3>
              <p className="text-secondary/60">Nessun atleta iscritto al momento</p>
            </div>
          ) : (
            <>
              {/* Header Row */}
              <div className="bg-secondary/[0.03] rounded-md px-5 py-3 border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 text-center">
                    <div className="text-xs font-bold text-secondary/60 uppercase">#</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-secondary/60 uppercase">Atleta</div>
                  </div>
                  <div className="w-48 hidden sm:block">
                    <div className="text-xs font-bold text-secondary/60 uppercase">Email</div>
                  </div>
                </div>
              </div>

              {/* Data Rows */}
              {participants.map((participant: any, index: number) => (
                <div
                  key={participant.id}
                  className="bg-white rounded-md p-5 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    {/* Position */}
                    <div className="w-12 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary/10 text-secondary font-bold text-sm">
                        {index + 1}
                      </span>
                    </div>

                    {/* Player Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-secondary truncate">
                          {participant.profiles?.full_name || 'Sconosciuto'}
                        </div>
                        <div className="text-sm text-secondary/60 truncate sm:hidden">
                          {participant.profiles?.email || participant.user_id}
                        </div>
                      </div>
                    </div>

                    {/* Email (hidden on mobile) */}
                    <div className="w-48 hidden sm:block">
                      <div className="text-sm text-secondary/70 truncate">
                        {participant.profiles?.email || participant.user_id}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Round selector */}
          {rounds.length > 0 && (
            <div className="bg-white rounded-md p-5">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                <button
                  onClick={() => setSelectedRound(null)}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
                    selectedRound === null
                      ? 'bg-secondary text-white'
                      : 'bg-white border border-gray-200 text-secondary/70 hover:bg-secondary/5'
                  }`}
                >
                  Tutte
                </button>
                {rounds.map(round => (
                  <button
                    key={round}
                    onClick={() => setSelectedRound(round)}
                    className={`rounded-md px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
                      selectedRound === round
                        ? 'bg-secondary text-white'
                        : 'bg-white border border-gray-200 text-secondary/70 hover:bg-secondary/5'
                    }`}
                  >
                    Giornata {round}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-md p-12 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="bg-white rounded-md p-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-secondary/20" />
              <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna partita</h3>
              <p className="text-secondary/60">Nessuna partita trovata per questa giornata</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMatches.map(match => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  isAdmin={isAdmin}
                  bestOf={bestOf}
                  onScoreSubmit={handleScoreSubmit}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'standings' && (
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-md p-12 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
            </div>
          ) : standings.length === 0 ? (
            <div className="bg-white rounded-md p-12 text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-secondary/20" />
              <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna classifica</h3>
              <p className="text-secondary/60">Completa alcune partite per vedere la classifica</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header Row */}
              <div className="bg-secondary/[0.03] rounded-md px-5 py-3 border border-gray-200">
                <div className="grid grid-cols-[50px_1fr_80px_80px_100px_100px] gap-4 items-center">
                  <div className="text-xs font-bold text-secondary/60 uppercase text-center">Pos</div>
                  <div className="text-xs font-bold text-secondary/60 uppercase">Atleta</div>
                  <div className="text-xs font-bold text-secondary/60 uppercase text-center">PG</div>
                  <div className="text-xs font-bold text-secondary/60 uppercase text-center">Punti</div>
                  <div className="text-xs font-bold text-secondary/60 uppercase text-center">Diff. Set</div>
                  <div className="text-xs font-bold text-secondary/60 uppercase text-center">Diff. Game</div>
                </div>
              </div>


              {standings.map((standing) => (
                <div
                  key={standing.participant.id}
                  className="bg-white rounded-md p-5 hover:shadow-md transition-all"
                >
                  <div className="grid grid-cols-[50px_1fr_80px_80px_100px_100px] gap-4 items-center">
                    <div className="flex items-center justify-center">
                      <span className={`font-bold text-sm ${
                        standing.position === 1 ? 'text-yellow-500' :
                        standing.position === 2 ? 'text-gray-400' :
                        standing.position === 3 ? 'text-amber-600' :
                        'text-secondary'
                      }`}>
                        {standing.position}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="font-bold text-secondary">
                        {standing.participant.profiles?.full_name || 'Sconosciuto'}
                      </div>
                    </div>

                    <div className="text-center text-secondary font-semibold">{standing.matchesPlayed}</div>
                    <div className="text-center text-lg font-semibold text-secondary">{standing.points}</div>
                    <div className="text-center text-secondary font-semibold">
                      <span className={standing.setsDiff > 0 ? 'text-emerald-600' : standing.setsDiff < 0 ? 'text-red-600' : 'text-secondary/60'}>
                        {standing.setsDiff > 0 ? '+' : ''}{standing.setsDiff}
                      </span>
                    </div>
                    <div className="text-center text-secondary font-semibold">
                      <span className={standing.gamesDiff > 0 ? 'text-emerald-600' : standing.gamesDiff < 0 ? 'text-red-600' : 'text-secondary/60'}>
                        {standing.gamesDiff > 0 ? '+' : ''}{standing.gamesDiff}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
