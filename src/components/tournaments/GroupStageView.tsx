'use client';

import React, { useEffect, useState } from 'react';
import { Users, Trophy, TrendingUp } from 'lucide-react';

interface Participant {
  id: string;
  user_id: string;
  group_id?: string;
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
  player1?: Participant;
  player2?: Participant;
  player1_score: number;
  player2_score: number;
  winner_id?: string;
  status: string;
  scheduled_at?: string;
}

interface GroupStageViewProps {
  tournamentId: string;
  groups: Group[];
  participants: Participant[];
  teamsAdvancing: number;
  onMatchUpdate?: () => void;
}

export default function GroupStageView({
  tournamentId,
  groups,
  participants,
  teamsAdvancing,
  onMatchUpdate
}: GroupStageViewProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (groups.length > 0) {
      setSelectedGroup(groups[0].id);
    }
  }, [groups]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupMatches(selectedGroup);
    }
  }, [selectedGroup]);

  const loadGroupMatches = async (groupId: string) => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/group-matches?group_id=${groupId}&phase=gironi`);
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

  const generateGroupMatches = async (groupId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Sessione non valida');
        return;
      }

      const res = await fetch(`/api/tournaments/${tournamentId}/group-matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ group_id: groupId })
      });

      const data = await res.json();
      
      if (res.ok) {
        alert(data.message || 'Partite generate!');
        loadGroupMatches(groupId);
      } else {
        alert(data.error || 'Errore nella generazione');
      }
    } catch (error) {
      console.error('Error generating matches:', error);
      alert('Errore nella generazione delle partite');
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
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <Users className="mx-auto h-12 w-12 text-muted mb-4" />
        <p className="text-sm text-muted">Nessun girone configurato</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab gironi */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {groups.map(group => (
          <button
            key={group.id}
            onClick={() => setSelectedGroup(group.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
              selectedGroup === group.id
                ? 'bg-accent text-white'
                : 'bg-surface border border-border text-muted hover:text-white'
            }`}
          >
            {group.group_name}
          </button>
        ))}
      </div>

      {selectedGroup && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Classifica */}
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" />
                Classifica
              </h4>
              <span className="text-xs text-muted">
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
                        ? 'bg-accent/10 border border-accent/30'
                        : 'bg-surface-lighter border border-border'
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                      isQualified ? 'bg-accent text-white' : 'bg-surface text-muted'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">
                        {participant.user_id}
                      </div>
                      <div className="text-xs text-muted">
                        {stats.matches_played} partite • {stats.matches_won}V - {stats.matches_lost}S
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-white">{stats.points}</div>
                      <div className="text-xs text-muted">punti</div>
                    </div>
                    
                    <div className="text-right hidden sm:block">
                      <div className="text-sm text-white">
                        {stats.sets_won - stats.sets_lost > 0 ? '+' : ''}
                        {stats.sets_won - stats.sets_lost}
                      </div>
                      <div className="text-xs text-muted">diff. set</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Partite */}
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-white">Partite</h4>
              {matches.length === 0 && (
                <button
                  onClick={() => generateGroupMatches(selectedGroup)}
                  className="text-xs rounded-lg bg-accent px-3 py-1.5 font-semibold text-white hover:bg-accent/90"
                >
                  Genera Partite
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted">Nessuna partita programmata</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {matches.map(match => (
                  <div
                    key={match.id}
                    className="rounded-lg border border-border bg-surface-lighter p-3"
                  >
                    <div className="text-xs text-muted mb-2">{match.round_name}</div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">
                          {match.player1?.user_id || 'TBD'}
                        </span>
                        {match.status === 'completata' && (
                          <span className={`text-sm font-bold ${
                            match.winner_id === match.player1?.id ? 'text-accent' : 'text-muted'
                          }`}>
                            {match.player1_score}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white">
                          {match.player2?.user_id || 'TBD'}
                        </span>
                        {match.status === 'completata' && (
                          <span className={`text-sm font-bold ${
                            match.winner_id === match.player2?.id ? 'text-accent' : 'text-muted'
                          }`}>
                            {match.player2_score}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs">
                      <span className={`inline-block rounded-full px-2 py-0.5 ${
                        match.status === 'completata' ? 'bg-green-500/20 text-green-400' :
                        match.status === 'in_corso' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-surface text-muted'
                      }`}>
                        {match.status === 'completata' ? 'Completata' :
                         match.status === 'in_corso' ? 'In Corso' :
                         match.status === 'programmata' ? 'Programmata' : match.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
