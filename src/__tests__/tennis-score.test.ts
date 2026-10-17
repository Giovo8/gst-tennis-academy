import {
  computeMatchResult,
  countSetsWon,
  getRetiredPlayer,
  validateFinishedSet,
} from '@/lib/tournaments/tennisScore';
import { getBestOf } from '@/lib/tournaments/getBestOf';

const s = (player1_score: number, player2_score: number) => ({ player1_score, player2_score });

describe('getBestOf', () => {
  it('usa match_format come fonte di verità', () => {
    expect(getBestOf({ match_format: 'best_of_1', best_of: 3 })).toBe(1);
    expect(getBestOf({ match_format: 'best_of_5', best_of: 3 })).toBe(5);
    expect(getBestOf({ match_format: 'best_of_3' })).toBe(3);
  });

  it('ripiega su best_of e poi su 3', () => {
    expect(getBestOf({ best_of: 5 })).toBe(5);
    expect(getBestOf({ match_format: 'boh', best_of: null })).toBe(3);
    expect(getBestOf(null)).toBe(3);
  });
});

describe('validateFinishedSet', () => {
  it.each([
    [6, 0], [6, 4], [4, 6], [7, 5], [7, 6], [6, 7], [8, 6], [12, 10], [10, 8], [10, 4],
  ])('accetta %i-%i', (a, b) => {
    expect(validateFinishedSet(a, b)).toBeNull();
  });

  it.each([
    [6, 5], [5, 3], [6, 6], [7, 3], [7, 7], [9, 3], [11, 8],
  ])('rifiuta %i-%i', (a, b) => {
    expect(validateFinishedSet(a, b)).not.toBeNull();
  });
});

describe('computeMatchResult', () => {
  it('determina il vincitore al meglio di 3', () => {
    const r = computeMatchResult([s(6, 4), s(3, 6), s(10, 8)], 3);
    expect(r).toMatchObject({ ok: true, winner: 1, setsWon: [2, 1], retired: false });
  });

  it('accetta un set unico nei tornei best_of_1', () => {
    expect(computeMatchResult([s(4, 6)], 1)).toMatchObject({ ok: true, winner: 2 });
  });

  it('rifiuta un incontro incompleto', () => {
    const r = computeMatchResult([s(6, 4)], 3);
    expect(r.ok).toBe(false);
  });

  it('rifiuta set oltre la conclusione o oltre bestOf', () => {
    expect(computeMatchResult([s(6, 4), s(6, 4), s(6, 4)], 3).ok).toBe(false);
    expect(computeMatchResult([s(6, 4), s(4, 6), s(6, 4), s(6, 4)], 3).ok).toBe(false);
  });

  it('rifiuta valori non interi o mancanti', () => {
    expect(computeMatchResult([{ player1_score: '6', player2_score: 4 }], 1).ok).toBe(false);
    expect(computeMatchResult([s(6.5, 4)], 1).ok).toBe(false);
    expect(computeMatchResult('x', 3).ok).toBe(false);
    expect(computeMatchResult([], 3).ok).toBe(false);
  });

  describe('ritiro', () => {
    it('marca il set in corso come interrotto e assegna la vittoria all\'avversario', () => {
      const r = computeMatchResult([s(6, 3), s(2, 4)], 3, 2);
      expect(r).toMatchObject({ ok: true, winner: 1, setsWon: [1, 0], retired: true });
      if (r.ok) expect(r.sets[1]).toEqual({ player1_score: 2, player2_score: 4, interrupted: true });
    });

    it('vince chi non si ritira anche se era in vantaggio il ritirato', () => {
      const r = computeMatchResult([s(2, 6), s(1, 3)], 3, 2);
      expect(r).toMatchObject({ ok: true, winner: 1 });
    });

    it('consente il ritiro tra un set e l\'altro', () => {
      const r = computeMatchResult([s(6, 3)], 3, 1);
      expect(r).toMatchObject({ ok: true, winner: 2, setsWon: [1, 0] });
      if (r.ok) expect(r.sets[0].interrupted).toBeUndefined();
    });

    it('rifiuta il ritiro su un incontro già concluso', () => {
      expect(computeMatchResult([s(6, 3), s(6, 3)], 3, 2).ok).toBe(false);
    });

    it('il parziale interrotto è ammesso solo come ultimo set', () => {
      expect(computeMatchResult([s(3, 2), s(6, 3)], 3, 2).ok).toBe(false);
    });
  });
});

describe('countSetsWon / getRetiredPlayer', () => {
  it('esclude i set interrotti dal conteggio', () => {
    expect(countSetsWon([s(6, 3), { ...s(1, 4), interrupted: true }])).toEqual([1, 0]);
  });

  it('riconosce il ritirato in un incontro salvato', () => {
    const base = { player1_id: 'p1', player2_id: 'p2' };
    expect(getRetiredPlayer({ ...base, winner_id: 'p1', sets: [s(6, 3), { ...s(1, 4), interrupted: true }] }, 3)).toBe(2);
    expect(getRetiredPlayer({ ...base, winner_id: 'p2', sets: [s(6, 3)] }, 3)).toBe(1);
    expect(getRetiredPlayer({ ...base, winner_id: 'p1', sets: [s(6, 3), s(6, 3)] }, 3)).toBeNull();
    expect(getRetiredPlayer({ ...base, winner_id: 'p1', sets: [] }, 3)).toBeNull();
  });
});
