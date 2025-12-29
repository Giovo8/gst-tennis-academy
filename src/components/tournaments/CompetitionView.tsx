'use client';

import React, { useEffect, useState } from 'react';
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
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-accent-15 text-accent">
              Torneo
            </span>
            <span className="text-sm text-muted-2">Eliminazione Diretta</span>
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
        <div className="section-header">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-accent-15 text-accent">
              Campionato
            </span>
            <span className="text-sm text-muted-2">Round-robin (Tutti contro tutti)</span>
          </div>
        </div>

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
              <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-accent-15 text-accent">
                Torneo
              </span>
              <span className="text-sm text-muted-2">Fase a Gironi</span>
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
              <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-accent-15 text-accent">
                Torneo
              </span>
              <span className="text-sm text-muted-2">Fase ad Eliminazione Diretta</span>
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
            <div className="rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-dark/20 to-transparent backdrop-blur-xl p-6 text-center">
              <p className="text-muted-2">
                Il tabellone eliminatorio verrà generato dopo la fase a gironi.
              </p>
            </div>
          )}
        </div>
      );
    }

    // Fase iscrizioni o altro
    return (
      <div className="rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-dark/20 to-transparent backdrop-blur-xl p-6 text-center">
        <p className="text-muted-2">
          Il torneo è in fase: {current_phase || 'iscrizioni'}
        </p>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-dark/20 to-transparent backdrop-blur-xl p-8 text-center">
      <p className="text-muted-2 mb-2">Tipo torneo: {tournament_type || 'Non specificato'}</p>
      <p className="text-sm text-muted-2">
        {tournament_type ? 'Il torneo non è ancora stato avviato.' : 'Tipo di torneo non riconosciuto.'}
      </p>
      {participants.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-white mb-4">Partecipanti ({participants.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {participants.map((p: any) => (
              <div 
                key={p.id} 
                className="px-3 py-2 rounded-lg bg-surface border border-[var(--glass-border)] text-sm text-white"
              >
                {p.user?.full_name || p.user_id}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
