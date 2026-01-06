'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Users, Target, Loader2, Trash2 } from 'lucide-react';
import EliminationBracketView from './EliminationBracketView';
import GroupStageView from './GroupStageView';
import ChampionshipStandingsView from './ChampionshipStandingsView';
import { getAvatarUrl } from '@/lib/utils';

type TournamentType = 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';

interface Tournament {
  id: string;
  title: string;
  tournament_type: TournamentType;
  category?: string;
  description?: string;
  start_date?: string;
  max_participants: number;
  num_groups?: number;
  teams_per_group?: number;
  teams_advancing?: number;
  current_phase: string;
  status: string;
  best_of?: number;
}

interface TournamentManagerMeta {
  participantsCount: number;
  maxParticipants: number;
  currentPhase: string;
  status: string;
  tournamentType?: string;
}

interface TournamentManagerProps {
  tournament: Tournament;
  isAdmin?: boolean;
  onMetaChange?: (meta: TournamentManagerMeta) => void;
}

export default function TournamentManager({ tournament, isAdmin = false, onMetaChange }: TournamentManagerProps) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'bracket'>('overview');

  useEffect(() => {
    loadData();
  }, [tournament.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carica partecipanti
      const participantsRes = await fetch(`/api/tournament_participants?tournament_id=${tournament.id}`);
      const participantsData = await participantsRes.json();

      let participantsArray: any[] = [];

      if (participantsRes.ok) {
        participantsArray = participantsData.participants || [];
        setParticipants(participantsArray);
      } else {
        setParticipants([]);
      }

      // Carica gironi se tipo girone_eliminazione
      if (tournament.tournament_type === 'girone_eliminazione') {
        const groupsRes = await fetch(`/api/tournaments/${tournament.id}/groups`);
        const groupsData = await groupsRes.json();
        
        if (groupsRes.ok) {
          setGroups(groupsData.groups || []);
        }
      }

      // Aggiorna i metadati per l'header della pagina
      if (onMetaChange) {
        onMetaChange({
          participantsCount: participantsArray.length,
          maxParticipants: tournament.max_participants,
          currentPhase: tournament.current_phase,
          status: tournament.status,
          tournamentType: tournament.tournament_type,
        });
      }
    } catch (error) {
      console.error('Error loading tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string, participantName: string) => {
    if (!confirm(`Sei sicuro di voler rimuovere ${participantName} dal torneo?`)) {
      return;
    }

    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Sessione non valida');
        return;
      }

      const res = await fetch(`/api/tournament_participants?id=${participantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        alert('Partecipante rimosso con successo');
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Errore nella rimozione del partecipante');
      }
    } catch (error) {
      console.error('Error removing participant:', error);
      alert('Errore nella rimozione del partecipante');
    }
  };

  const handleDeleteTournament = async () => {
    if (!confirm('⚠️ ATTENZIONE: Sei sicuro di voler eliminare questo torneo?\n\nQuesta azione è irreversibile e cancellerà:\n- Il torneo\n- Tutti i partecipanti\n- Tutte le partite\n- Tutte le statistiche')) {
      return;
    }

    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Sessione non valida');
        return;
      }

      const res = await fetch(`/api/tournaments?id=${tournament.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        alert('Torneo eliminato con successo');
        window.location.href = '/dashboard/admin/tornei';
      } else {
        const data = await res.json();
        alert(data.error || 'Errore nell\'eliminazione del torneo');
      }
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert('Errore nell\'eliminazione del torneo');
    }
  };

  const getTournamentTypeInfo = () => {
    switch (tournament.tournament_type) {
      case 'eliminazione_diretta':
        return {
          icon: Trophy,
          name: 'Eliminazione Diretta',
          color: 'text-secondary',
          bgColor: 'bg-secondary/10'
        };
      case 'girone_eliminazione':
        return {
          icon: Target,
          name: 'Girone + Eliminazione',
          color: 'text-secondary',
          bgColor: 'bg-secondary/10'
        };
      case 'campionato':
        return {
          icon: Users,
          name: 'Campionato',
          color: 'text-secondary',
          bgColor: 'bg-secondary/10'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const typeInfo = getTournamentTypeInfo();

  const startDateLabel = tournament.start_date
    ? new Date(tournament.start_date)
        .toLocaleDateString('it-IT', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        .replace(/^([a-zàèéìòù])/u, (c) => c.toUpperCase())
    : null;

  const phaseLabel = tournament.current_phase === 'iscrizioni'
    ? 'Iscrizioni'
    : tournament.current_phase === 'gironi'
    ? 'Gironi'
    : tournament.current_phase === 'eliminazione'
    ? 'Eliminazione diretta'
    : tournament.current_phase === 'campionato'
    ? 'Campionato'
    : tournament.current_phase === 'completato'
    ? 'Completato'
    : tournament.current_phase;

  return (
  <div className="space-y-6">
      {/* Tabs per Eliminazione Diretta */}
      {tournament.tournament_type === 'eliminazione_diretta' && tournament.current_phase === 'eliminazione' && (
        <div className="flex gap-2 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all relative ${
              activeTab === 'overview'
                ? 'text-secondary'
                : 'text-secondary/70 hover:text-secondary'
            }`}
          >
            <Users className="h-4 w-4" />
            Partecipanti
            {activeTab === 'overview' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`px-4 py-3 text-sm font-semibold transition-all relative ${
              activeTab === 'bracket'
                ? 'text-secondary'
                : 'text-secondary/70 hover:text-secondary'
            }`}
          >
            Tabellone
            {activeTab === 'bracket' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary" />
            )}
          </button>
        </div>
      )}

      {/* Contenuto in base al tipo e fase */}
      {tournament.current_phase === 'iscrizioni' && (
        <div className="rounded-md border border-gray-200 bg-white p-6 text-center">
          <Users className="mx-auto h-12 w-12 text-secondary/40 mb-4" />
          <h4 className="text-lg font-semibold text-secondary mb-2">
            Fase Iscrizioni
          </h4>
          <p className="text-sm text-secondary/70 mb-4">
            Il torneo accetta ancora iscrizioni. {participants.length} partecipanti su {tournament.max_participants}.
          </p>
          {isAdmin && participants.length >= 2 && (
            <p className="text-xs text-secondary font-medium">
              Puoi avviare il torneo quando sei pronto usando il pulsante in alto
            </p>
          )}
        </div>
      )}

      {/* Eliminazione Diretta */}
      {tournament.tournament_type === 'eliminazione_diretta' && tournament.current_phase === 'eliminazione' && (
        <>
          {activeTab === 'bracket' && (
            <EliminationBracketView
              tournamentId={tournament.id}
              maxParticipants={tournament.max_participants}
              participants={participants}
              bestOf={tournament.best_of || 3}
              onMatchUpdate={loadData}
              onBracketGenerated={() => setActiveTab('bracket')}
            />
          )}
          
          {activeTab === 'overview' && (
            <>
              {/* Lista Partecipanti */}
              {participants.length > 0 && (
                <div className="space-y-3">
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
                  {participants.map((participant: any, index: number) => {
                    const fullName = participant.profiles?.full_name || participant.user_id || 'Giocatore';

                    return (
                      <div
                        key={participant.id}
                        className="bg-white rounded-md p-5 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary/10 text-secondary font-bold text-sm">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-secondary truncate">
                              {fullName}
                            </div>
                            {participant.stats?.matches_played > 0 && (
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[11px] text-secondary/70">
                                  {participant.stats.matches_won}W - {participant.stats.matches_lost}L
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="w-48 hidden sm:block">
                            {participant.profiles?.email && (
                              <div className="text-xs text-secondary/70 truncate">
                                {participant.profiles.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Girone + Eliminazione */}
      {tournament.tournament_type === 'girone_eliminazione' && (
        <>
          {tournament.current_phase === 'gironi' && (
            <GroupStageView
              tournamentId={tournament.id}
              groups={groups}
              participants={participants}
              bestOf={tournament.best_of || 3}
              teamsAdvancing={tournament.teams_advancing || 2}
              onMatchUpdate={loadData}
              isAdmin={isAdmin}
            />
          )}
          
          {tournament.current_phase === 'eliminazione' && (
            <div className="space-y-6">
              <div className="rounded-md bg-secondary/[0.03] border border-gray-200 p-4">
                <p className="text-sm text-secondary">
                  <strong>Fase Eliminazione:</strong> Le migliori {tournament.teams_advancing} squadre di ogni girone si sfidano
                </p>
              </div>
              
              <EliminationBracketView
                tournamentId={tournament.id}
                maxParticipants={(tournament.num_groups || 0) * (tournament.teams_advancing || 0)}
                participants={participants.filter(p => p.group_position && p.group_position <= (tournament.teams_advancing || 0))}
                bestOf={tournament.best_of || 3}
                onMatchUpdate={loadData}
              />
            </div>
          )}
        </>
      )}

      {/* Campionato */}
      {tournament.tournament_type === 'campionato' && (
        <ChampionshipStandingsView 
          tournamentId={tournament.id}
          participants={participants}
          bestOf={tournament.best_of || 3}
          onMatchUpdate={loadData}
          isAdmin={isAdmin}
        />
      )}

      {/* Lista Partecipanti - Solo per tipi diversi da campionato, girone_eliminazione e eliminazione_diretta in fase eliminazione */}
      {participants.length > 0 && tournament.tournament_type !== 'campionato' && tournament.tournament_type !== 'girone_eliminazione' && !(tournament.tournament_type === 'eliminazione_diretta' && tournament.current_phase === 'eliminazione') && (
        <div className="rounded-md bg-white p-4 sm:p-6">
          <div className="divide-y divide-gray-100 bg-white overflow-hidden rounded-md">
						{participants.map((participant: any, index: number) => {
              const fullName = participant.profiles?.full_name || participant.user_id || 'Giocatore';

						          return (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/5 transition-colors"
                >
                  <div className="w-6 text-xs font-medium text-secondary/60 text-right">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-secondary truncate">
                      {fullName}
                    </div>
                    {participant.profiles?.email && (
                      <div className="text-xs text-secondary/70 truncate">
                        {participant.profiles.email}
                      </div>
                    )}
                    {participant.stats?.matches_played > 0 && (
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-secondary/70">
                          {participant.stats.matches_won}W - {participant.stats.matches_lost}L
                        </span>
                      </div>
                    )}
                  </div>
                  {isAdmin && tournament.current_phase === 'iscrizioni' && (
                    <button
                      onClick={() => handleRemoveParticipant(
                        participant.id,
                        fullName
                      )}
                      className="flex-shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50 transition-colors"
                      title="Rimuovi partecipante"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
