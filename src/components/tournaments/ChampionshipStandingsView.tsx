'use client';

import React from 'react';
import { Trophy, TrendingUp, Award } from 'lucide-react';

interface Participant {
  id: string;
  user_id: string;
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

interface ChampionshipStandingsViewProps {
  participants: Participant[];
}

export default function ChampionshipStandingsView({ participants }: ChampionshipStandingsViewProps) {
  // Ordina i partecipanti per classifica
  const sortedParticipants = [...participants].sort((a, b) => {
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

  const getPodiumColor = (position: number) => {
    switch (position) {
      case 1: return 'from-yellow-500 to-amber-500';
      case 2: return 'from-gray-400 to-gray-500';
      case 3: return 'from-orange-600 to-orange-700';
      default: return 'from-accent to-accent-dark';
    }
  };

  const getPodiumIcon = (position: number) => {
    switch (position) {
      case 1: return <Trophy className="h-5 w-5" />;
      case 2: return <Award className="h-5 w-5" />;
      case 3: return <Award className="h-4 w-4" />;
      default: return null;
    }
  };

  if (participants.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <Trophy className="mx-auto h-12 w-12 text-muted mb-4" />
        <p className="text-sm text-muted">Nessun partecipante ancora</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Podio (Top 3) */}
      {sortedParticipants.length >= 3 && (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-lighter p-6">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-2 mb-6">
            Podio
          </h4>
          
          <div className="grid grid-cols-3 gap-4">
            {/* 2° Posto */}
            <div className="order-1 pt-8">
              <div className={`rounded-2xl bg-gradient-to-br ${getPodiumColor(2)} p-4 text-center text-white`}>
                <div className="mb-2 flex justify-center">
                  {getPodiumIcon(2)}
                </div>
                <div className="text-2xl font-bold mb-1">2°</div>
                <div className="text-sm font-medium truncate">
                  {sortedParticipants[1]?.user_id}
                </div>
                <div className="mt-2 text-xs opacity-90">
                  {sortedParticipants[1]?.stats?.points || 0} punti
                </div>
              </div>
            </div>

            {/* 1° Posto */}
            <div className="order-2">
              <div className={`rounded-2xl bg-gradient-to-br ${getPodiumColor(1)} p-6 text-center text-white shadow-lg`}>
                <div className="mb-3 flex justify-center">
                  {getPodiumIcon(1)}
                </div>
                <div className="text-3xl font-bold mb-2">1°</div>
                <div className="text-base font-semibold truncate">
                  {sortedParticipants[0]?.user_id}
                </div>
                <div className="mt-3 text-sm opacity-90">
                  {sortedParticipants[0]?.stats?.points || 0} punti
                </div>
              </div>
            </div>

            {/* 3° Posto */}
            <div className="order-3 pt-12">
              <div className={`rounded-2xl bg-gradient-to-br ${getPodiumColor(3)} p-3 text-center text-white`}>
                <div className="mb-2 flex justify-center">
                  {getPodiumIcon(3)}
                </div>
                <div className="text-xl font-bold mb-1">3°</div>
                <div className="text-xs font-medium truncate">
                  {sortedParticipants[2]?.user_id}
                </div>
                <div className="mt-2 text-xs opacity-90">
                  {sortedParticipants[2]?.stats?.points || 0} punti
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Classifica Completa */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border bg-surface-lighter px-6 py-4">
          <h4 className="font-semibold text-white">Classifica Completa</h4>
        </div>

        {/* Header tabella */}
        <div className="grid grid-cols-12 gap-4 border-b border-border bg-surface-lighter px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-2">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Giocatore</div>
          <div className="col-span-1 text-center hidden sm:block">PG</div>
          <div className="col-span-1 text-center hidden sm:block">V</div>
          <div className="col-span-1 text-center hidden sm:block">S</div>
          <div className="col-span-2 text-center hidden md:block">Set</div>
          <div className="col-span-2 text-right">Punti</div>
        </div>

        {/* Righe classifica */}
        <div className="divide-y divide-border">
          {sortedParticipants.map((participant, index) => {
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
            
            const isPodium = index < 3;
            const setDiff = stats.sets_won - stats.sets_lost;

            return (
              <div
                key={participant.id}
                className={`grid grid-cols-12 gap-4 px-6 py-4 transition-colors hover:bg-surface-lighter ${
                  isPodium ? 'bg-accent/5' : ''
                }`}
              >
                {/* Posizione */}
                <div className="col-span-1 flex items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                    isPodium
                      ? `bg-gradient-to-br ${getPodiumColor(index + 1)} text-white`
                      : 'bg-surface-lighter text-muted'
                  }`}>
                    {index + 1}
                  </div>
                </div>

                {/* Giocatore */}
                <div className="col-span-4 flex items-center">
                  <div>
                    <div className="font-medium text-white">
                      {participant.user_id}
                    </div>
                    <div className="text-xs text-muted sm:hidden">
                      {stats.matches_won}V - {stats.matches_lost}S
                    </div>
                  </div>
                </div>

                {/* Partite Giocate */}
                <div className="col-span-1 hidden sm:flex items-center justify-center text-sm text-white">
                  {stats.matches_played}
                </div>

                {/* Vittorie */}
                <div className="col-span-1 hidden sm:flex items-center justify-center text-sm text-green-400">
                  {stats.matches_won}
                </div>

                {/* Sconfitte */}
                <div className="col-span-1 hidden sm:flex items-center justify-center text-sm text-red-400">
                  {stats.matches_lost}
                </div>

                {/* Differenza Set */}
                <div className="col-span-2 hidden md:flex items-center justify-center">
                  <span className={`text-sm font-medium ${
                    setDiff > 0 ? 'text-green-400' :
                    setDiff < 0 ? 'text-red-400' :
                    'text-muted'
                  }`}>
                    {setDiff > 0 ? '+' : ''}{setDiff}
                    <span className="text-xs text-muted ml-1">
                      ({stats.sets_won}-{stats.sets_lost})
                    </span>
                  </span>
                </div>

                {/* Punti */}
                <div className="col-span-2 flex items-center justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-accent">
                      {stats.points}
                    </span>
                    {index === 0 && stats.points > 0 && (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda punti */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h5 className="text-sm font-semibold text-white mb-2">Sistema di Punteggio</h5>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted">
          <div>• Vittoria: <span className="text-white font-semibold">2 punti</span></div>
          <div>• Sconfitta: <span className="text-white font-semibold">0 punti</span></div>
        </div>
        <p className="mt-2 text-xs text-muted-2">
          In caso di parità di punti, conta la differenza set, poi la differenza games
        </p>
      </div>
    </div>
  );
}
