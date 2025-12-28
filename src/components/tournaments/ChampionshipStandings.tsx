'use client';

import React from 'react';
import { Trophy } from 'lucide-react';

interface StandingEntry {
  position: number;
  player_name: string;
  player_id: string;
  matches_played: number;
  wins: number;
  losses: number;
  sets_won: number;
  sets_lost: number;
  games_won: number;
  games_lost: number;
  points: number;
}

interface ChampionshipStandingsProps {
  standings: StandingEntry[];
  tournamentId: string;
  isAdmin?: boolean;
}

export default function ChampionshipStandings({ 
  standings, 
  tournamentId,
  isAdmin = false 
}: ChampionshipStandingsProps) {
  
  // Sort by points (descending), then by sets difference, then by games difference
  const sortedStandings = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const setsDiffA = a.sets_won - a.sets_lost;
    const setsDiffB = b.sets_won - b.sets_lost;
    if (setsDiffB !== setsDiffA) return setsDiffB - setsDiffA;
    const gamesDiffA = a.games_won - a.games_lost;
    const gamesDiffB = b.games_won - b.games_lost;
    return gamesDiffB - gamesDiffA;
  });

  if (!standings || standings.length === 0) {
    return (
      <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-12 text-center">
        <Trophy className="h-12 w-12 text-blue-400/50 mx-auto mb-4" />
        <p className="text-lg font-bold text-white mb-2">Classifica in aggiornamento</p>
        <p className="text-sm text-gray-400">
          La classifica verrà aggiornata non appena verranno giocati i primi match.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/20 p-2">
            <Trophy className="h-6 w-6 text-blue-300" />
          </div>
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-200 to-cyan-300 bg-clip-text text-transparent">Classifica Campionato</h3>
            <p className="text-sm text-gray-400">Round-robin - Tutti contro tutti</p>
          </div>
        </div>
      </div>

      {/* Desktop view - Table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2f7de1]/20 bg-[#0c1424]/40">
              <th className="py-4 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-2">
                Pos
              </th>
              <th className="py-4 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-2">
                Giocatore
              </th>
              <th className="py-4 px-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-2">
                PG
              </th>
              <th className="py-4 px-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-2">
                V
              </th>
              <th className="py-4 px-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-2">
                P
              </th>
              <th className="py-4 px-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-2">
                Set V/P
              </th>
              <th className="py-4 px-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-2">
                Game V/P
              </th>
              <th className="py-4 px-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-2">
                Punti
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2f7de1]/10">
            {sortedStandings.map((entry, idx) => {
              const position = idx + 1;
              const setsDiff = entry.sets_won - entry.sets_lost;
              const gamesDiff = entry.games_won - entry.games_lost;
              
              return (
                <tr 
                  key={entry.player_id}
                  className={`hover:bg-[#2f7de1]/10 transition-colors ${
                    position === 1 ? 'bg-[#7de3ff]/5' : ''
                  }`}
                >
                  <td className="py-4 px-4">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      position === 1 
                        ? 'bg-[#7de3ff]/20 text-[#7de3ff] font-bold' 
                        : position <= 3
                        ? 'bg-[#2f7de1]/20 text-[#4fb3ff]'
                        : 'text-muted-2'
                    }`}>
                      {position}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-medium text-white">
                      {entry.player_name}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    {entry.matches_played}
                  </td>
                  <td className="py-4 px-4 text-center text-blue-300 font-medium">
                    {entry.wins}
                  </td>
                  <td className="py-4 px-4 text-center text-cyan-300">
                    {entry.losses}
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    <span className={setsDiff > 0 ? 'text-blue-300' : setsDiff < 0 ? 'text-cyan-300' : ''}>
                      {entry.sets_won}/{entry.sets_lost}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    <span className={gamesDiff > 0 ? 'text-blue-300' : gamesDiff < 0 ? 'text-cyan-300' : ''}>
                      {entry.games_won}/{entry.games_lost}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-bold text-[#7de3ff] text-lg">
                      {entry.points}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile view - Cards */}
      <div className="md:hidden space-y-3">
        {sortedStandings.map((entry, idx) => {
          const position = idx + 1;
          const setsDiff = entry.sets_won - entry.sets_lost;
          const gamesDiff = entry.games_won - entry.games_lost;
          
          return (
            <div
              key={entry.player_id}
              className={`rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-4 ${
                position === 1 ? 'border-[#7de3ff]/50 bg-[#7de3ff]/5' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    position === 1 
                      ? 'bg-[#7de3ff]/20 text-[#7de3ff] font-bold text-lg' 
                      : position <= 3
                      ? 'bg-[#2f7de1]/20 text-[#4fb3ff] font-semibold'
                      : 'bg-[#0c1424]/60 text-muted-2'
                  }`}>
                    {position}
                  </div>
                  <span className="font-semibold text-white">
                    {entry.player_name}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#7de3ff]">
                    {entry.points}
                  </div>
                  <div className="text-xs text-muted-2">punti</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <div className="text-xs text-muted-2 mb-1">Match</div>
                  <div className="text-white font-medium">{entry.matches_played}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-2 mb-1">V/P</div>
                  <div className="text-white font-medium">
                    <span className="text-blue-300">{entry.wins}</span>
                    /
                    <span className="text-cyan-300">{entry.losses}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-2 mb-1">Set Diff</div>
                  <div className={`font-medium ${
                    setsDiff > 0 ? 'text-blue-300' : setsDiff < 0 ? 'text-cyan-300' : 'text-white'
                  }`}>
                    {setsDiff > 0 ? '+' : ''}{setsDiff}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="text-xs text-muted-2 text-center pt-4 border-t border-[#2f7de1]/20">
        <p>PG = Partite Giocate • V = Vittorie • P = Perdite • Punti: Vittoria = 3, Sconfitta = 0</p>
      </div>
    </div>
  );
}
