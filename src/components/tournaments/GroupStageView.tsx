'use client';

import React, { useEffect, useState } from 'react';
import { Users, Trophy, TrendingUp, RefreshCw, Target, Calendar } from 'lucide-react';
import BracketMatchCard from './BracketMatchCard';

type TabType = 'participants' | 'standings' | 'matches';

interface Participant {
  id: string;
  user_id: string;
  group_id?: string;
  group_position?: number;
  profiles?: any;
  stats?: {
    matches_played: number;
    matches_won: number;
    matches_lost: number;
    sets_won: number;
    sets_lost: number;
    games_won: number;
    games_lost: number;
    points: number;
  };
}

interface Group {
  id: string;
  group_name: string;
  group_order: number;
}

interface Match {
  id: string;
  round_name: string;
  match_number: number;
  player1?: Participant;
  player2?: Participant;
  player1_score: number;
  player2_score: number;
  sets?: Array<{ player1_score: number; player2_score: number }>;
  winner_id?: string;
  match_status: string;
  status: string;
  scheduled_at?: string;
  group_id?: string;
}

interface GroupStageViewProps {
  tournamentId: string;
  groups: Group[];
  participants: Participant[];
  bestOf: number;
  teamsAdvancing: number;
  onMatchUpdate?: () => void;
  isAdmin?: boolean;
}

