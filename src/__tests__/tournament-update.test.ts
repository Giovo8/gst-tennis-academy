/**
 * @jest-environment node
 *
 * Modifica torneo: regole di struttura condivise con la creazione e blocchi di
 * PATCH /api/tournaments/[id] (struttura dopo l'avvio, formato dopo partite giocate).
 */

const mockState = {
  tournament: null as Record<string, unknown> | null,
  participantsCount: 0,
  matches: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
};

jest.mock('@/lib/auth/verifyAuth', () => ({
  verifyAuth: async () => ({
    success: true,
    data: { user: { id: 'user-gestore' }, profile: { role: 'gestore', full_name: 'Gestore' } },
  }),
}));
jest.mock('@/lib/activity/logActivity', () => ({ logActivityServer: async () => {} }));
jest.mock('@/lib/supabase/serverClient', () => ({
  supabaseServer: {
    from: (table: string) => {
      if (table === 'tournaments') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: mockState.tournament }) }) }),
          update: (values: Record<string, unknown>) => {
            mockState.updates.push(values);
            return {
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: { ...mockState.tournament, ...values },
                    error: null,
                  }),
                }),
              }),
            };
          },
        };
      }
      if (table === 'tournament_participants') {
        return { select: () => ({ eq: async () => ({ count: mockState.participantsCount }) }) };
      }
      if (table === 'tournament_matches') {
        return { select: () => ({ eq: async () => ({ data: mockState.matches, error: null }) }) };
      }
      throw new Error(`tabella inattesa: ${table}`);
    },
  },
}));

import { PATCH } from '../app/api/tournaments/[id]/route';
import { getTournamentStructureError } from '@/lib/tournaments/tournamentStructure';
import { updateTournamentSchema } from '@/lib/validation/schemas';

const baseTournament = {
  title: 'Campionato Autunno',
  tournament_type: 'campionato',
  current_phase: 'completato',
  max_participants: 8,
  num_groups: 0,
  teams_per_group: 0,
  teams_advancing: 0,
  match_format: 'best_of_3',
  best_of: 3,
};

const baseBody = {
  title: 'Campionato Autunno',
  description: '',
  start_date: '2026-10-01',
  end_date: null,
  category: 'Open',
  match_format: 'best_of_3',
  tournament_type: 'campionato',
  max_participants: 8,
  num_groups: null,
  teams_per_group: null,
  teams_advancing: null,
};

const patch = (body: Record<string, unknown>) =>
  PATCH(
    new Request('http://localhost/api/tournaments/t1', {
      method: 'PATCH',
      body: JSON.stringify({ ...baseBody, ...body }),
    }) as never,
    { params: Promise.resolve({ id: 't1' }) },
  );

beforeEach(() => {
  mockState.tournament = { ...baseTournament };
  mockState.participantsCount = 6;
  mockState.matches = [];
  mockState.updates = [];
});

describe('getTournamentStructureError', () => {
  it('accetta le strutture valide', () => {
    expect(
      getTournamentStructureError({ tournament_type: 'campionato', max_participants: 10 }),
    ).toBeNull();
    expect(
      getTournamentStructureError({
        tournament_type: 'eliminazione_diretta',
        max_participants: 16,
      }),
    ).toBeNull();
    expect(
      getTournamentStructureError({
        tournament_type: 'girone_eliminazione',
        max_participants: 16,
        num_groups: 4,
        teams_per_group: 4,
        teams_advancing: 2,
      }),
    ).toBeNull();
  });

  it('rifiuta le strutture non valide con gli stessi messaggi della creazione', () => {
    expect(
      getTournamentStructureError({ tournament_type: 'campionato', max_participants: 2 }),
    ).toBe('Per un campionato, max_participants deve essere almeno 3');
    expect(
      getTournamentStructureError({
        tournament_type: 'eliminazione_diretta',
        max_participants: 10,
      }),
    ).toMatch(/^Per eliminazione diretta/);
    expect(
      getTournamentStructureError({
        tournament_type: 'girone_eliminazione',
        max_participants: 12,
        num_groups: 4,
        teams_per_group: 4,
        teams_advancing: 2,
      }),
    ).toBe('Per 4 gironi con 4 squadre, max_participants deve essere 16');
  });
});

describe('updateTournamentSchema', () => {
  it('rifiuta data di fine precedente all’inizio e nome vuoto', () => {
    expect(updateTournamentSchema.safeParse({ ...baseBody, end_date: '2026-09-01' }).success).toBe(
      false,
    );
    expect(updateTournamentSchema.safeParse({ ...baseBody, title: '   ' }).success).toBe(false);
    expect(updateTournamentSchema.safeParse(baseBody).success).toBe(true);
  });
});

describe('PATCH /api/tournaments/[id]', () => {
  it('a competizione avviata modifica nome, date e categoria senza toccare la struttura', async () => {
    const res = await patch({ title: 'Nuovo nome', category: 'Veterani', end_date: '2026-12-20' });
    expect(res.status).toBe(200);
    expect(mockState.updates[0]).toEqual({
      title: 'Nuovo nome',
      description: '',
      start_date: '2026-10-01',
      end_date: '2026-12-20',
      category: 'Veterani',
    });
  });

  it('a competizione avviata rifiuta il cambio di tipo o di partecipanti', async () => {
    expect((await patch({ max_participants: 10 })).status).toBe(409);
    expect(
      (await patch({ tournament_type: 'eliminazione_diretta', max_participants: 8 })).status,
    ).toBe(409);
    expect(mockState.updates).toHaveLength(0);
  });

  it('rifiuta il cambio di formato se ci sono partite giocate', async () => {
    mockState.matches = [{ status: 'completata', winner_id: 'p1', sets: [] }];
    expect((await patch({ match_format: 'best_of_5' })).status).toBe(409);
    expect(mockState.updates).toHaveLength(0);
  });

  it('consente il cambio di formato se nessuna partita è stata giocata', async () => {
    mockState.matches = [{ status: 'programmata', winner_id: null, sets: null }];
    expect((await patch({ match_format: 'best_of_5' })).status).toBe(200);
    expect(mockState.updates[0].match_format).toBe('best_of_5');
  });

  it('in fase iscrizioni modifica la struttura, ma non sotto il numero di iscritti', async () => {
    mockState.tournament = { ...baseTournament, current_phase: 'iscrizioni' };
    expect((await patch({ max_participants: 5 })).status).toBe(409);
    expect((await patch({ max_participants: 12 })).status).toBe(200);
    expect(mockState.updates[0].max_participants).toBe(12);
  });
});
