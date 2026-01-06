'use client';

import React, { useState } from 'react';
import { Trophy, Edit2 } from 'lucide-react';
import TennisScoreInput from './TennisScoreInput';

interface BracketMatchCardProps {
  match: any;
  isAdmin: boolean;
  bestOf: number;
  onScoreSubmit: (matchId: string, sets: Array<{ player1_score: number; player2_score: number }>) => Promise<void>;
}

export default function BracketMatchCard({ match, isAdmin, bestOf, onScoreSubmit }: BracketMatchCardProps) {
  const [editing, setEditing] = useState(false);

  const getPlayerName = (player: any) => {
    if (!player) return 'TBD';
    if (player.profiles?.full_name) return player.profiles.full_name;
    if (player.profiles?.[0]?.full_name) return player.profiles[0].full_name;
    return 'Giocatore';
  };

  const isWinner = (playerId: string | undefined) => {
    return match.winner_id && match.winner_id === playerId;
  };
  
  const matchStatus = match.match_status || match.status || 'scheduled';
  const isCompleted = matchStatus === 'completed' || matchStatus === 'completata';
  const isPending = matchStatus === 'pending' || (!match.player1 || !match.player2);

  // Parse sets from match data
  const sets: Array<{ player1_score: number; player2_score: number }> = match.sets || [];
  
  // Calculate sets won
  const player1SetsWon = sets.filter(s => s.player1_score > s.player2_score).length;
  const player2SetsWon = sets.filter(s => s.player2_score > s.player1_score).length;

  const handleScoreSubmit = async (matchId: string, newSets: Array<{ player1_score: number; player2_score: number }>) => {
    await onScoreSubmit(matchId, newSets);
    setEditing(false);
  };

  return (
    <div className={`rounded-lg border border-gray-200 overflow-hidden ${
      isPending 
        ? 'bg-secondary/[0.03] opacity-60'
        : 'bg-white'
    }`}>
      {/* Match Header */}
      <div className="border-b border-gray-200 bg-secondary/[0.03] px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-secondary/80">
          {match.round_name} - Match #{match.match_number}
        </span>
        <div className="flex items-center gap-2">
          {isPending && (
            <span className="text-xs text-secondary/60">In attesa</span>
          )}
          {isCompleted && (
            <Trophy className="h-4 w-4 text-yellow-500" />
          )}
          {isAdmin && !isPending && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1 text-secondary hover:text-secondary/80 transition-colors"
              title="Modifica punteggio"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Edit Mode */}
      {editing ? (
        <div className="p-4">
          <TennisScoreInput
            matchId={match.id}
            player1Name={getPlayerName(match.player1)}
            player2Name={getPlayerName(match.player2)}
            currentSets={sets}
            bestOf={bestOf}
            onSubmit={handleScoreSubmit}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          {/* Players */}
          <div className="p-4 space-y-2">
            {/* Player 1 */}
            <div className={`flex items-center justify-between p-3 rounded-lg transition-all border ${
              isWinner(match.player1?.id) 
                ? 'bg-secondary/[0.08] border-gray-200' 
                : 'bg-secondary/[0.03] border-transparent'
            }`}>
              <div className="flex items-center gap-2 flex-1">
                <span className={`text-sm font-medium ${
                  isWinner(match.player1?.id) ? 'text-secondary font-semibold' : 'text-secondary/80'
                }`}>
                  {getPlayerName(match.player1)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {sets.length > 0 && (
                  <div className="flex gap-1">
                    {sets.map((set, idx) => (
                      <span
                        key={idx}
                        className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                          set.player1_score > set.player2_score
                            ? 'bg-secondary/[0.08] text-secondary'
                            : 'text-secondary/60'
                        }`}
                      >
                        {set.player1_score}
                      </span>
                    ))}
                  </div>
                )}
                <span className={`text-lg font-bold min-w-[2rem] text-right ${
                  isWinner(match.player1?.id) ? 'text-secondary' : 'text-secondary/60'
                }`}>
                  {player1SetsWon}
                </span>
              </div>
            </div>

            {/* Player 2 */}
            <div className={`flex items-center justify-between p-3 rounded-lg transition-all border ${
              isWinner(match.player2?.id) 
                ? 'bg-secondary/[0.08] border-gray-200' 
                : 'bg-secondary/[0.03] border-transparent'
            }`}>
              <div className="flex items-center gap-2 flex-1">
                <span className={`text-sm font-medium ${
                  isWinner(match.player2?.id) ? 'text-secondary font-semibold' : 'text-secondary/80'
                }`}>
                  {getPlayerName(match.player2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {sets.length > 0 && (
                  <div className="flex gap-1">
                    {sets.map((set, idx) => (
                      <span
                        key={idx}
                        className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                          set.player2_score > set.player1_score
                            ? 'bg-secondary/[0.08] text-secondary'
                            : 'text-secondary/60'
                        }`}
                      >
                        {set.player2_score}
                      </span>
                    ))}
                  </div>
                )}
                <span className={`text-lg font-bold min-w-[2rem] text-right ${
                  isWinner(match.player2?.id) ? 'text-secondary' : 'text-secondary/60'
                }`}>
                  {player2SetsWon}
                </span>
              </div>
            </div>
          </div>

          {/* Match Info Footer */}
          {(match.court_number || match.scheduled_time) && (
            <div className="border-t border-gray-200 bg-secondary/5 px-4 py-2 flex items-center justify-between text-xs text-secondary/70">
              {match.court_number && <span>Campo {match.court_number}</span>}
              {match.scheduled_time && (
                <span>{new Date(match.scheduled_time).toLocaleString('it-IT', { 
                  dateStyle: 'short', 
                  timeStyle: 'short' 
                })}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
