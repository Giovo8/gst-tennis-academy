'use client';

import { useEffect, useState } from 'react';
import { Trophy, Users, Target, Loader2, Trash2, Calendar } from 'lucide-react';
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
  current_phase: 'iscrizioni' | 'gironi' | 'eliminazione' | 'campionato' | 'completato' | string;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'bracket' | 'groups' | 'calendar' | 'standings'>('overview');

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

  const phaseLabel = (tournament.current_phase as string) === 'iscrizioni'
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
      {/* Contenuto in base al tipo e fase */}
      {(tournament.current_phase as string) === 'iscrizioni' && (
        <div className="hidden"></div>
      )}

      {/* Eliminazione Diretta */}
      {tournament.tournament_type === 'eliminazione_diretta' && (tournament.current_phase === 'eliminazione' || tournament.current_phase === 'completato') && (
        <>
          {activeTab === 'bracket' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-secondary">Tabellone Eliminazione</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                  >
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">Partecipanti</span>
                  </button>
                  <button
                    className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-secondary bg-secondary text-white"
                  >
                    <Trophy className="h-4 w-4" />
                    <span className="text-sm font-medium">Tabellone</span>
                  </button>
                </div>
              </div>
              <EliminationBracketView
                tournamentId={tournament.id}
                maxParticipants={tournament.max_participants}
                participants={participants}
                bestOf={tournament.best_of || 3}
                onMatchUpdate={loadData}
                onBracketGenerated={() => setActiveTab('bracket')}
              />
            </>
          )}
          
          {activeTab === 'overview' && (
            <>
              {/* Lista Partecipanti */}
              {participants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-secondary">Partecipanti Iscritti</h2>
                    {tournament.current_phase && (tournament.current_phase as string) !== 'iscrizioni' && (
                      <div className="flex gap-2">
                        <button
                          className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-secondary bg-secondary text-white"
                        >
                          <Users className="h-4 w-4" />
                          <span className="text-sm font-medium">Partecipanti</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('bracket')}
                          className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                        >
                          <Trophy className="h-4 w-4" />
                          <span className="text-sm font-medium">Tabellone</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Header Row */}
                  <div className="bg-white rounded-lg px-5 py-3 mb-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 flex-shrink-0 flex items-center justify-center">
                        <div className="text-xs font-bold text-secondary/60 uppercase">#</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-secondary/60 uppercase">Atleta</div>
                      </div>
                      <div className="w-48 hidden md:block">
                        <div className="text-xs font-bold text-secondary/60 uppercase">Email</div>
                      </div>
                      <div className="w-32 hidden lg:block">
                        <div className="text-xs font-bold text-secondary/60 uppercase">Telefono</div>
                      </div>
                      {isAdmin && (tournament.current_phase as string) === 'iscrizioni' && (
                        <div className="w-10 flex-shrink-0 flex items-center justify-center">
                          <div className="text-xs font-bold text-secondary/60 uppercase">Azioni</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Data Rows */}
                  {participants.map((participant: any, index: number) => {
                    const fullName = participant.profiles?.full_name || participant.user_id || 'Giocatore';
                    const avatarUrl = participant.profiles?.avatar_url ? getAvatarUrl(participant.profiles.avatar_url) : null;

                    return (
                      <div
                        key={participant.id}
                        className="bg-white rounded-md px-5 py-4 hover:shadow-md transition-all border-l-4 border-secondary"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 flex-shrink-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold overflow-hidden">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{fullName?.charAt(0)?.toUpperCase() || "U"}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-secondary">
                              {fullName}
                            </div>
                            {participant.stats?.matches_played > 0 && (
                              <div className="text-xs text-secondary/60 mt-0.5">
                                {participant.stats.matches_won}W - {participant.stats.matches_lost}L
                              </div>
                            )}
                          </div>
                          <div className="w-48 hidden md:block">
                            {participant.profiles?.email ? (
                              <div className="text-sm text-secondary/70 truncate">
                                {participant.profiles.email}
                              </div>
                            ) : (
                              <div className="text-sm text-secondary/40">-</div>
                            )}
                          </div>
                          <div className="w-32 hidden lg:block">
                            {participant.profiles?.phone ? (
                              <div className="text-sm text-secondary/70 truncate">
                                {participant.profiles.phone}
                              </div>
                            ) : (
                              <div className="text-sm text-secondary/40">-</div>
                            )}
                          </div>
                          {isAdmin && (tournament.current_phase as string) === 'iscrizioni' && (
                            <div className="w-10 flex-shrink-0 flex items-center justify-center">
                              <button
                                onClick={() => handleRemoveParticipant(
                                  participant.id,
                                  fullName
                                )}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Rimuovi partecipante"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
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
          {tournament.current_phase === 'gironi' && activeTab === 'overview' && (
            <>
              {/* Lista Partecipanti fase gironi */}
              {participants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-secondary">Partecipanti Iscritti</h2>
                    <div className="flex gap-2">
                      <button
                        className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-secondary bg-secondary text-white"
                      >
                        <Users className="h-4 w-4" />
                        <span className="text-sm font-medium">Partecipanti</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('groups')}
                        className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                      >
                        <Target className="h-4 w-4" />
                        <span className="text-sm font-medium">Gironi</span>
                      </button>
                    </div>
                  </div>
                  {/* Header Row */}
                  <div className="bg-white rounded-lg px-5 py-3 mb-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 flex-shrink-0 flex items-center justify-center">
                        <div className="text-xs font-bold text-secondary/60 uppercase">#</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-secondary/60 uppercase">Atleta</div>
                      </div>
                      <div className="w-48 hidden md:block">
                        <div className="text-xs font-bold text-secondary/60 uppercase">Email</div>
                      </div>
                      <div className="w-32 hidden lg:block">
                        <div className="text-xs font-bold text-secondary/60 uppercase">Telefono</div>
                      </div>
                    </div>
                  </div>

                  {/* Data Rows */}
                  {participants.map((participant: any, index: number) => {
                    const fullName = participant.profiles?.full_name || participant.user_id || 'Giocatore';
                    const avatarUrl = participant.profiles?.avatar_url ? getAvatarUrl(participant.profiles.avatar_url) : null;

                    return (
                      <div
                        key={participant.id}
                        className="bg-white rounded-md px-5 py-4 hover:shadow-md transition-all border-l-4 border-secondary"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 flex-shrink-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold overflow-hidden">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{fullName?.charAt(0)?.toUpperCase() || "U"}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-secondary">
                              {fullName}
                            </div>
                            {participant.group_id && (
                              <div className="text-xs text-secondary/60 mt-0.5">
                                {groups.find(g => g.id === participant.group_id)?.group_name || 'Girone'}
                              </div>
                            )}
                          </div>
                          <div className="w-48 hidden md:block">
                            {participant.profiles?.email ? (
                              <div className="text-sm text-secondary/70 truncate">
                                {participant.profiles.email}
                              </div>
                            ) : (
                              <div className="text-sm text-secondary/40">-</div>
                            )}
                          </div>
                          <div className="w-32 hidden lg:block">
                            {participant.profiles?.phone ? (
                              <div className="text-sm text-secondary/70 truncate">
                                {participant.profiles.phone}
                              </div>
                            ) : (
                              <div className="text-sm text-secondary/40">-</div>
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
          
          {(tournament.current_phase === 'gironi' || tournament.current_phase === 'eliminazione' || tournament.current_phase === 'completato') && activeTab === 'groups' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-secondary">Gironi</h2>
                {participants.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                    >
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Partecipanti</span>
                    </button>
                    <button
                      className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-secondary bg-secondary text-white"
                    >
                      <Target className="h-4 w-4" />
                      <span className="text-sm font-medium">Gironi</span>
                    </button>
                    {(tournament.current_phase === 'eliminazione' || tournament.current_phase === 'completato') && (
                      <button
                        onClick={() => setActiveTab('bracket')}
                        className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                      >
                        <Trophy className="h-4 w-4" />
                        <span className="text-sm font-medium">Tabellone</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <GroupStageView
                tournamentId={tournament.id}
                groups={groups}
                participants={participants}
                bestOf={tournament.best_of || 3}
                teamsAdvancing={tournament.teams_advancing || 2}
                onMatchUpdate={loadData}
                isAdmin={isAdmin}
              />
            </>
          )}
          
          {(tournament.current_phase === 'eliminazione' || tournament.current_phase === 'completato') && activeTab === 'overview' && (
            <>
              {/* Lista Partecipanti fase eliminazione */}
              {participants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-secondary">Partecipanti</h2>
                    <div className="flex gap-2">
                      <button
                        className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-secondary bg-secondary text-white"
                      >
                        <Users className="h-4 w-4" />
                        <span className="text-sm font-medium">Partecipanti</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('groups')}
                        className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                      >
                        <Target className="h-4 w-4" />
                        <span className="text-sm font-medium">Gironi</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('bracket')}
                        className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                      >
                        <Trophy className="h-4 w-4" />
                        <span className="text-sm font-medium">Tabellone</span>
                      </button>
                    </div>
                  </div>
                  {/* Header Row */}
                  <div className="bg-white rounded-lg px-5 py-3 mb-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 flex-shrink-0 flex items-center justify-center">
                        <div className="text-xs font-bold text-secondary/60 uppercase">#</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-secondary/60 uppercase">Atleta</div>
                      </div>
                      <div className="w-48 hidden md:block">
                        <div className="text-xs font-bold text-secondary/60 uppercase">Email</div>
                      </div>
                      <div className="w-32 hidden lg:block">
                        <div className="text-xs font-bold text-secondary/60 uppercase">Telefono</div>
                      </div>
                    </div>
                  </div>

                  {/* Data Rows - Tutti i partecipanti */}
                  {participants.map((participant: any, index: number) => {
                    const fullName = participant.profiles?.full_name || participant.user_id || 'Giocatore';
                    const avatarUrl = participant.profiles?.avatar_url ? getAvatarUrl(participant.profiles.avatar_url) : null;

                    return (
                      <div
                        key={participant.id}
                        className="bg-white rounded-md px-5 py-4 hover:shadow-md transition-all border-l-4 border-secondary"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 flex-shrink-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold overflow-hidden">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{fullName?.charAt(0)?.toUpperCase() || "U"}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-secondary">
                              {fullName}
                            </div>
                            {participant.group_id && (
                              <div className="text-xs text-secondary/60 mt-0.5">
                                {groups.find(g => g.id === participant.group_id)?.group_name || 'Girone'} - {
                                  participant.group_position && participant.group_position <= (tournament.teams_advancing || 2)
                                    ? `Posizione ${participant.group_position}`
                                    : 'Non Qualificato'
                                }
                              </div>
                            )}
                          </div>
                          <div className="w-48 hidden md:block">
                            {participant.profiles?.email ? (
                              <div className="text-sm text-secondary/70 truncate">
                                {participant.profiles.email}
                              </div>
                            ) : (
                              <div className="text-sm text-secondary/40">-</div>
                            )}
                          </div>
                          <div className="w-32 hidden lg:block">
                            {participant.profiles?.phone ? (
                              <div className="text-sm text-secondary/70 truncate">
                                {participant.profiles.phone}
                              </div>
                            ) : (
                              <div className="text-sm text-secondary/40">-</div>
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
          
          {(tournament.current_phase === 'eliminazione' || tournament.current_phase === 'completato') && activeTab === 'bracket' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-secondary">Tabellone Eliminazione</h2>
                {participants.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                    >
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Partecipanti</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('groups')}
                      className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                    >
                      <Target className="h-4 w-4" />
                      <span className="text-sm font-medium">Gironi</span>
                    </button>
                    <button
                      className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-secondary bg-secondary text-white"
                    >
                      <Trophy className="h-4 w-4" />
                      <span className="text-sm font-medium">Tabellone</span>
                    </button>
                  </div>
                )}
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
        <>
          {activeTab === 'overview' && (
            <>
              {/* Lista Partecipanti */}
              {participants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-secondary">Partecipanti Iscritti</h2>
                    {tournament.current_phase && (tournament.current_phase as string) !== 'iscrizioni' && (
                      <div className="flex gap-2">
                        <button
                          className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-secondary bg-secondary text-white"
                        >
                          <Users className="h-4 w-4" />
                          <span className="text-sm font-medium">Partecipanti</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('calendar')}
                          className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                        >
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium">Calendario</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('standings')}
                          className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                        >
                          <Trophy className="h-4 w-4" />
                          <span className="text-sm font-medium">Classifica</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Header Row */}
                  <div className="bg-white rounded-lg px-5 py-3 mb-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 flex-shrink-0 flex items-center justify-center">
                        <div className="text-xs font-bold text-secondary/60 uppercase">#</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-secondary/60 uppercase">Atleta</div>
                      </div>
                      <div className="w-48 hidden md:block">
                        <div className="text-xs font-bold text-secondary/60 uppercase">Email</div>
                      </div>
                      <div className="w-32 hidden lg:block">
                        <div className="text-xs font-bold text-secondary/60 uppercase">Telefono</div>
                      </div>
                      {isAdmin && (tournament.current_phase as string) === 'iscrizioni' && (
                        <div className="w-10 flex-shrink-0"></div>
                      )}
                    </div>
                  </div>

                  {/* Data Rows */}
                  {participants.map((participant: any, index: number) => {
                    const fullName = participant.profiles?.full_name || participant.user_id || 'Giocatore';
                    const avatarUrl = participant.profiles?.avatar_url ? getAvatarUrl(participant.profiles.avatar_url) : null;

                    return (
                      <div
                        key={participant.id}
                        className="bg-white rounded-md px-5 py-4 hover:shadow-md transition-all border-l-4 border-secondary"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 flex-shrink-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold overflow-hidden">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{fullName?.charAt(0)?.toUpperCase() || "U"}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-secondary">
                              {fullName}
                            </div>
                          </div>
                          <div className="w-48 hidden md:block">
                            {participant.profiles?.email ? (
                              <div className="text-sm text-secondary/70 truncate">
                                {participant.profiles.email}
                              </div>
                            ) : (
                              <div className="text-sm text-secondary/40">-</div>
                            )}
                          </div>
                          <div className="w-32 hidden lg:block">
                            {participant.profiles?.phone ? (
                              <div className="text-sm text-secondary/70 truncate">
                                {participant.profiles.phone}
                              </div>
                            ) : (
                              <div className="text-sm text-secondary/40">-</div>
                            )}
                          </div>
                          {isAdmin && (tournament.current_phase as string) === 'iscrizioni' && (
                            <div className="w-10 flex-shrink-0 flex items-center justify-center">
                              <button
                                onClick={() => handleRemoveParticipant(
                                  participant.id,
                                  fullName
                                )}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Rimuovi partecipante"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'standings' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-secondary">Classifica Campionato</h2>
                {participants.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                    >
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Partecipanti</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('calendar')}
                      className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                    >
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Calendario</span>
                    </button>
                    <button
                      className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-secondary bg-secondary text-white"
                    >
                      <Trophy className="h-4 w-4" />
                      <span className="text-sm font-medium">Classifica</span>
                    </button>
                  </div>
                )}
              </div>
              <ChampionshipStandingsView 
                tournamentId={tournament.id}
                participants={participants}
                bestOf={tournament.best_of || 3}
                onMatchUpdate={loadData}
                isAdmin={isAdmin}
                defaultView="standings"
                hideInternalTabs={true}
              />
            </>
          )}

          {activeTab === 'calendar' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-secondary">Calendario Partite</h2>
            {participants.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Partecipanti</span>
                </button>
                <button
                  className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-secondary bg-secondary text-white"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Calendario</span>
                </button>
                <button
                  onClick={() => setActiveTab('standings')}
                  className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                >
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm font-medium">Classifica</span>
                </button>
              </div>
            )}
          </div>
          <ChampionshipStandingsView 
            tournamentId={tournament.id}
            participants={participants}
            bestOf={tournament.best_of || 3}
            onMatchUpdate={loadData}
            isAdmin={isAdmin}
            defaultView="calendar"
            hideInternalTabs={true}
          />
            </>
          )}
        </>
      )}

      {/* Lista Partecipanti - Solo per fase iscrizioni o tornei che non hanno tab speciali */}
      {participants.length > 0 && 
       (tournament.current_phase as string) === 'iscrizioni' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-secondary">Partecipanti Iscritti</h2>
            <div className="flex gap-2">
              {/* Tab Partecipanti - sempre per primo */}
              <button
                className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-secondary bg-secondary text-white"
              >
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Partecipanti</span>
              </button>
              
              {/* Tab specifici per tipo torneo */}
              {tournament.tournament_type === 'eliminazione_diretta' && tournament.current_phase !== 'iscrizioni' && (
                <button
                  onClick={() => setActiveTab('bracket')}
                  className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                >
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm font-medium">Tabellone</span>
                </button>
              )}
              {tournament.tournament_type === 'girone_eliminazione' && tournament.current_phase === 'gironi' && (
                <button
                  onClick={() => setActiveTab('groups')}
                  className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                >
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">Gironi</span>
                </button>
              )}
              {tournament.tournament_type === 'girone_eliminazione' && tournament.current_phase === 'eliminazione' && (
                <button
                  onClick={() => setActiveTab('bracket')}
                  className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                >
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm font-medium">Tabellone</span>
                </button>
              )}
              {tournament.tournament_type === 'campionato' && (
                <>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Calendario</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('standings')}
                    className="px-4 py-2 rounded-md transition-colors flex items-center gap-2 border border-gray-200 bg-white text-secondary/70 hover:text-secondary hover:border-secondary"
                  >
                    <Trophy className="h-4 w-4" />
                    <span className="text-sm font-medium">Classifica</span>
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Header Row */}
          <div className="bg-white rounded-lg px-5 py-3 mb-3">
            <div className="flex items-center gap-4">
              <div className="w-10 flex-shrink-0 flex items-center justify-center">
                <div className="text-xs font-bold text-secondary/60 uppercase">#</div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-secondary/60 uppercase">Atleta</div>
              </div>
              <div className="w-48 hidden md:block">
                <div className="text-xs font-bold text-secondary/60 uppercase">Email</div>
              </div>
              <div className="w-32 hidden lg:block">
                <div className="text-xs font-bold text-secondary/60 uppercase">Telefono</div>
              </div>
              {isAdmin && (tournament.current_phase as string) === 'iscrizioni' && (
                <div className="w-10 flex-shrink-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-secondary/60 uppercase">Azioni</div>
                </div>
              )}
            </div>
          </div>

          {/* Data Rows */}
          {participants.map((participant: any, index: number) => {
            const fullName = participant.profiles?.full_name || participant.user_id || 'Giocatore';
            const avatarUrl = participant.profiles?.avatar_url ? getAvatarUrl(participant.profiles.avatar_url) : null;

            return (
              <div
                key={participant.id}
                className="bg-white rounded-md px-5 py-4 hover:shadow-md transition-all border-l-4 border-secondary"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 flex-shrink-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold overflow-hidden">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{fullName?.charAt(0)?.toUpperCase() || "U"}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-secondary">
                      {fullName}
                    </div>
                    {participant.stats?.matches_played > 0 && (
                      <div className="text-xs text-secondary/60 mt-0.5">
                        {participant.stats.matches_won}W - {participant.stats.matches_lost}L
                      </div>
                    )}
                  </div>
                  <div className="w-48 hidden md:block">
                    {participant.profiles?.email ? (
                      <div className="text-sm text-secondary/70 truncate">
                        {participant.profiles.email}
                      </div>
                    ) : (
                      <div className="text-sm text-secondary/40">-</div>
                    )}
                  </div>
                  <div className="w-32 hidden lg:block">
                    {participant.profiles?.phone ? (
                      <div className="text-sm text-secondary/70 truncate">
                        {participant.profiles.phone}
                      </div>
                    ) : (
                      <div className="text-sm text-secondary/40">-</div>
                    )}
                  </div>
                  {isAdmin && (tournament.current_phase as string) === 'iscrizioni' && (
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      <button
                        onClick={() => handleRemoveParticipant(
                          participant.id,
                          fullName
                        )}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Rimuovi partecipante"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
