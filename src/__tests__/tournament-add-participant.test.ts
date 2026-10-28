/**
 * @jest-environment node
 *
 * POST /api/tournaments/[id]/add-participant: atleta registrato o ospite senza account
 * aggiunto a un campionato in corso, con le sole partite nuove.
 */

const mockState = {
  tournament: null as Record<string, unknown> | null,
  participants: [] as Record<string, unknown>[],
  matches: [] as Record<string, unknown>[],
  insertedParticipants: [] as Record<string, unknown>[],
  insertedMatches: [] as Record<string, unknown>[],
  tournamentUpdates: [] as Record<string, unknown>[],
  notifications: [] as Record<string, unknown>[],
  profileLookups: 0,
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
      switch (table) {
        case 'tournaments':
          return {
            select: () => ({
              eq: () => ({ single: async () => ({ data: mockState.tournament }) }),
            }),
            update: (values: Record<string, unknown>) => {
              mockState.tournamentUpdates.push(values);
              return { eq: async () => ({ error: null }) };
            },
          };
        case 'profiles':
          return {
            select: () => ({
              eq: () => ({
                single: async () => {
                  mockState.profileLookups++;
                  return { data: { id: 'u9', role: 'atleta', full_name: 'Nuovo Atleta' } };
                },
              }),
            }),
          };
        case 'tournament_participants':
          return {
            select: () => ({
              eq: async () => ({ data: mockState.participants, error: null }),
            }),
            insert: (rows: Record<string, unknown>[]) => {
              mockState.insertedParticipants.push(...rows);
              return {
                select: () => ({
                  single: async () => ({ data: { id: 'p-new', ...rows[0] }, error: null }),
                }),
              };
            },
            delete: () => ({ eq: async () => ({ error: null }) }),
          };
        case 'tournament_matches':
          return {
            select: () => ({ eq: async () => ({ data: mockState.matches, error: null }) }),
            insert: async (rows: Record<string, unknown>[]) => {
              mockState.insertedMatches.push(...rows);
              return { error: null };
            },
          };
        case 'notifications':
          return {
            insert: async (row: Record<string, unknown>) => {
              mockState.notifications.push(row);
              return { error: null };
            },
          };
        default:
          throw new Error(`tabella inattesa: ${table}`);
      }
    },
  },
}));

import { POST } from '../app/api/tournaments/[id]/add-participant/route';
import { addTournamentParticipantSchema, enrollGuestSchema } from '@/lib/validation/schemas';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TOURNAMENT_ID = '22222222-2222-4222-8222-222222222222';

const post = (body: Record<string, unknown>) =>
  POST(
    new Request('http://localhost/api/tournaments/t1/add-participant', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as never,
    { params: Promise.resolve({ id: 't1' }) },
  );

beforeEach(() => {
  mockState.tournament = {
    title: 'GST League',
    tournament_type: 'campionato',
    status: 'In Corso',
    max_participants: 3,
  };
  mockState.participants = [
    { id: 'p1', user_id: 'u1', player_name: null },
    { id: 'p2', user_id: 'u2', player_name: null },
    { id: 'p3', user_id: null, player_name: 'Mario Rossi' },
  ];
  mockState.matches = [
    { round_number: 1, match_number: 1, player1_id: 'p1', player2_id: 'p2' },
    { round_number: 2, match_number: 2, player1_id: 'p1', player2_id: 'p3' },
    { round_number: 3, match_number: 3, player1_id: 'p2', player2_id: 'p3' },
  ];
  mockState.insertedParticipants = [];
  mockState.insertedMatches = [];
  mockState.tournamentUpdates = [];
  mockState.notifications = [];
  mockState.profileLookups = 0;
});

describe('schemi ospite', () => {
  it('serve un atleta oppure il nome di un ospite, mai entrambi', () => {
    expect(addTournamentParticipantSchema.safeParse({ user_id: USER_ID }).success).toBe(true);
    expect(addTournamentParticipantSchema.safeParse({ player_name: 'Luca Bianchi' }).success).toBe(
      true,
    );
    expect(addTournamentParticipantSchema.safeParse({}).success).toBe(false);
    expect(
      addTournamentParticipantSchema.safeParse({ user_id: USER_ID, player_name: 'Luca' }).success,
    ).toBe(false);
  });

  it('il nome ospite si ripulisce e ha una lunghezza ragionevole', () => {
    const ok = enrollGuestSchema.safeParse({
      tournament_id: TOURNAMENT_ID,
      player_name: '  Luca  ',
    });
    expect(ok.success && ok.data.player_name).toBe('Luca');
    expect(
      enrollGuestSchema.safeParse({ tournament_id: TOURNAMENT_ID, player_name: ' L ' }).success,
    ).toBe(false);
    expect(
      enrollGuestSchema.safeParse({ tournament_id: TOURNAMENT_ID, player_name: 'x'.repeat(101) })
        .success,
    ).toBe(false);
  });
});

describe('POST /api/tournaments/[id]/add-participant', () => {
  it('aggiunge un ospite: solo il nome, partite nuove, niente profilo né notifica', async () => {
    const res = await post({ player_name: 'Luca Bianchi' });

    expect(res.status).toBe(201);
    expect(mockState.insertedParticipants).toEqual([
      { player_name: 'Luca Bianchi', tournament_id: 't1' },
    ]);
    expect(mockState.insertedMatches).toHaveLength(3);
    expect(mockState.insertedMatches.every((m) => m.player1_id === 'p-new')).toBe(true);
    expect(mockState.profileLookups).toBe(0);
    expect(mockState.notifications).toHaveLength(0);
    // era al completo (3 su 3): il massimo sale con il nuovo iscritto
    expect(mockState.tournamentUpdates).toEqual([{ max_participants: 4 }]);
  });

  it('rifiuta un ospite con lo stesso nome di un altro, senza distinguere le maiuscole', async () => {
    const res = await post({ player_name: ' mario rossi ' });

    expect(res.status).toBe(409);
    expect(mockState.insertedParticipants).toHaveLength(0);
    expect(mockState.insertedMatches).toHaveLength(0);
  });

  it('rifiuta una richiesta senza atleta né ospite, o con entrambi', async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ user_id: USER_ID, player_name: 'Luca' })).status).toBe(400);
    expect(mockState.insertedParticipants).toHaveLength(0);
  });

  it('un atleta registrato continua a ricevere la notifica', async () => {
    const res = await post({ user_id: USER_ID });

    expect(res.status).toBe(201);
    expect(mockState.insertedParticipants).toEqual([{ user_id: USER_ID, tournament_id: 't1' }]);
    expect(mockState.profileLookups).toBe(1);
    expect(mockState.notifications).toHaveLength(1);
    expect(mockState.notifications[0].user_id).toBe(USER_ID);
  });
});
