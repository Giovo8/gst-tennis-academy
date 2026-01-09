'use client';

import { useState } from 'react';
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
    <div className={`rounded-lg border overflow-hidden hover:shadow-md transition-all ${
      isPending 
        ? 'bg-gray-50 border-gray-200 opacity-60'
        : 'bg-white border-gray-200'
    }`}>
      {/* Match Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-5 py-3 flex items-center justify-between">
        <span className="text-sm font-bold text-secondary">
          {match.round_name} - Match #{match.match_number}
        </span>
        <div className="flex items-center gap-2">
          {isPending && (
            <span className="text-xs text-secondary/60 font-medium">In attesa</span>
          )}
          {isCompleted && (
            <Trophy className="h-4 w-4 text-yellow-500" />
          )}
          {isAdmin && !isPending && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 text-secondary/60 hover:text-secondary hover:bg-secondary/5 rounded transition-colors"
              title="Modifica punteggio"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Edit Mode */}
      {editing ? (
        <div className="p-5">
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
          <div className="p-5">
            {/* Player 1 */}
            <div className={`flex items-center gap-4 px-5 py-4 rounded-t-md transition-all border-l-4 ${
              isWinner(match.player1?.id) 
                ? 'bg-secondary/5 border-secondary' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex-1 min-w-0">
                <span className={`text-base font-semibold ${
                  isWinner(match.player1?.id) ? 'text-secondary' : 'text-secondary/70'
                }`}>
                  {getPlayerName(match.player1)}
                </span>
              </div>
              {sets.length > 0 && (
                <div className="flex gap-2">
                  {sets.map((set, idx) => (
                    <span
                      key={idx}
                      className={`text-sm font-bold px-2 py-1 rounded min-w-[32px] text-center ${
                        set.player1_score > set.player2_score
                          ? 'bg-secondary text-white'
                          : 'bg-gray-200 text-secondary/60'
                      }`}
                    >
                      {set.player1_score}
                    </span>
                  ))}
                </div>
              )}
              <span className={`text-2xl font-bold w-12 text-center ${
                isWinner(match.player1?.id) ? 'text-secondary' : 'text-secondary/40'
              }`}>
                {player1SetsWon}
              </span>
            </div>

            {/* Player 2 */}
            <div className={`flex items-center gap-4 px-5 py-4 rounded-b-md transition-all border-l-4 ${
              isWinner(match.player2?.id) 
                ? 'bg-secondary/5 border-secondary' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex-1 min-w-0">
                <span className={`text-base font-semibold ${
                  isWinner(match.player2?.id) ? 'text-secondary' : 'text-secondary/70'
                }`}>
                  {getPlayerName(match.player2)}
                </span>
              </div>
              {sets.length > 0 && (
                <div className="flex gap-2">
                  {sets.map((set, idx) => (
                    <span
                      key={idx}
                      className={`text-sm font-bold px-2 py-1 rounded min-w-[32px] text-center ${
                        set.player2_score > set.player1_score
                          ? 'bg-secondary text-white'
                          : 'bg-gray-200 text-secondary/60'
                      }`}
                    >
                      {set.player2_score}
                    </span>
                  ))}
                </div>
              )}
              <span className={`text-2xl font-bold w-12 text-center ${
                isWinner(match.player2?.id) ? 'text-secondary' : 'text-secondary/40'
              }`}>
                {player2SetsWon}
              </span>
            </div>
          </div>

          {/* Match Info Footer */}
          {(match.court_number || match.scheduled_time) && (
            <div className="border-t border-gray-200 bg-gray-50 px-5 py-3 flex items-center justify-between text-sm text-secondary/70">
              {match.court_number && <span className="font-medium">Campo {match.court_number}</span>}
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
