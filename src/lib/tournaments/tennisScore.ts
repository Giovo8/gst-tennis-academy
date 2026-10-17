/**
 * Regole di punteggio tennis condivise tra form (TennisScoreInput) e API
 * (PUT /api/tournaments/[id]/matches/[matchId]).
 *
 * Un ritiro si registra con il set in corso marcato `interrupted: true`; il giocatore
 * ritirato è sempre lo sconfitto (winner_id), quindi non serve una colonna dedicata.
 */

export interface SetScore {
  player1_score: number;
  player2_score: number;
  /** Set non concluso per ritiro: escluso dal conteggio dei set vinti */
  interrupted?: boolean;
}

export type PlayerNum = 1 | 2;

export type ScoreResult =
  // `error?: undefined` permette il narrowing anche con strictNullChecks disattivato
  | { ok: true; sets: SetScore[]; winner: PlayerNum; setsWon: [number, number]; retired: boolean; error?: undefined }
  | { ok: false; error: string };

const isScore = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 99;

/** Errore di un set concluso, o null se il punteggio è valido */
export function validateFinishedSet(p1: number, p2: number): string | null {
  const max = Math.max(p1, p2);
  const min = Math.min(p1, p2);
  if (p1 === p2) return `un set non può finire in parità (${p1}-${p2})`;
  if (max < 6) return `servono almeno 6 game per vincere il set (${p1}-${p2})`;
  if (max === 6) return min <= 4 ? null : `servono 2 game di differenza (${p1}-${p2})`;
  if (max === 7) return min >= 5 ? null : `punteggio impossibile: sul 6-${min} il set era già chiuso (${p1}-${p2})`;
  // Set lungo ai vantaggi (8-6, 12-10…) o super tie-break a 10 punti
  if (max - min === 2 || (max === 10 && min <= 8)) return null;
  return `punteggio non valido (${p1}-${p2})`;
}

export const isFinishedSet = (s: SetScore) => !s.interrupted && validateFinishedSet(s.player1_score, s.player2_score) === null;

export const setsToWinFor = (bestOf: number) => Math.ceil(bestOf / 2);

/** Set vinti da ciascun giocatore (i set interrotti non contano) */
export function countSetsWon(sets: SetScore[]): [number, number] {
  let won1 = 0;
  let won2 = 0;
  for (const s of sets) {
    if (s.interrupted) continue;
    if (s.player1_score > s.player2_score) won1++;
    else if (s.player2_score > s.player1_score) won2++;
  }
  return [won1, won2];
}

/**
 * Valida il risultato completo di un incontro e ne determina il vincitore.
 * @param retiredPlayer giocatore che si è ritirato (1 o 2), se l'incontro non è stato completato
 */
export function computeMatchResult(rawSets: unknown, bestOf: number, retiredPlayer?: PlayerNum | null): ScoreResult {
  if (!Array.isArray(rawSets)) return { ok: false, error: 'Elenco dei set mancante' };
  if (rawSets.length > bestOf) return { ok: false, error: `Troppi set: l'incontro è al meglio di ${bestOf}` };
  if (rawSets.length === 0 && !retiredPlayer) return { ok: false, error: 'Inserisci almeno un set' };

  const setsToWin = setsToWinFor(bestOf);
  const sets: SetScore[] = [];
  let won1 = 0;
  let won2 = 0;

  for (let i = 0; i < rawSets.length; i++) {
    const raw = rawSets[i] as Partial<SetScore> | null;
    const p1 = raw?.player1_score;
    const p2 = raw?.player2_score;
    if (!isScore(p1) || !isScore(p2)) return { ok: false, error: `Set ${i + 1}: i punteggi devono essere numeri interi` };

    if (won1 === setsToWin || won2 === setsToWin) {
      return { ok: false, error: `L'incontro era già concluso prima del set ${i + 1}: rimuovi i set in eccesso` };
    }

    const isLast = i === rawSets.length - 1;
    const finishedError = validateFinishedSet(p1, p2);

    if (finishedError && retiredPlayer && isLast) {
      // Set in corso al momento del ritiro: basta che sia un parziale plausibile
      if (Math.max(p1, p2) > 9) return { ok: false, error: `Set ${i + 1}: punteggio parziale non valido (${p1}-${p2})` };
      sets.push({ player1_score: p1, player2_score: p2, interrupted: true });
      continue;
    }
    if (finishedError) return { ok: false, error: `Set ${i + 1}: ${finishedError}` };

    sets.push({ player1_score: p1, player2_score: p2 });
    if (p1 > p2) won1++;
    else won2++;
  }

  const decided = won1 === setsToWin || won2 === setsToWin;

  if (retiredPlayer) {
    if (decided) return { ok: false, error: "Con questi set l'incontro è già concluso: togli il ritiro" };
    return { ok: true, sets, winner: retiredPlayer === 1 ? 2 : 1, setsWon: [won1, won2], retired: true };
  }

  if (!decided) return { ok: false, error: `Incontro incompleto: servono ${setsToWin} set per vincere` };
  return { ok: true, sets, winner: won1 > won2 ? 1 : 2, setsWon: [won1, won2], retired: false };
}

/** Giocatore ritirato in un incontro già salvato (lo sconfitto, se il vincitore non ha i set necessari) */
export function getRetiredPlayer(
  match: { sets?: SetScore[] | null; winner_id?: string | null; player1_id?: string | null; player2_id?: string | null },
  bestOf: number
): PlayerNum | null {
  const sets = match.sets || [];
  // Senza set non si distingue un ritiro da un risultato legacy (player1_sets/player2_sets)
  if (!match.winner_id || sets.length === 0) return null;
  const [won1, won2] = countSetsWon(sets);
  const setsToWin = setsToWinFor(bestOf);
  if (match.winner_id === match.player1_id && (won1 < setsToWin || sets.some((s) => s.interrupted))) return 2;
  if (match.winner_id === match.player2_id && (won2 < setsToWin || sets.some((s) => s.interrupted))) return 1;
  return null;
}
