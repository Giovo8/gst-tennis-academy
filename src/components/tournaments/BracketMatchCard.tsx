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
    if (player.player_name) return player.player_name;
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
    <div className="rounded-xl overflow-hidden bg-white border border-gray-200">
      {/* Match Header - colored */}
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'var(--secondary)' }}>
        <span className="text-xs font-bold text-white uppercase tracking-wide">
          {match.round_name} · Match {match.match_number}
        </span>
        <div className="flex items-center gap-2">
          {isPending && <span className="text-xs text-white/40">In attesa</span>}
          {isCompleted && <Trophy className="h-4 w-4 text-white" />}
          {isAdmin && !isPending && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1 text-white hover:bg-white/10 rounded transition-colors"
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
        <div className={`p-3 space-y-1.5 ${isPending ? 'opacity-60' : ''}`}>
          {/* Player 1 */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: isCompleted && !isWinner(match.player1?.id) ? '#9ca3af' : isCompleted ? '#023047' : 'var(--secondary)' }}>
            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">
              <span className="text-sm font-bold text-white leading-none">
                {getPlayerName(match.player1).charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="flex-1 min-w-0 text-sm font-semibold truncate text-white">
              {getPlayerName(match.player1)}
            </span>
            {sets.length > 0 && (
              <div className="flex gap-1.5">
                {sets.map((set, idx) => (
                  <span key={idx} className={`text-xs font-bold px-2 py-0.5 rounded min-w-[28px] text-center ${set.player1_score > set.player2_score ? 'bg-white/20 text-white' : 'text-white'}`}>
                    {set.player1_score}
                  </span>
                ))}
              </div>
            )}
            <span className="text-xl font-bold w-8 text-center flex-shrink-0 text-white">
              {player1SetsWon}
            </span>
          </div>

          {/* Player 2 */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: isCompleted && !isWinner(match.player2?.id) ? '#9ca3af' : isCompleted ? '#023047' : 'var(--secondary)' }}>
            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">
              <span className="text-sm font-bold text-white leading-none">
                {getPlayerName(match.player2).charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="flex-1 min-w-0 text-sm font-semibold truncate text-white">
              {getPlayerName(match.player2)}
            </span>
            {sets.length > 0 && (
              <div className="flex gap-1.5">
                {sets.map((set, idx) => (
                  <span key={idx} className={`text-xs font-bold px-2 py-0.5 rounded min-w-[28px] text-center ${set.player2_score > set.player1_score ? 'bg-white/20 text-white' : 'text-white'}`}>
                    {set.player2_score}
                  </span>
                ))}
              </div>
            )}
            <span className="text-xl font-bold w-8 text-center flex-shrink-0 text-white">
              {player2SetsWon}
            </span>
          </div>

          {/* Footer */}
          {(match.court_number || match.scheduled_time) && (
            <div className="flex items-center justify-between px-3 pt-1 text-xs text-secondary/40">
              {match.court_number && <span>Campo {match.court_number}</span>}
              {match.scheduled_time && (
                <span>{new Date(match.scheduled_time).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