export default function GroupStageView({
  tournamentId,
  groups,
  participants,
  bestOf = 3,
  teamsAdvancing,
  onMatchUpdate,
  isAdmin = false
}: GroupStageViewProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('participants');

  useEffect(() => {
    if (groups.length > 0) {
      setSelectedGroup(groups[0].id);
    }
  }, [groups]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupMatches(selectedGroup);
    }
  }, [selectedGroup, tournamentId]);

  const loadGroupMatches = async (groupId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/group-matches?group_id=${groupId}`);
      const data = await res.json();
      if (res.ok) {
        setMatches(data.matches || []);
      }
    } catch (error) {
      console.error('Error loading group matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateGroups = async () => {
    if (!confirm('Sei sicuro di voler generare i gironi e i match? Questa operazione non può essere annullata.')) {
      return;
    }

    setGenerating(true);
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Sessione non valida');
        return;
      }

      const res = await fetch(`/api/tournaments/${tournamentId}/generate-groups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Gironi generati con successo!');
        // Reload the page or update groups
        if (onMatchUpdate) onMatchUpdate();
        window.location.reload();
      } else {
        alert(data.error || 'Errore nella generazione dei gironi');
      }
    } catch (error) {
      console.error('Error generating groups:', error);
      alert('Errore nella generazione dei gironi');
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

      if (selectedGroup) {
        await loadGroupMatches(selectedGroup);
      }
      if (onMatchUpdate) onMatchUpdate();
    } catch (error) {
      console.error('Error updating match:', error);
      throw error;
    }
  };

  const handleAdvanceToKnockout = async () => {
    if (!confirm('Sei sicuro di voler far avanzare le prime squadre di ogni girone alla fase eliminatoria?')) {
      return;
    }

    setAdvancing(true);
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Non autenticato');
      }

      const res = await fetch(`/api/tournaments/${tournamentId}/advance-from-groups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Partecipanti avanzati alla fase eliminatoria!');
        // Reload the page to show knockout phase
        window.location.reload();
      } else {
        alert(data.error || 'Errore nell\'avanzamento alla fase eliminatoria');
      }
    } catch (error) {
      console.error('Error advancing to knockout:', error);
      alert('Errore nell\'avanzamento alla fase eliminatoria');
    } finally {
      setAdvancing(false);
    }
  };

  const getGroupStandings = (groupId: string): Participant[] => {
    const groupParticipants = participants.filter(p => p.group_id === groupId);
    
    return groupParticipants.sort((a, b) => {
      const aStats = a.stats || { points: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 };
      const bStats = b.stats || { points: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 };
      
      // Ordina per: 1) Punti, 2) Differenza set, 3) Differenza games
      if (aStats.points !== bStats.points) {
        return bStats.points - aStats.points;
      }
      
      const aSetDiff = aStats.sets_won - aStats.sets_lost;
      const bSetDiff = bStats.sets_won - bStats.sets_lost;
      if (aSetDiff !== bSetDiff) {
        return bSetDiff - aSetDiff;
      }
      
      const aGameDiff = aStats.games_won - aStats.games_lost;
      const bGameDiff = bStats.games_won - bStats.games_lost;
      return bGameDiff - aGameDiff;
    });
  };

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Gironi non ancora generati</h3>
        <p className="text-sm text-gray-600 mb-6">
          Genera i gironi per iniziare la fase a gruppi del torneo.
        </p>
        {isAdmin && (
          <button
            onClick={handleGenerateGroups}
            disabled={generating}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generazione...' : 'Genera Gironi'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Actions */}
      {isAdmin && (
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleAdvanceToKnockout}
            disabled={advancing}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Trophy className={`h-4 w-4 ${advancing ? 'animate-pulse' : ''}`} />
            {advancing ? 'Avanzamento...' : 'Avanza alla Fase Eliminatoria'}
          </button>
        </div>
      )}

      {/* Tab principale: Partecipanti, Classifica, Calendario */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('participants')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors relative ${
            activeTab === 'participants'
              ? 'text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="h-4 w-4" />
          Partecipanti ({participants.length})
          {activeTab === 'participants' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('standings')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors relative ${
            activeTab === 'standings'
              ? 'text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Trophy className="h-4 w-4" />
          Classifica
          {activeTab === 'standings' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors relative ${
            activeTab === 'matches'
              ? 'text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Calendario
          {activeTab === 'matches' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      </div>

      {/* Tab Partecipanti */}
      {activeTab === 'participants' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Tutti i Partecipanti
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-center gap-3"
              >
                {participant.profiles?.avatar_url && (
                  <img
                    src={participant.profiles.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {participant.profiles?.full_name || 'Sconosciuto'}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {participant.profiles?.email || participant.user_id}
                  </div>
                  {participant.group_id && (
                    <div className="text-xs text-blue-600 mt-1 font-medium">
                      {groups.find(g => g.id === participant.group_id)?.group_name || 'Girone'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Classifica e Calendario (per girone) */}
      {(activeTab === 'standings' || activeTab === 'matches') && (
        <>
          {/* Tab gironi */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
                  selectedGroup === group.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {group.group_name}
              </button>
            ))}
          </div>

          {selectedGroup && activeTab === 'standings' && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-blue-600" />
                  Classifica
                </h4>
                <span className="text-xs text-gray-600">
                  Top {teamsAdvancing} qualificati
                </span>
              </div>

              <div className="space-y-2">
                {getGroupStandings(selectedGroup).map((participant, index) => {
                  const stats = participant.stats || {
                    matches_played: 0,
                    matches_won: 0,
                    matches_lost: 0,
                    sets_won: 0,
                    sets_lost: 0,
                    points: 0
                  };
                  const isQualified = index < teamsAdvancing;

                  return (
                    <div
                      key={participant.id}
                      className={`flex items-center gap-3 rounded-lg p-3 ${
                        isQualified
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                        isQualified ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {participant.profiles?.full_name || 'Sconosciuto'}
                        </div>
                        <div className="text-xs text-gray-600">
                          {stats.matches_played} partite • {stats.matches_won}V - {stats.matches_lost}S
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{stats.points}</div>
                        <div className="text-xs text-gray-600">punti</div>
                      </div>
                      
                      <div className="text-right hidden sm:block">
                        <div className="text-sm text-gray-900">
                          {stats.sets_won - stats.sets_lost > 0 ? '+' : ''}
                          {stats.sets_won - stats.sets_lost}
                        </div>
                        <div className="text-xs text-gray-600">diff. set</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedGroup && activeTab === 'matches' && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Partite</h4>

              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                </div>
              ) : matches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted">Nessuna partita generata per questo girone</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map(match => (
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
        </>
      )}
    </div>
  );
}
