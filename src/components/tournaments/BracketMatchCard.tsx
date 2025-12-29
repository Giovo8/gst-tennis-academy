'use client';

import React, { useState } from 'react';
import { Trophy, Edit2, Check, X } from 'lucide-react';

interface BracketMatchCardProps {
  match: any;
  isAdmin: boolean;
  onScoreSubmit: (matchId: string, player1Score: number, player2Score: number) => Promise<void>;
}

export default function BracketMatchCard({ match, isAdmin, onScoreSubmit }: BracketMatchCardProps) {
  const [editing, setEditing] = useState(false);
  const [score1, setScore1] = useState(match.player1_score || 0);
  const [score2, setScore2] = useState(match.player2_score || 0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onScoreSubmit(match.id, score1, score2);
      setEditing(false);
    } catch (error) {
      console.error('Error submitting score:', error);
      alert('Errore nell\'aggiornamento del punteggio');
    } finally {
      setSubmitting(false);
    }
  };

  const getPlayerName = (player: any) => {
    if (!player) return 'TBD';
    return player.profiles?.full_name || player.user_id || 'Giocatore';
  };

  const isWinner = (playerId: string | undefined) => {
    return match.winner_id && match.winner_id === playerId;
  };

  return (
    <div className="rounded-lg border border-[#7de3ff]/20 bg-gradient-to-br from-[#0a1929] to-[#0d1f35] overflow-hidden">
      {/* Match Header */}
      <div className="border-b border-[#7de3ff]/10 bg-[#0a1929]/50 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#7de3ff]">
          {match.round_name} - Match #{match.match_number}
        </span>
        {match.status === 'completed' && (
          <Trophy className="h-4 w-4 text-yellow-400" />
        )}
      </div>

      {/* Players */}
      <div className="p-4 space-y-2">
        {/* Player 1 */}
        <div className={`flex items-center justify-between p-3 rounded-lg transition-all ${
          isWinner(match.player1?.user_id) 
            ? 'bg-gradient-to-r from-[#7de3ff]/20 to-transparent ring-2 ring-[#7de3ff]/50' 
            : 'bg-[#0a1929]/40'
        }`}>
          <div className="flex items-center gap-2 flex-1">
            {isWinner(match.player1?.user_id) && (
              <Trophy className="h-4 w-4 text-[#7de3ff]" />
            )}
            <span className={`text-sm font-medium ${
              isWinner(match.player1?.user_id) ? 'text-white' : 'text-gray-300'
            }`}>
              {getPlayerName(match.player1)}
            </span>
            {match.player1?.seed && (
              <span className="text-xs text-gray-500">#{match.player1.seed}</span>
            )}
          </div>
          {editing && isAdmin ? (
            <input
              type="number"
              value={score1}
              onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
              className="w-16 rounded border border-[#7de3ff]/30 bg-[#0a1929] px-2 py-1 text-center text-sm text-white focus:border-[#7de3ff] focus:outline-none"
              min="0"
              max="99"
            />
          ) : (
            <span className={`text-lg font-bold ${
              isWinner(match.player1?.user_id) ? 'text-[#7de3ff]' : 'text-gray-400'
            }`}>
              {match.player1_score || 0}
            </span>
          )}
        </div>

        {/* VS Divider */}
        <div className="text-center">
          <span className="text-xs text-gray-500 font-semibold">VS</span>
        </div>

        {/* Player 2 */}
        <div className={`flex items-center justify-between p-3 rounded-lg transition-all ${
          isWinner(match.player2?.user_id) 
            ? 'bg-gradient-to-r from-[#7de3ff]/20 to-transparent ring-2 ring-[#7de3ff]/50' 
            : 'bg-[#0a1929]/40'
        }`}>
          <div className="flex items-center gap-2 flex-1">
            {isWinner(match.player2?.user_id) && (
              <Trophy className="h-4 w-4 text-[#7de3ff]" />
            )}
            <span className={`text-sm font-medium ${
              isWinner(match.player2?.user_id) ? 'text-white' : 'text-gray-300'
            }`}>
              {getPlayerName(match.player2)}
            </span>
            {match.player2?.seed && (
              <span className="text-xs text-gray-500">#{match.player2.seed}</span>
            )}
          </div>
          {editing && isAdmin ? (
            <input
              type="number"
              value={score2}
              onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
              className="w-16 rounded border border-[#7de3ff]/30 bg-[#0a1929] px-2 py-1 text-center text-sm text-white focus:border-[#7de3ff] focus:outline-none"
              min="0"
              max="99"
            />
          ) : (
            <span className={`text-lg font-bold ${
              isWinner(match.player2?.user_id) ? 'text-[#7de3ff]' : 'text-gray-400'
            }`}>
              {match.player2_score || 0}
            </span>
          )}
        </div>
      </div>

      {/* Match Actions */}
      {isAdmin && match.status !== 'completed' && match.player1 && match.player2 && (
        <div className="border-t border-[#7de3ff]/10 p-3 bg-[#0a1929]/30">
          {editing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] px-3 py-2 text-sm font-bold text-[#0a1929] hover:shadow-lg transition-all disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {submitting ? 'Salvataggio...' : 'Salva'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setScore1(match.player1_score || 0);
                  setScore2(match.player2_score || 0);
                }}
                disabled={submitting}
                className="rounded-lg border border-[#7de3ff]/30 bg-[#0a1929] px-3 py-2 text-sm text-gray-300 hover:bg-[#0a1929]/80 transition-all disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#7de3ff]/30 bg-[#0a1929] px-3 py-2 text-sm text-gray-300 hover:bg-[#0a1929]/80 hover:text-white transition-all"
            >
              <Edit2 className="h-4 w-4" />
              Inserisci Risultato
            </button>
          )}
        </div>
      )}

      {/* Match Status */}
      {match.status === 'completed' && (
        <div className="border-t border-[#7de3ff]/10 px-4 py-2 bg-gradient-to-r from-green-500/10 to-transparent">
          <span className="text-xs text-green-400 font-semibold">Completato</span>
        </div>
      )}
    </div>
  );
}
