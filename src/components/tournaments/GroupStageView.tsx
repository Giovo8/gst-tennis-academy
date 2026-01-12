'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, Trophy, TrendingUp, RefreshCw, Target, Calendar } from 'lucide-react';
import BracketMatchCard from './BracketMatchCard';
import { getAvatarUrl } from '@/lib/utils';

type TabType = 'participants' | 'standings' | 'matches';

interface Participant {
  id: string;
  user_id: string;
  group_id?: string;
  group_position?: number;
  seed?: number;
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
  const [activeTab, setActiveTab] = useState<TabType>('standings');

  const groupOrder = useMemo(() => {
    const order = new Map<string, number>();
    groups.forEach((group) => order.set(group.id, group.group_order ?? 0));
    return order;
  }, [groups]);

  const participantsSorted = useMemo(() => {
    return [...participants].sort((a, b) => {
      const nameA = (a.profiles?.full_name || a.user_id || '').toLowerCase();
      const nameB = (b.profiles?.full_name || b.user_id || '').toLowerCase();
      const groupA = a.group_id ? groupOrder.get(a.group_id) ?? 999 : 999;
      const groupB = b.group_id ? groupOrder.get(b.group_id) ?? 999 : 999;
      if (groupA !== groupB) return groupA - groupB;
      if ((a.group_position ?? 9999) !== (b.group_position ?? 9999)) {
        return (a.group_position ?? 9999) - (b.group_position ?? 9999);
      }
      return nameA.localeCompare(nameB);
    });
  }, [participants, groupOrder]);

  const getGroupName = (groupId?: string) => {
    if (!groupId) return null;
    return groups.find((g) => g.id === groupId)?.group_name || null;
  };

  const getInitials = (fullName?: string) => {
    if (!fullName) return '??';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '??';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

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
      <div className="rounded-md border border-gray-200 bg-white p-6 text-center">
        <Target className="mx-auto h-12 w-12 text-secondary/40 mb-4" />
        <h3 className="text-lg font-semibold text-secondary mb-2">Gironi non ancora generati</h3>
        <p className="text-sm text-secondary/70 mb-6">
          Genera i gironi per iniziare la fase a gruppi del torneo.
        </p>
        {isAdmin && (
          <button
            onClick={handleGenerateGroups}
            disabled={generating}
            className="rounded-md bg-secondary px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2 shadow-sm"
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

      {/* Selezione Girone */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 overflow-x-auto">
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
                selectedGroup === group.id
                  ? 'bg-secondary text-white'
                  : 'bg-white border border-gray-200 text-secondary/80 hover:bg-secondary/5'
              }`}
            >
              {group.group_name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('standings')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
              activeTab === 'standings'
                ? 'border border-secondary bg-secondary text-white'
                : 'border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary'
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span className="text-sm font-medium">Classifica</span>
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
              activeTab === 'matches'
                ? 'border border-secondary bg-secondary text-white'
                : 'border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Calendario</span>
          </button>
        </div>
      </div>

      {activeTab === 'participants' && (
        <div className="space-y-3">
          {participants.map((participant, index) => {
            const fullName = participant.profiles?.full_name || 'Sconosciuto';
            const avatarUrl = participant.profiles?.avatar_url;
            const initials = fullName
              .split(' ')
              .filter((part: string) => part.length > 0)
              .slice(0, 2)
              .map((part: string) => part[0]?.toUpperCase())
              .join('');

            return (
              <div
                key={participant.id}
                className="bg-white rounded-md px-5 py-4 hover:shadow-md transition-all border-l-4 border-secondary"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{initials || 'U'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-secondary truncate">
                      {fullName}
                    </div>
                    <div className="text-xs text-secondary/60 truncate mt-0.5">
                      {participant.profiles?.email || participant.user_id}
                    </div>
                    {participant.group_id && (
                      <div className="text-xs text-secondary/70 mt-1 font-medium">
                        {groups.find(g => g.id === participant.group_id)?.group_name || 'Girone'}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md font-medium whitespace-nowrap transition-colors"
                      onClick={() => {
                        if (confirm(`Rimuovere ${fullName} dal torneo?`)) {
                          alert('Funzione rimozione partecipante da collegare (admin).');
                        }
                      }}
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Classifica per girone */}
      {activeTab === 'standings' && selectedGroup && (
        <div className="space-y-4">{/* Header */}
              <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
                <div className="grid grid-cols-[50px_40px_1fr_80px_100px_100px] gap-4 items-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Pos</div>
                  <div className="text-xs font-bold text-white/80 uppercase"></div>
                  <div className="text-xs font-bold text-white/80 uppercase">Atleta</div>
                  <div className="text-xs font-bold text-white/80 uppercase text-center">PG</div>
                  <div className="text-xs font-bold text-white/80 uppercase text-center">Punti</div>
                  <div className="text-xs font-bold text-white/80 uppercase text-center">Diff. Set</div>
                </div>
              </div>

              {/* Data Rows */}
              <div className="space-y-2">
                {getGroupStandings(selectedGroup).map((participant, index) => {
                  const stats = participant.stats || {
                    matches_played: 0,
                    matches_won: 0,
                    matches_lost: 0,
                    sets_won: 0,
                    sets_lost: 0,
                    games_won: 0,
                    games_lost: 0,
                    points: 0
                  };
                  const isQualified = index < teamsAdvancing;
                  const avatarUrl = participant.profiles?.avatar_url;
                  const fullName = participant.profiles?.full_name || 'Sconosciuto';
                  const initials = fullName
                    .split(' ')
                    .filter((part: string) => part.length > 0)
                    .slice(0, 2)
                    .map((part: string) => part[0]?.toUpperCase())
                    .join('');

                  let borderLeftColor = '#0f4c7c'; // secondary default
                  if (isQualified) {
                    if (index === 0) borderLeftColor = '#eab308'; // oro
                    else if (index === 1) borderLeftColor = '#9ca3af'; // argento
                    else if (index === 2) borderLeftColor = '#f97316'; // bronzo
                  }

                  return (
                    <div
                      key={participant.id}
                      className="bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 transition-all border-l-4"
                      style={{ borderLeftColor }}
                    >
                      <div className="grid grid-cols-[50px_40px_1fr_80px_100px_100px] gap-4 items-center">
                        <div className="text-lg font-bold text-secondary text-center">
                          {index + 1}
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{initials || 'U'}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-secondary">{fullName}</div>
                          <div className="text-xs text-secondary/60 mt-0.5">
                            {stats.matches_won}V - {stats.matches_lost}S
                          </div>
                        </div>
                        <div className="text-center font-semibold text-secondary">
                          {stats.matches_played}
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg text-secondary">{stats.points}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-secondary">
                            {stats.sets_won - stats.sets_lost > 0 ? '+' : ''}
                            {stats.sets_won - stats.sets_lost}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

      {/* Calendario partite per girone */}
      {activeTab === 'matches' && selectedGroup && (
        <div className="space-y-4">{loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
                </div>
              ) : matches.length === 0 ? (
                <div className="rounded-md border border-gray-200 bg-white p-8 text-center">
                  <p className="text-sm text-secondary/70">Nessuna partita generata per questo girone</p>
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
    </div>
  );
}
