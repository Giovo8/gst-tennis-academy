/**
 * Campionato in corso: partite di un nuovo iscritto, aggiunte al calendario esistente
 * senza toccare le partite già presenti (giocate o da giocare).
 *
 * Per ogni avversario si sceglie, nell'ordine:
 * 1. una giornata in cui l'avversario riposa e il nuovo iscritto non gioca ancora;
 * 2. una giornata in cui il nuovo iscritto non gioca ancora (l'avversario ne gioca due);
 * 3. una giornata nuova in coda al calendario.
 * Con iscritti dispari ogni giornata ha un solo riposo: il nuovo iscritto prende il posto
 * del riposo in ogni giornata, come in un calendario generato da zero.
 */
export interface ScheduledMatch {
  round_number: number | null;
  player1_id: string | null;
  player2_id: string | null;
}

export interface PlannedMatch {
  opponentId: string;
  roundNumber: number;
}

export function planNewParticipantMatches(
  opponentIds: string[],
  matches: ScheduledMatch[],
): PlannedMatch[] {
  const playingByRound = new Map<number, Set<string>>();
  for (const m of matches) {
    if (!m.round_number || m.round_number <= 0) continue;
    const playing = playingByRound.get(m.round_number) ?? new Set<string>();
    if (m.player1_id) playing.add(m.player1_id);
    if (m.player2_id) playing.add(m.player2_id);
    playingByRound.set(m.round_number, playing);
  }
  const rounds = [...playingByRound.keys()].sort((a, b) => a - b);
  const restRounds = (opponentId: string) =>
    rounds.filter((r) => !playingByRound.get(r)!.has(opponentId));

  const usedRounds = new Set<number>();
  const planned: PlannedMatch[] = [];
  const pending: string[] = [];

  // Prima chi ha meno giornate di riposo, così non resta senza posto libero
  const byFewestRests = [...opponentIds].sort(
    (a, b) => restRounds(a).length - restRounds(b).length,
  );
  for (const opponentId of byFewestRests) {
    const round = restRounds(opponentId).find((r) => !usedRounds.has(r));
    if (round === undefined) {
      pending.push(opponentId);
      continue;
    }
    usedRounds.add(round);
    planned.push({ opponentId, roundNumber: round });
  }

  let nextRound = (rounds[rounds.length - 1] ?? 0) + 1;
  for (const opponentId of pending) {
    let round = rounds.find((r) => !usedRounds.has(r));
    if (round === undefined) round = nextRound++;
    usedRounds.add(round);
    planned.push({ opponentId, roundNumber: round });
  }

  return planned.sort((a, b) => a.roundNumber - b.roundNumber);
}
