'use client';

import { useEffect, useState } from 'react';
import Bracket from './Bracket';
import ChampionshipStandingsView from './ChampionshipStandingsView';
import GroupStageView from './GroupStageView';

type TournamentType = 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';

interface Tournament {
  id: string;
  title: string;
  tournament_type?: TournamentType;
  max_participants?: number;
  best_of?: number;
  phase?: string;
  current_phase?: string;
  teams_advancing?: number;
  rounds_data?: any[];
  groups_data?: any[];
  standings?: any[];
  [key: string]: any;
}

interface CompetitionViewProps {
  tournament: Tournament;
  participants: any[];
  isAdmin?: boolean;
}

export default function CompetitionView({ 
  tournament, 
  participants,
  isAdmin = false 
}: CompetitionViewProps) {
  
  const { tournament_type, rounds_data, standings, groups_data, phase, current_phase } = tournament;
  const [groups, setGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Carica i gruppi per tornei girone_eliminazione
  useEffect(() => {
    if (tournament_type === 'girone_eliminazione') {
      loadGroups();
    }
  }, [tournament.id, tournament_type]);

  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/groups`);
      const data = await res.json();
      if (res.ok) {
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Eliminazione diretta - mostra bracket
  if (tournament_type === 'eliminazione_diretta') {
    return (
      <div className="space-y-6">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-secondary/5 text-secondary">
              Torneo
            </span>
            <span className="text-sm text-secondary/70">Eliminazione Diretta</span>
          </div>
        </div>
        
        <Bracket 
          participants={participants} 
          tournamentId={tournament.id}
          maxParticipants={tournament.max_participants || 16}
          roundsData={rounds_data || []}
        />
      </div>
    );
  }

  // Campionato round-robin - mostra classifica
  if (tournament_type === 'campionato') {
    return (
      <div className="space-y-6">
        <ChampionshipStandingsView 
          tournamentId={tournament.id}
          participants={participants}
          bestOf={tournament.best_of || 3}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  // Girone + Eliminazione
  if (tournament_type === 'girone_eliminazione') {
    if (current_phase === 'gironi') {
      // Usa GroupStageView per la fase gironi
      return (
        <div className="space-y-5">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-secondary/5 text-secondary">
                Torneo
              </span>
              <span className="text-sm text-secondary/70">Fase a Gironi</span>
            </div>
          </div>

          {loadingGroups ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : (
            <GroupStageView
              tournamentId={tournament.id}
              groups={groups}
              participants={participants}
              bestOf={tournament.best_of || 3}
              teamsAdvancing={tournament.teams_advancing || 2}
              isAdmin={isAdmin}
            />
          )}
        </div>
      );
    }

    if (current_phase === 'eliminazione') {
      // Mostra bracket per fase eliminazione
      return (
        <div className="space-y-5">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-secondary/5 text-secondary">
                Torneo
              </span>
              <span className="text-sm text-secondary/70">Fase ad Eliminazione Diretta</span>
            </div>
          </div>

          {rounds_data && rounds_data.length > 0 ? (
            <Bracket 
              participants={participants} 
              tournamentId={tournament.id}
              maxParticipants={tournament.max_participants || 16}
              roundsData={rounds_data || []}
            />
          ) : (
            <div className="rounded-md border border-gray-200 bg-white p-6 text-center">
              <p className="text-secondary/70">
                Il tabellone eliminatorio verrà generato dopo la fase a gironi.
              </p>
            </div>
          )}
        </div>
      );
    }

    // Fase iscrizioni o altro
    return (
      <div className="rounded-md border border-gray-200 bg-white p-6 text-center">
        <p className="text-secondary/70">
          Il torneo è in fase: {current_phase || 'iscrizioni'}
        </p>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="rounded-md border border-gray-200 bg-white p-8 text-center">
      <p className="text-secondary/70 mb-2">Tipo torneo: {tournament_type || 'Non specificato'}</p>
      <p className="text-sm text-secondary/70">
        {tournament_type ? 'Il torneo non è ancora stato avviato.' : 'Tipo di torneo non riconosciuto.'}
      </p>
      {participants.length > 0 && (
        <div className="mt-6 max-w-2xl mx-auto space-y-3">
          <h4 className="text-sm font-semibold text-secondary mb-3">Partecipanti ({participants.length})</h4>
          {participants.map((participant, index) => {
            const fullName = participant.profiles?.full_name || participant.profiles?.username || 'Partecipante';
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
                  <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold overflow-hidden relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={fullName}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <span>{initials || 'U'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-secondary truncate">
                      {fullName}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
