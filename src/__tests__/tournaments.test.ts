import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the server client used by the API routes
vi.mock('@/lib/supabase/serverClient', () => {
  const mockProfiles = new Map<string, any>();
  mockProfiles.set('user-gestore', { id: 'user-gestore', role: 'gestore', full_name: 'Gestore' });
  mockProfiles.set('user-maestro', { id: 'user-maestro', role: 'maestro', full_name: 'Maestro' });
  mockProfiles.set('user-athlete', { id: 'user-athlete', role: 'atleta', full_name: 'Atleta' });
  mockProfiles.set('user-athlete2', { id: 'user-athlete2', role: 'atleta', full_name: 'Atleta 2' });
  mockProfiles.set('user-athlete3', { id: 'user-athlete3', role: 'atleta', full_name: 'Atleta 3' });

  const tournaments = new Map<string, any>();
  const participants = new Map<string, any[]>();

  return {
    supabaseServer: {
      auth: {
        getUser: async (token: string) => {
          const id = token;
          if (!id) return { data: { user: null }, error: null };
          return { data: { user: { id } }, error: null };
        },
      },
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({
                single: async () => ({ data: mockProfiles.get(val) ?? null, error: null }),
              }),
            }),
          };
        }

        if (table === 'tournaments') {
          return {
            insert: (arr: any[]) => ({ select: async () => {
              const t = { ...arr[0], id: `t-${Math.random().toString(36).slice(2,8)}` };
              tournaments.set(t.id, t);
              participants.set(t.id, []);
              return { data: [t], error: null };
            } }),
            select: () => ({
              order: () => ({
                gte: () => ({ then: async () => ({ data: Array.from(tournaments.values()), error: null }) }),
              }),
              eq: (_col: string, val: string) => ({ single: async () => ({ data: tournaments.get(val) ?? null, error: null }) }),
            }),
            order: () => ({ gte: () => ({ then: async () => ({ data: Array.from(tournaments.values()), error: null }) }) }),
            gte: () => ({ then: async () => ({ data: Array.from(tournaments.values()), error: null }) }),
          };
        }

        if (table === 'tournament_participants') {
          return {
            insert: (arr: any[]) => ({ select: async () => {
              const p = { ...arr[0], id: `p-${Math.random().toString(36).slice(2,8)}` };
              const list = participants.get(p.tournament_id) ?? [];
              if (list.find(x => x.user_id === p.user_id)) return { data: null, error: { message: 'duplicate' } };
              list.push(p);
              participants.set(p.tournament_id, list);
              return { data: [p], error: null };
            } }),
            select: (fields?: any, opts?: any) => {
              if (opts && opts.head) {
                return ({ eq: async (_col: string, val: string) => ({ count: (participants.get(val) || []).length, error: null }) });
              }
              return ({
                order: () => ({ eq: async (_col: string, val: string) => ({ data: (participants.get(val) || []).slice().reverse(), error: null }) } ),
                delete: () => ({ eq: (_col: string, val: string) => ({ eq: async (_c2: string, v2: string) => ({ error: null, data: { deleted: (participants.get(v2) || []).filter(x => x.user_id === val).length } }) }) }),
              });
            },
          };
        }

        return { select: async () => ({ data: [], error: null }) };
      },
    },
  };
});

// Import the route handlers after mocking
import { POST as createTournament } from '../app/api/tournaments/route';
import { POST as joinParticipant } from '../app/api/tournament_participants/route';

describe('Tournaments API (mocked)', () => {
  it('allows gestore to create a tournament', async () => {
    const req = new Request('http://localhost/api/tournaments', { method: 'POST', headers: { Authorization: 'user-gestore', 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Mock Cup', start_date: '2026-01-01T10:00:00Z', max_participants: 2, status: 'Aperto' }) });
    const res = await createTournament(req as unknown as Request);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.tournament).toBeDefined();
    expect(json.tournament.title).toBe('Mock Cup');
  });

  it('allows athletes to join until sold out', async () => {
    // first, create tournament as gestore
    const createReq = new Request('http://localhost/api/tournaments', { method: 'POST', headers: { Authorization: 'user-gestore', 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Capacity Cup', start_date: '2026-02-01T10:00:00Z', max_participants: 2, status: 'Aperto' }) });
    const createRes = await createTournament(createReq as unknown as Request);
    const createJson = await createRes.json();
    console.log('CREATE TOURNAMENT RESULT:', createRes.status, createJson?.tournament?.id);
    const tournamentId = createJson.tournament.id;

    // first join
    const joinReq1 = new Request('http://localhost/api/tournament_participants', { method: 'POST', headers: { Authorization: 'user-athlete', 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 'user-athlete', tournament_id: tournamentId }) });
    const r1 = await joinParticipant(joinReq1 as unknown as Request);
    console.log('JOIN1 STATUS:', r1.status);
    const r1Body = await r1.json();
    console.log('JOIN1 BODY:', r1Body);
    expect(r1.status).toBe(201);

    // second join by another athlete
    const joinReq2 = new Request('http://localhost/api/tournament_participants', { method: 'POST', headers: { Authorization: 'user-athlete2', 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 'user-athlete2', tournament_id: tournamentId }) });
    const r2 = await joinParticipant(joinReq2 as unknown as Request);
    console.log('JOIN2 STATUS:', r2.status);
    expect(r2.status).toBe(201);

    // third join should return 409 (full)
    const joinReq3 = new Request('http://localhost/api/tournament_participants', { method: 'POST', headers: { Authorization: 'user-athlete3', 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 'user-athlete3', tournament_id: tournamentId }) });
    const r3 = await joinParticipant(joinReq3 as unknown as Request);
    console.log('JOIN3 STATUS:', r3.status);
    expect(r3.status).toBe(409);
  }, { timeout: 20000 });

  it('allows maestro to register an athlete but not other roles', async () => {
    // create tournament as gestore
    const createReq = new Request('http://localhost/api/tournaments', { method: 'POST', headers: { Authorization: 'user-gestore', 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'CoachEnroll Cup', start_date: '2026-03-01T10:00:00Z', max_participants: 4, status: 'Aperto' }) });
    const createRes = await createTournament(createReq as unknown as Request);
    const createJson = await createRes.json();
    const tournamentId = createJson.tournament.id;

    // maestro registers an athlete (allowed)
    const coachEnrollReq = new Request('http://localhost/api/tournament_participants', { method: 'POST', headers: { Authorization: 'user-maestro', 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 'user-athlete2', tournament_id: tournamentId }) });
    const coachEnrollRes = await joinParticipant(coachEnrollReq as unknown as Request);
    expect(coachEnrollRes.status).toBe(201);

    // maestro tries to register a gestore (forbidden)
    const coachEnrollForbiddenReq = new Request('http://localhost/api/tournament_participants', { method: 'POST', headers: { Authorization: 'user-maestro', 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 'user-gestore', tournament_id: tournamentId }) });
    const coachEnrollForbiddenRes = await joinParticipant(coachEnrollForbiddenReq as unknown as Request);
    expect(coachEnrollForbiddenRes.status).toBe(403);
  });
});
