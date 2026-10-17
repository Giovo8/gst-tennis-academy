import { normalizeScoreboard, romeDay, type EspnScoreboard } from '@/lib/live-tennis/espn';

const DAY = '2026-10-17';

function competition(id: string, state: string, date: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    date,
    status: {
      period: 2,
      type: { name: state === 'in' ? 'STATUS_IN_PROGRESS' : 'STATUS_FINAL', state },
    },
    type: { slug: 'mens-singles', text: "Men's Singles" },
    round: { displayName: 'Semifinal' },
    competitors: [
      {
        order: 2,
        possession: false,
        linescores: [{ value: 3, winner: false }, { value: 0 }],
        athlete: { displayName: 'Daniil Medvedev', flag: { href: 'https://x/500/rus.png' } },
      },
      {
        order: 1,
        possession: true,
        curatedRank: { current: 12 },
        linescores: [{ value: 6, winner: true }, { value: 1 }],
        athlete: { displayName: 'Rafael Jodar', flag: { href: 'https://x/500/esp.png' } },
      },
    ],
    ...extra,
  };
}

const data: EspnScoreboard = {
  events: [
    {
      name: 'Rolex Shanghai Masters',
      groupings: [
        {
          grouping: { displayName: "Men's Singles" },
          competitions: [
            competition('1', 'in', '2026-10-17T11:05Z'),
            competition('2', 'post', '2026-10-10T11:05Z'), // altro giorno
            competition('4', 'post', '2026-10-16T22:30Z'), // 00:30 del 17 in Italia
            competition('5', 'in', '2026-10-16T18:00Z'), // in corso dal giorno prima
            competition('3', 'post', '2026-10-17T08:00Z'),
          ],
        },
      ],
    },
  ],
};

describe('normalizeScoreboard', () => {
  it('tiene le partite del giorno (ora italiana) e quelle in corso', () => {
    const matches = normalizeScoreboard(data, 'ATP', DAY);
    expect(matches.map((m) => m.id)).toEqual(['ATP-1', 'ATP-4', 'ATP-5', 'ATP-3']);
  });

  it('normalizza stato, turno e giocatori', () => {
    const matches = normalizeScoreboard(data, 'ATP', DAY);

    const live = matches[0];
    expect(live.state).toBe('live');
    expect(live.statusLabel).toBe('2° set');
    expect(live.round).toBe('Semifinale');
    expect(live.category).toBe('Singolare maschile');
    expect(live.players[0]).toMatchObject({
      name: 'Rafael Jodar',
      country: 'ESP',
      rank: 12,
      serving: true,
    });
    expect(live.players[0].sets).toEqual([{ games: 6, won: true }, { games: 1 }]);
    expect(live.players[1]).toMatchObject({ name: 'Daniil Medvedev', serving: false });
  });

  it('non segna il servizio nelle partite concluse', () => {
    const finished = normalizeScoreboard(data, 'ATP', DAY).find((m) => m.id === 'ATP-3');
    expect(finished?.state).toBe('finished');
    expect(finished?.statusLabel).toBe('Finale');
    expect(finished?.players.every((p) => !p.serving)).toBe(true);
  });

  it('mostra una bandiera per ogni giocatore della coppia di doppio', () => {
    const doubles: EspnScoreboard = {
      events: [
        {
          name: 'Wuhan Open',
          groupings: [
            {
              competitions: [
                competition('9', 'post', '2026-10-17T08:00Z', {
                  type: { slug: 'womens-doubles' },
                  competitors: [1, 2].map((order) => ({
                    order,
                    roster: {
                      shortDisplayName: 'S. Hunter / K. Siniakova',
                      athletes: [
                        { flag: { href: 'https://x/500/aus.png' } },
                        { flag: { href: 'https://x/500/cze.png' } },
                      ],
                    },
                  })),
                }),
              ],
            },
          ],
        },
      ],
    };
    const [match] = normalizeScoreboard(doubles, 'WTA', DAY);
    expect(match.category).toBe('Doppio femminile');
    expect(match.players[0].flags?.map((fl) => fl.country)).toEqual(['AUS', 'CZE']);
  });

  it('romeDay usa il fuso di Roma', () => {
    expect(romeDay('2026-10-16T22:30:00Z')).toBe('2026-10-17');
    expect(romeDay('2026-10-16T21:30:00Z')).toBe('2026-10-16');
  });
});
