/**
 * @jest-environment node
 *
 * Partite di un nuovo iscritto a campionato in corso (planNewParticipantMatches)
 */

import {
  planNewParticipantMatches,
  type ScheduledMatch,
} from '@/lib/tournaments/championshipSchedule';

/** Calendario a rotazione come in generate-championship. */
function roundRobin(ids: string[]): ScheduledMatch[] {
  const slots: (string | null)[] = [...ids];
  if (slots.length % 2 !== 0) slots.push(null);
  const indexes = slots.map((_, i) => i);
  const matches: ScheduledMatch[] = [];
  for (let round = 0; round < slots.length - 1; round++) {
    for (let i = 0; i < slots.length / 2; i++) {
      const home = slots[indexes[i]];
      const away = slots[indexes[slots.length - 1 - i]];
      if (home && away) {
        matches.push({ round_number: round + 1, player1_id: home, player2_id: away });
      }
    }
    indexes.splice(1, 0, indexes.pop()!);
  }
  return matches;
}

const playersIn = (matches: ScheduledMatch[], round: number) =>
  matches.filter((m) => m.round_number === round).flatMap((m) => [m.player1_id, m.player2_id]);

describe('planNewParticipantMatches', () => {
  it('iscritti dispari: una partita per giornata contro chi riposa, nessuna giornata nuova', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const matches = roundRobin(ids);
    const planned = planNewParticipantMatches(ids, matches);

    expect(planned).toHaveLength(5);
    expect(new Set(planned.map((p) => p.opponentId))).toEqual(new Set(ids));
    expect(planned.map((p) => p.roundNumber)).toEqual([1, 2, 3, 4, 5]);
    for (const p of planned) {
      expect(playersIn(matches, p.roundNumber)).not.toContain(p.opponentId);
    }
  });

  it('iscritti pari: una partita in ogni giornata esistente più una giornata nuova', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const matches = roundRobin(ids);
    const planned = planNewParticipantMatches(ids, matches);

    expect(planned).toHaveLength(4);
    expect(new Set(planned.map((p) => p.opponentId))).toEqual(new Set(ids));
    expect(planned.map((p) => p.roundNumber)).toEqual([1, 2, 3, 4]);
  });

  it('calendario senza partite: ogni partita in una giornata nuova', () => {
    const planned = planNewParticipantMatches(['a', 'b'], []);
    expect(planned.map((p) => p.roundNumber)).toEqual([1, 2]);
  });

  it('non modifica le partite esistenti', () => {
    const ids = ['a', 'b', 'c'];
    const matches = roundRobin(ids);
    const snapshot = JSON.parse(JSON.stringify(matches));
    planNewParticipantMatches(ids, matches);
    expect(matches).toEqual(snapshot);
  });

  it('rimuovere un atleta e aggiungerne un altro gli dà le stesse giornate (campionato pari)', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const matches = roundRobin(ids);
    const roundsOfA = matches
      .filter((m) => m.player1_id === 'a' || m.player2_id === 'a')
      .map((m) => m.round_number)
      .sort();
    const withoutA = matches.filter((m) => m.player1_id !== 'a' && m.player2_id !== 'a');

    const planned = planNewParticipantMatches(['b', 'c', 'd', 'e', 'f'], withoutA);

    expect(planned.map((p) => p.roundNumber).sort()).toEqual(roundsOfA);
    for (const p of planned) {
      const original = matches.find(
        (m) => m.round_number === p.roundNumber && (m.player1_id === 'a' || m.player2_id === 'a'),
      )!;
      expect([original.player1_id, original.player2_id]).toContain(p.opponentId);
    }
  });
});
