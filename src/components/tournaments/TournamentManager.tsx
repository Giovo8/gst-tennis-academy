'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Users, Target, Loader2, Trash2 } from 'lucide-react';
import EliminationBracketView from './EliminationBracketView';
import GroupStageView from './GroupStageView';
import ChampionshipStandingsView from './ChampionshipStandingsView';
import ManualEnrollment from './ManualEnrollment';

type TournamentType = 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';

interface Tournament {
  id: string;
  title: string;
  tournament_type: TournamentType;
  max_participants: number;
  num_groups?: number;
  teams_per_group?: number;
  teams_advancing?: number;
  current_phase: string;
  status: string;
  best_of?: number;
}

interface TournamentManagerProps {
  tournament: Tournament;
  isAdmin?: boolean;
}

export default function TournamentManager({ tournament, isAdmin = false }: TournamentManagerProps) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
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
      
      if (participantsRes.ok) {
        setParticipants(participantsData.participants || []);
      }

      // Carica gironi se tipo girone_eliminazione
      if (tournament.tournament_type === 'girone_eliminazione') {
        const groupsRes = await fetch(`/api/tournaments/${tournament.id}/groups`);
        const groupsData = await groupsRes.json();
        
        if (groupsRes.ok) {
          setGroups(groupsData.groups || []);
        }
      }
    } catch (error) {
      console.error('Error loading tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTournament = async () => {
    if (!confirm('Sei sicuro di voler avviare il torneo? Non potranno più iscriversi nuovi partecipanti.')) {
      return;
    }

    setStarting(true);
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Sessione non valida');
        return;
      }

      const res = await fetch(`/api/tournaments/${tournament.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Torneo avviato con successo!');
        window.location.reload();
      } else {
        alert(data.error || 'Errore nell\'avvio del torneo');
      }
    } catch (error) {
      console.error('Error starting tournament:', error);
      alert('Errore nell\'avvio del torneo');
    } finally {
      setStarting(false);
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
          color: 'text-red-400',
          bgColor: 'bg-red-500/10'
        };
      case 'girone_eliminazione':
        return {
          icon: Target,
          name: 'Girone + Eliminazione',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10'
        };
      case 'campionato':
        return {
          icon: Users,
          name: 'Campionato',
          color: 'text-green-400',
          bgColor: 'bg-primary/10'
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
  const Icon = typeInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`rounded-lg ${typeInfo.bgColor} p-3`}>
              <Icon className={`h-6 w-6 ${typeInfo.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-semibold text-gray-900">{tournament.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  tournament.status === 'Aperto' ? 'bg-blue-100 text-primary' :
                  tournament.status === 'In Corso' ? 'bg-blue-100 text-primary-dark' :
                  tournament.status === 'Concluso' ? 'bg-gray-100 text-gray-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {tournament.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{typeInfo.name}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Partecipanti: {participants.length}/{tournament.max_participants}</span>
                <span>•</span>
                <span>Fase: {tournament.current_phase}</span>
              </div>
            </div>
          </div>

          {/* Azioni Admin */}
          <div className="flex items-center gap-3">
            {isAdmin && tournament.current_phase === 'iscrizioni' && (
              <ManualEnrollment 
                tournamentId={tournament.id}
                currentParticipants={participants.length}
                maxParticipants={tournament.max_participants}
                onEnrollmentSuccess={loadData}
              />
            )}
            
            {isAdmin && tournament.current_phase === 'iscrizioni' && participants.length >= 2 && (
              <button
                onClick={handleStartTournament}
                disabled={starting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
              >
                {starting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Avvio...
                  </span>
                ) : (
                  'Avvia Torneo'
                )}
              </button>
            )}

            {isAdmin && (
              <button
                onClick={handleDeleteTournament}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all"
                title="Elimina torneo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs per Eliminazione Diretta */}
      {tournament.tournament_type === 'eliminazione_diretta' && tournament.current_phase === 'eliminazione' && (
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'overview'
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Panoramica
            {activeTab === 'overview' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'bracket'
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tabellone
            {activeTab === 'bracket' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>
      )}

      {/* Contenuto in base al tipo e fase */}
      {tournament.current_phase === 'iscrizioni' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            Fase Iscrizioni
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Il torneo accetta ancora iscrizioni. {participants.length} partecipanti su {tournament.max_participants}.
          </p>
          {isAdmin && participants.length >= 2 && (
            <p className="text-xs text-blue-600 font-medium">
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
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">
                      Partecipanti ({participants.length})
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {participants.map((participant: any) => (
                      <div
                        key={participant.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {participant.profiles?.full_name || participant.user_id || 'Giocatore'}
                            </p>
                            {participant.profiles?.email && (
                              <p className="text-xs text-gray-600 mt-1 truncate">
                                {participant.profiles.email}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {participant.seed && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  Testa di serie #{participant.seed}
                                </span>
                              )}
                              {participant.stats?.matches_played > 0 && (
                                <span className="text-xs text-gray-600">
                                  {participant.stats.matches_won}W - {participant.stats.matches_lost}L
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-gray-900">
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
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">
              Partecipanti ({participants.length})
            </h4>
            {isAdmin && tournament.current_phase === 'iscrizioni' && (
              <ManualEnrollment 
                tournamentId={tournament.id}
                currentParticipants={participants.length}
                maxParticipants={tournament.max_participants}
                onEnrollmentSuccess={loadData}
              />
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {participants.map((participant: any) => (
              <div
                key={participant.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {participant.profiles?.full_name || participant.user_id || 'Giocatore'}
                    </p>
                    {participant.profiles?.email && (
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {participant.profiles.email}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {participant.seed && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Testa di serie #{participant.seed}
                        </span>
                      )}
                      {participant.stats?.matches_played > 0 && (
                        <span className="text-xs text-gray-600">
                          {participant.stats.matches_won}W - {participant.stats.matches_lost}L
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && tournament.current_phase === 'iscrizioni' && (
                    <button
                      onClick={() => handleRemoveParticipant(
                        participant.id, 
                        participant.profiles?.full_name || participant.user_id || 'Giocatore'
                      )}
                      className="flex-shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50 transition-colors"
                      title="Rimuovi partecipante"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
