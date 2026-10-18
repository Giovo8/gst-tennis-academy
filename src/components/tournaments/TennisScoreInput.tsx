'use client';

import { Fragment, useRef, useState } from 'react';
import { computeMatchResult, setsToWinFor, validateFinishedSet, type PlayerNum, type SetScore } from '@/lib/tournaments/tennisScore';

interface TennisScoreInputProps {
  matchId: string;
  player1Name: string;
  player2Name: string;
  currentSets: SetScore[];
  /** Giocatore ritirato nel risultato già salvato (per la modifica da admin) */
  currentRetiredPlayer?: PlayerNum | null;
  bestOf: number; // 1, 3 or 5
  onSubmit: (matchId: string, sets: SetScore[], retiredPlayer: PlayerNum | null) => Promise<void>;
  onCancel: () => void;
}

type PlayerKey = 'p1' | 'p2';
type Cell = Record<PlayerKey, string>;

export default function TennisScoreInput({
  matchId,
  player1Name,
  player2Name,
  currentSets,
  currentRetiredPlayer = null,
  bestOf,
  onSubmit,
  onCancel,
}: TennisScoreInputProps) {
  const [cells, setCells] = useState<Cell[]>(() =>
    Array.from({ length: bestOf }, (_, i) => {
      const s = currentSets[i];
      return s ? { p1: String(s.player1_score), p2: String(s.player2_score) } : { p1: '', p2: '' };
    })
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [retiring, setRetiring] = useState(currentRetiredPlayer !== null);
  const [retiredPlayer, setRetiredPlayer] = useState<PlayerNum | null>(currentRetiredPlayer);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setsToWin = setsToWinFor(bestOf);
  const parsed = cells.map((c) => ({
    p1: c.p1 === '' ? null : Number(c.p1),
    p2: c.p2 === '' ? null : Number(c.p2),
  }));

  const setWinnerAt = (i: number): 0 | 1 | 2 => {
    const { p1, p2 } = parsed[i];
    if (p1 === null || p2 === null || p1 === p2) return 0;
    return p1 > p2 ? 1 : 2;
  };

  // Contano solo i set conclusi con un punteggio valido (un parziale come 4-2 non è un set vinto)
  const isFinishedAt = (i: number) => {
    const { p1, p2 } = parsed[i];
    return p1 !== null && p2 !== null && validateFinishedSet(p1, p2) === null;
  };

  let won1 = 0;
  let won2 = 0;
  let decidedAt = -1;
  for (let i = 0; i < bestOf && decidedAt === -1; i++) {
    if (!isFinishedAt(i)) continue;
    const w = setWinnerAt(i);
    if (w === 1) won1++;
    if (w === 2) won2++;
    if (won1 === setsToWin || won2 === setsToWin) decidedAt = i;
  }
  const effectiveRetired = retiring ? retiredPlayer : null;
  const matchWinner: 0 | PlayerNum = effectiveRetired
    ? effectiveRetired === 1 ? 2 : 1
    : decidedAt === -1 ? 0 : won1 > won2 ? 1 : 2;
  const visibleSets = decidedAt === -1 ? bestOf : decidedAt + 1;

  const updateCell = (setIndex: number, player: PlayerKey, raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    setCells((prev) => prev.map((c, i) => (i === setIndex ? { ...c, [player]: digits } : c)));
    setError('');

    // "1" può essere l'inizio di 10+ (tie-break lungo): in quel caso non avanzare
    if (digits.length === 2 || (digits.length === 1 && digits !== '1')) {
      const flatIndex = setIndex * 2 + (player === 'p1' ? 0 : 1);
      inputRefs.current[flatIndex + 1]?.focus();
    }
  };

  const validate = (): { sets?: SetScore[]; error?: string } => {
    if (retiring && !retiredPlayer) return { error: 'Indica quale giocatore si è ritirato' };

    const raw: SetScore[] = [];
    for (let i = 0; i < visibleSets; i++) {
      const { p1, p2 } = parsed[i];
      if (p1 === null && p2 === null) break;
      if (p1 === null || p2 === null) return { error: `Set ${i + 1}: inserisci entrambi i punteggi` };
      raw.push({ player1_score: p1, player2_score: p2 });
    }

    // Stesse regole applicate dall'API
    const result = computeMatchResult(raw, bestOf, effectiveRetired);
    return result.ok ? { sets: result.sets } : { error: result.error };
  };

  const handleSubmit = async () => {
    const { sets, error: validationError } = validate();
    if (validationError || !sets) {
      setError(validationError || 'Punteggio non valido');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmit(matchId, sets, effectiveRetired);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio del punteggio');
      setSubmitting(false);
    }
  };

  const players: { key: PlayerKey; num: 1 | 2; name: string }[] = [
    { key: 'p1', num: 1, name: player1Name },
    { key: 'p2', num: 2, name: player2Name },
  ];

  return (
    <div className="rounded-lg border border-black/10 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-black/10 bg-gray-50">
        <h4 className="text-sm font-bold text-secondary">Inserisci Punteggio</h4>
      </div>

      <div className="p-3 sm:p-5 space-y-4">
        {/* Scoreboard */}
        <div
          className="grid grid-cols-[var(--cols-mobile)] sm:grid-cols-[var(--cols-desktop)] items-center gap-x-1.5 gap-y-2 sm:gap-x-2"
          style={
            {
              '--cols-mobile': `repeat(${visibleSets + 1}, minmax(0, 1fr))`,
              '--cols-desktop': `minmax(0, 1fr) repeat(${visibleSets}, auto) auto`,
            } as React.CSSProperties
          }
        >
          {/* Intestazione (solo desktop) */}
          <div className="hidden sm:block text-[11px] font-semibold uppercase tracking-wide text-secondary/60">
            Partecipanti
          </div>
          {cells.slice(0, visibleSets).map((_, i) => (
            <div
              key={i}
              className="hidden sm:block text-center text-[11px] font-semibold uppercase tracking-wide text-secondary/60"
            >
              Set {i + 1}
            </div>
          ))}
          <div className="hidden sm:block text-center text-[11px] font-semibold uppercase tracking-wide text-secondary/60">
            Tot
          </div>

          {players.map((player) => {
            const isMatchWinner = matchWinner === player.num;
            return (
              <Fragment key={player.key}>
                <div
                  className={`col-span-full sm:col-span-1 mt-1 sm:mt-0 flex h-10 sm:h-12 min-w-0 items-center gap-1.5 rounded-lg border px-3 ${
                    isMatchWinner ? 'border-[#023047] bg-[#023047]' : 'border-secondary bg-secondary'
                  }`}
                >
                  <span className="truncate text-sm font-semibold text-white" title={player.name}>
                    {player.name}
                  </span>
                </div>

                {cells.slice(0, visibleSets).map((_, i) => (
                  <div
                    key={`label-${i}`}
                    className="sm:hidden -mb-1 text-center text-[10px] leading-none font-semibold uppercase tracking-wide text-secondary/60"
                  >
                    Set {i + 1}
                  </div>
                ))}
                <div className="sm:hidden -mb-1 text-center text-[10px] leading-none font-semibold uppercase tracking-wide text-secondary/60">
                  Tot
                </div>

                {cells.slice(0, visibleSets).map((cell, i) => {
                  const winner = setWinnerAt(i);
                  const stateClass =
                    cell.p1 === '' || cell.p2 === '' || winner === 0
                      ? 'border-black/10 bg-white text-secondary'
                      : winner === player.num
                        ? 'border-[#023047] bg-[#023047] text-white'
                        : 'border-secondary bg-secondary text-white';
                  return (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i * 2 + (player.key === 'p1' ? 0 : 1)] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      enterKeyHint="next"
                      maxLength={2}
                      value={cell[player.key]}
                      onChange={(e) => updateCell(i, player.key, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      disabled={submitting}
                      placeholder="–"
                      aria-label={`${player.name} set ${i + 1}`}
                      className={`h-12 w-full sm:w-14 min-w-0 rounded-lg border text-center text-lg sm:text-xl font-bold tabular-nums placeholder:text-secondary/30 focus:outline-none focus:border-secondary transition-colors disabled:opacity-40 ${stateClass}`}
                    />
                  );
                })}

                <div
                  className={`flex h-12 w-full sm:w-14 min-w-0 items-center justify-center rounded-lg border text-lg sm:text-xl font-bold tabular-nums ${
                    won1 + won2 === 0
                      ? 'border-black/10 bg-white text-secondary'
                      : (player.num === 1 ? won1 > won2 : won2 > won1)
                        ? 'border-[#023047] bg-[#023047] text-white'
                        : 'border-secondary bg-secondary text-white'
                  }`}
                  aria-label={`Set vinti da ${player.name}`}
                >
                  {player.num === 1 ? won1 : won2}
                </div>
              </Fragment>
            );
          })}
        </div>

        {/* Ritiro */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={retiring}
              onChange={(e) => {
                setRetiring(e.target.checked);
                setError('');
              }}
              disabled={submitting}
              className="h-4 w-4 accent-secondary"
            />
            Incontro interrotto per ritiro
          </label>
          {retiring && (
            <div className="space-y-1.5">
              <p className="text-xs text-secondary/70">
                Chi si è ritirato? Inserisci i set giocati, compreso il parziale del set interrotto.
              </p>
              <div className="flex flex-wrap gap-2">
                {players.map((player) => (
                  <button
                    key={player.key}
                    type="button"
                    onClick={() => {
                      setRetiredPlayer(player.num);
                      setError('');
                    }}
                    disabled={submitting}
                    className={`min-w-0 max-w-full truncate rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      retiredPlayer === player.num
                        ? 'border-secondary bg-secondary text-white'
                        : 'border-black/10 bg-white text-secondary hover:border-secondary'
                    }`}
                  >
                    {player.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-lg bg-secondary px-4 sm:px-5 py-3 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {submitting ? 'Salvataggio...' : 'Salva Punteggio'}
          </button>
          <button
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-[#023047] bg-[#023047] px-4 sm:px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}
