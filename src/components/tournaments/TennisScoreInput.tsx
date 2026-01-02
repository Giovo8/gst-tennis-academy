'use client';

import React, { useState } from 'react';
import { Check, X, Plus, Trash2 } from 'lucide-react';

interface Set {
  player1_score: number;
  player2_score: number;
}

interface TennisScoreInputProps {
  matchId: string;
  player1Name: string;
  player2Name: string;
  currentSets: Set[];
  bestOf: number; // 3 or 5
  onSubmit: (matchId: string, sets: Set[]) => Promise<void>;
  onCancel: () => void;
}

export default function TennisScoreInput({
  matchId,
  player1Name,
  player2Name,
  currentSets,
  bestOf,
  onSubmit,
  onCancel,
}: TennisScoreInputProps) {
  const [sets, setSets] = useState<Set[]>(
    currentSets.length > 0 ? currentSets : [{ player1_score: 0, player2_score: 0 }]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const addSet = () => {
    if (sets.length >= bestOf) {
      setError(`Massimo ${bestOf} set per questo formato`);
      return;
    }
    setSets([...sets, { player1_score: 0, player2_score: 0 }]);
    setError('');
  };

  const removeSet = (index: number) => {
    if (sets.length === 1) {
      setError('Serve almeno un set');
      return;
    }
    const newSets = sets.filter((_, i) => i !== index);
    setSets(newSets);
    setError('');
  };

  const updateSet = (index: number, player: 'player1' | 'player2', value: string) => {
    const score = parseInt(value) || 0;
    if (score < 0 || score > 99) return;

    const newSets = [...sets];
    newSets[index] = {
      ...newSets[index],
      [`${player}_score`]: score,
    };
    setSets(newSets);
    setError('');
  };

  const validateSets = (): string | null => {
    // Check if at least one set is filled
    const hasValidSet = sets.some(
      (set) => set.player1_score > 0 || set.player2_score > 0
    );
    if (!hasValidSet) {
      return 'Inserisci almeno un punteggio';
    }

    // Validate each set
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      const max = Math.max(set.player1_score, set.player2_score);
      const min = Math.min(set.player1_score, set.player2_score);

      // Skip empty sets
      if (max === 0 && min === 0) continue;

      // Tennis rules validation
      if (max === 7 && min === 6) {
        // Valid: 7-6 tiebreak
        continue;
      } else if (max >= 6) {
        if (max - min < 2) {
          return `Set ${i + 1}: Devi vincere con 2 game di differenza (${set.player1_score}-${set.player2_score})`;
        }
      } else if (max > 0) {
        return `Set ${i + 1}: Servono almeno 6 game per vincere (${set.player1_score}-${set.player2_score})`;
      }
    }

    // Check if match is complete (someone won enough sets)
    const setsToWin = Math.ceil(bestOf / 2);
    const player1Sets = sets.filter(s => s.player1_score > s.player2_score).length;
    const player2Sets = sets.filter(s => s.player2_score > s.player1_score).length;

    if (player1Sets < setsToWin && player2Sets < setsToWin) {
      return `Match incompleto: servono ${setsToWin} set per vincere (al meglio dei ${bestOf})`;
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateSets();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Filter out empty sets
      const validSets = sets.filter(
        (set) => set.player1_score > 0 || set.player2_score > 0
      );
      await onSubmit(matchId, validSets);
    } catch (err: any) {
      setError(err.message || 'Errore nel salvataggio del punteggio');
      setSubmitting(false);
    }
  };

  const calculateSetsWon = () => {
    let p1 = 0, p2 = 0;
    sets.forEach(set => {
      if (set.player1_score > set.player2_score) p1++;
      else if (set.player2_score > set.player1_score) p2++;
    });
    return { p1, p2 };
  };

  const setsWon = calculateSetsWon();
  const setsToWin = Math.ceil(bestOf / 2);

  return (
    <div className="rounded-lg border border-tournament-border/30 bg-tournament-bg/90 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white mb-1">Inserisci Punteggio Tennis</h4>
          <p className="text-xs text-gray-400">Al meglio dei {bestOf} set (vince con {setsToWin} set)</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-tournament-primary">
            {setsWon.p1} - {setsWon.p2}
          </div>
          <div className="text-xs text-gray-400">Set vinti</div>
        </div>
      </div>

      {/* Players Header */}
      <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center pb-2 border-b border-tournament-border/20">
        <div className="text-sm font-medium text-white truncate">{player1Name}</div>
        <div className="text-xs text-gray-500 w-16 text-center">Set</div>
        <div className="text-sm font-medium text-white truncate text-right">{player2Name}</div>
      </div>

      {/* Sets */}
      <div className="space-y-2">
        {sets.map((set, index) => (
          <div key={index} className="grid grid-cols-[1fr,auto,1fr,auto] gap-2 items-center">
            {/* Player 1 Score */}
            <input
              type="number"
              value={set.player1_score}
              onChange={(e) => updateSet(index, 'player1', e.target.value)}
              className="w-full rounded border border-tournament-border/30 bg-tournament-bg-light px-3 py-2 text-center text-white focus:border-tournament-primary focus:outline-none"
              min="0"
              max="99"
              placeholder="0"
            />

            {/* Set Label */}
            <div className="text-xs text-gray-400 w-16 text-center">
              Set {index + 1}
            </div>

            {/* Player 2 Score */}
            <input
              type="number"
              value={set.player2_score}
              onChange={(e) => updateSet(index, 'player2', e.target.value)}
              className="w-full rounded border border-tournament-border/30 bg-tournament-bg-light px-3 py-2 text-center text-white focus:border-tournament-primary focus:outline-none"
              min="0"
              max="99"
              placeholder="0"
            />

            {/* Remove button */}
            {sets.length > 1 && (
              <button
                onClick={() => removeSet(index)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Set Button */}
      {sets.length < bestOf && (
        <button
          onClick={addSet}
          className="w-full rounded-lg border border-dashed border-tournament-border/30 bg-tournament-bg-light/50 px-4 py-2 text-sm text-tournament-primary hover:bg-tournament-bg-light transition-colors flex items-center justify-center gap-2"
          type="button"
        >
          <Plus className="h-4 w-4" />
          Aggiungi Set
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 rounded-lg bg-tournament-primary px-4 py-2 text-sm font-semibold text-tournament-bg hover:bg-tournament-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Check className="h-4 w-4" />
          {submitting ? 'Salvataggio...' : 'Salva Punteggio'}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-gray-600 bg-gray-800/50 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          <X className="h-4 w-4" />
          Annulla
        </button>
      </div>

      {/* Hint */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 Regole tennis:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Minimo 6 game per vincere un set</li>
          <li>Vince con 2 game di differenza (es: 6-4, 7-5)</li>
          <li>Tiebreak a 7 se 6-6 (risultato: 7-6)</li>
        </ul>
      </div>
    </div>
  );
}
