'use client';

import React from 'react';
import Bracket from './Bracket';
import ChampionshipStandings from './ChampionshipStandings';

type CompetitionType = 'torneo' | 'campionato';
type CompetitionFormat = 'eliminazione_diretta' | 'round_robin' | 'girone_eliminazione';

interface Tournament {
  id: string;
  title: string;
  competition_type?: CompetitionType;
  format?: CompetitionFormat;
  max_participants?: number;
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
  
  const { competition_type, format, rounds_data, standings, groups_data } = tournament;

  // Torneo con eliminazione diretta - mostra bracket
  if (competition_type === 'torneo' && format === 'eliminazione_diretta') {
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
  if (competition_type === 'campionato' && format === 'round_robin') {
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

        <ChampionshipStandings 
          standings={standings || []}
          tournamentId={tournament.id}
          isAdmin={isAdmin}
        />
        
        {participants.length > 0 && (
          <div className="mt-6 rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-dark/20 to-transparent backdrop-blur-xl p-6">
            <h4 className="text-sm font-semibold text-white mb-4">Partecipanti ({participants.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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

  // Formato misto: girone + eliminazione
  if (format === 'girone_eliminazione') {
    return (
      <div className="space-y-8">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-accent-15 text-accent">
              {competition_type === 'torneo' ? 'Torneo' : 'Campionato'}
            </span>
            <span className="text-sm text-muted-2">Fase a Gironi + Eliminazione Diretta</span>
          </div>
        </div>

        {/* Fase a gironi */}
        {groups_data && groups_data.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Fase a Gironi</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {groups_data.map((group: any, idx: number) => (
                <div 
                  key={idx}
                  className="rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-dark/20 to-transparent backdrop-blur-xl p-5"
                >
                  <h4 className="text-sm font-semibold text-accent mb-3">
                    Girone {String.fromCharCode(65 + idx)}
                  </h4>
                  <ChampionshipStandings 
                    standings={group.standings || []}
                    tournamentId={tournament.id}
                    isAdmin={isAdmin}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fase ad eliminazione */}
        {rounds_data && rounds_data.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Fase ad Eliminazione Diretta</h3>
            <Bracket 
              participants={participants} 
              tournamentId={tournament.id}
              maxParticipants={tournament.max_participants || 16}
              roundsData={rounds_data || []}
            />
          </div>
        )}

        {/* Fallback se non ci sono ancora dati */}
        {(!groups_data || groups_data.length === 0) && (!rounds_data || rounds_data.length === 0) && (
          <div className="rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-dark/20 to-transparent backdrop-blur-xl p-8 text-center">
            <p className="text-muted-2">
              La struttura della competizione verrà generata una volta raggiunti i partecipanti necessari.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Default fallback
  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-accent-dark/20 to-transparent backdrop-blur-xl p-8 text-center">
      <p className="text-muted-2 mb-2">Formato competizione: {format}</p>
      <p className="text-sm text-muted-2">
        La visualizzazione per questo formato verrà implementata a breve.
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
