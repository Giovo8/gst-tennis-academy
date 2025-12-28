'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Users, Target, Loader2 } from 'lucide-react';
import EliminationBracketView from './EliminationBracketView';
import GroupStageView from './GroupStageView';
import ChampionshipStandingsView from './ChampionshipStandingsView';

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
          bgColor: 'bg-green-500/10'
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
      <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-lighter p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`rounded-xl ${typeInfo.bgColor} p-3`}>
              <Icon className={`h-6 w-6 ${typeInfo.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-semibold text-white">{tournament.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  tournament.status === 'Aperto' ? 'bg-green-500/20 text-green-400' :
                  tournament.status === 'In Corso' ? 'bg-yellow-500/20 text-yellow-400' :
                  tournament.status === 'Concluso' ? 'bg-gray-500/20 text-gray-400' :
                  'bg-surface text-muted'
                }`}>
                  {tournament.status}
                </span>
              </div>
              <p className="text-sm text-muted mb-2">{typeInfo.name}</p>
              <div className="flex items-center gap-4 text-xs text-muted-2">
                <span>Partecipanti: {participants.length}/{tournament.max_participants}</span>
                <span>•</span>
                <span>Fase: {tournament.current_phase}</span>
              </div>
            </div>
          </div>

          {/* Azioni Admin */}
          {isAdmin && tournament.current_phase === 'iscrizioni' && participants.length >= 2 && (
            <button
              onClick={handleStartTournament}
              disabled={starting}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
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
        </div>
      </div>

      {/* Contenuto in base al tipo e fase */}
      {tournament.current_phase === 'iscrizioni' && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-muted mb-4" />
          <h4 className="text-lg font-semibold text-white mb-2">
            Fase Iscrizioni
          </h4>
          <p className="text-sm text-muted mb-4">
            Il torneo accetta ancora iscrizioni. {participants.length} partecipanti su {tournament.max_participants}.
          </p>
          {isAdmin && participants.length >= 2 && (
            <p className="text-xs text-accent">
              Puoi avviare il torneo quando sei pronto usando il pulsante in alto
            </p>
          )}
        </div>
      )}

      {/* Eliminazione Diretta */}
      {tournament.tournament_type === 'eliminazione_diretta' && tournament.current_phase === 'eliminazione' && (
        <EliminationBracketView
          tournamentId={tournament.id}
          maxParticipants={tournament.max_participants}
          participants={participants}
          onMatchUpdate={loadData}
        />
      )}

      {/* Girone + Eliminazione */}
      {tournament.tournament_type === 'girone_eliminazione' && (
        <>
          {tournament.current_phase === 'gironi' && (
            <GroupStageView
              tournamentId={tournament.id}
              groups={groups}
              participants={participants}
              teamsAdvancing={tournament.teams_advancing || 2}
              onMatchUpdate={loadData}
            />
          )}
          
          {tournament.current_phase === 'eliminazione' && (
            <div className="space-y-6">
              <div className="rounded-lg bg-accent/10 border border-accent/30 p-4">
                <p className="text-sm text-white">
                  <strong>Fase Eliminazione:</strong> Le migliori {tournament.teams_advancing} squadre di ogni girone si sfidano
                </p>
              </div>
              
              <EliminationBracketView
                tournamentId={tournament.id}
                maxParticipants={(tournament.num_groups || 0) * (tournament.teams_advancing || 0)}
                participants={participants.filter(p => p.group_position && p.group_position <= (tournament.teams_advancing || 0))}
                onMatchUpdate={loadData}
              />
            </div>
          )}
        </>
      )}

      {/* Campionato */}
      {tournament.tournament_type === 'campionato' && tournament.status === 'In Corso' && (
        <ChampionshipStandingsView participants={participants} />
      )}

      {/* Lista Partecipanti */}
      {participants.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h4 className="font-semibold text-white mb-4">
            Partecipanti ({participants.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {participants.map((participant: any) => (
              <div
                key={participant.id}
                className="rounded-lg border border-border bg-surface-lighter px-3 py-2 text-sm text-white"
              >
                {participant.user_id}
                {participant.seed && (
                  <span className="ml-2 text-xs text-muted">
                    #{participant.seed}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
