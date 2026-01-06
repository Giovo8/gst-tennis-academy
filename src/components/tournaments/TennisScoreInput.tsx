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
    <div className="rounded-md border border-gray-200 bg-white p-6 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <h4 className="text-lg font-bold text-secondary mb-1">Inserisci Punteggio</h4>
          <p className="text-sm text-secondary/60">Al meglio di {bestOf} set (vince con {setsToWin} set)</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-secondary">{player1Name}</span>
          <span className="text-secondary/40 font-semibold">-</span>
          <span className="font-bold text-secondary">{player2Name}</span>
        </div>
      </div>

      {/* Sets */}
      <div className="space-y-3">
        {sets.map((set, index) => (
          <div key={index} className="bg-secondary/5 rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-secondary">Set {index + 1}</div>
              {sets.length > 1 && (
                <button
                  onClick={() => removeSet(index)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                  type="button"
                  title="Rimuovi set"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Player 1 Score */}
              <div>
                <label className="text-xs font-semibold text-secondary/60 uppercase block mb-2">
                  {player1Name}
                </label>
                <input
                  type="number"
                  value={set.player1_score}
                  onChange={(e) => updateSet(index, 'player1', e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-center text-2xl font-bold text-secondary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  min="0"
                  max="99"
                  placeholder="0"
                />
              </div>

              {/* Player 2 Score */}
              <div>
                <label className="text-xs font-semibold text-secondary/60 uppercase block mb-2">
                  {player2Name}
                </label>
                <input
                  type="number"
                  value={set.player2_score}
                  onChange={(e) => updateSet(index, 'player2', e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-center text-2xl font-bold text-secondary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  min="0"
                  max="99"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Set Button */}
      {sets.length < bestOf && (
        <button
          onClick={addSet}
          className="w-full rounded-md border-2 border-dashed border-secondary/30 bg-secondary/5 px-4 py-3 text-sm font-semibold text-secondary hover:bg-secondary/10 hover:border-secondary/50 transition-all flex items-center justify-center gap-2"
          type="button"
        >
          <Plus className="h-4 w-4" />
          Aggiungi Set
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 rounded-md bg-secondary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <Check className="h-4 w-4" />
          {submitting ? 'Salvataggio...' : 'Salva Punteggio'}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-secondary/70 hover:bg-secondary/5 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          <X className="h-4 w-4" />
          Annulla
        </button>
      </div>
    </div>
  );
}
