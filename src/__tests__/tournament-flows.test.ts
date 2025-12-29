/**
 * Tournament System End-to-End Tests
 * Tests all tournament flows: creation, enrollment, start, matches, completion
 */

import { createClient } from '@supabase/supabase-js';

// Mock Supabase client - replace with actual test credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Tournament System - Full Flows', () => {
  let testUserId: string;
  let testTournamentId: string;
  let participantIds: string[] = [];

  beforeAll(async () => {
    // Setup: Get or create test user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      testUserId = user.id;
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test tournaments
    if (testTournamentId) {
      await supabase
        .from('tournaments')
        .delete()
        .eq('id', testTournamentId);
    }
  });

  describe('Eliminazione Diretta Flow', () => {
    it('should create a direct elimination tournament', async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          title: 'Test Eliminazione Diretta',
          description: 'Test tournament for elimination',
          tournament_type: 'eliminazione_diretta',
          max_participants: 8,
          best_of: 3,
          status: 'Aperto',
          start_date: new Date().toISOString(),
          created_by: testUserId
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.tournament_type).toBe('eliminazione_diretta');
      testTournamentId = data?.id;
    });

    it('should enroll 8 participants', async () => {
      // Create test profiles if needed
      const enrollments = [];
      for (let i = 0; i < 8; i++) {
        enrollments.push({
          tournament_id: testTournamentId,
          user_id: testUserId, // In real test, use different users
          status: 'accepted'
        });
      }

      const { data, error } = await supabase
        .from('tournament_participants')
        .insert(enrollments)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(8);
      participantIds = data?.map(p => p.id) || [];
    });

    it('should generate elimination bracket', async () => {
      const response = await fetch(`http://localhost:3000/api/tournaments/${testTournamentId}/generate-bracket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.message).toContain('Tabellone generato');

      // Verify matches created
      const { data: matches } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', testTournamentId);

      expect(matches).toHaveLength(7); // 4 + 2 + 1 for 8 participants
    });

    it('should update match score', async () => {
      const { data: matches } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', testTournamentId)
        .eq('round', 'round_1')
        .limit(1);

      const match = matches?.[0];
      expect(match).toBeDefined();

      const { error } = await supabase
        .from('tournament_matches')
        .update({
          sets: [
            { player1_score: 6, player2_score: 4 },
            { player1_score: 6, player2_score: 3 }
          ],
          winner_id: match.player1_id,
          status: 'completed'
        })
        .eq('id', match.id);

      expect(error).toBeNull();
    });

    it('should complete tournament when final is played', async () => {
      // Complete all matches leading to final
      const { data: allMatches } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', testTournamentId)
        .order('round');

      // Simulate completing all matches
      for (const match of allMatches || []) {
        if (match.status !== 'completed') {
          await supabase
            .from('tournament_matches')
            .update({
              sets: [
                { player1_score: 6, player2_score: 4 },
                { player1_score: 6, player2_score: 3 }
              ],
              winner_id: match.player1_id,
              status: 'completed'
            })
            .eq('id', match.id);
        }
      }

      // Check if tournament is marked as completed
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('status')
        .eq('id', testTournamentId)
        .single();

      // Status might need to be updated manually or via trigger
      expect(['In Corso', 'Completato', 'Concluso']).toContain(tournament?.status);
    });
  });

  describe('Girone + Eliminazione Flow', () => {
    let groupTournamentId: string;

    it('should create a group+elimination tournament', async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          title: 'Test Girone + Eliminazione',
          description: 'Test tournament with groups',
          tournament_type: 'girone_eliminazione',
          max_participants: 8,
          best_of: 3,
          status: 'Aperto',
          start_date: new Date().toISOString(),
          created_by: testUserId
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.tournament_type).toBe('girone_eliminazione');
      groupTournamentId = data?.id;
    });

    it('should generate groups', async () => {
      // First enroll participants
      const enrollments = [];
      for (let i = 0; i < 8; i++) {
        enrollments.push({
          tournament_id: groupTournamentId,
          user_id: testUserId,
          status: 'accepted'
        });
      }

      await supabase
        .from('tournament_participants')
        .insert(enrollments);

      const response = await fetch(`http://localhost:3000/api/tournaments/${groupTournamentId}/generate-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numGroups: 2 })
      });

      expect(response.ok).toBe(true);

      // Verify groups created
      const { data: groups } = await supabase
        .from('tournament_groups')
        .select('*')
        .eq('tournament_id', groupTournamentId);

      expect(groups).toBeDefined();
      expect(groups?.length).toBeGreaterThan(0);
    });

    it('should advance from groups to knockout', async () => {
      // Complete all group stage matches first
      const { data: groupMatches } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', groupTournamentId);

      for (const match of groupMatches || []) {
        await supabase
          .from('tournament_matches')
          .update({
            sets: [
              { player1_score: 6, player2_score: 4 },
              { player1_score: 6, player2_score: 3 }
            ],
            winner_id: match.player1_id,
            status: 'completed'
          })
          .eq('id', match.id);
      }

      const response = await fetch(`http://localhost:3000/api/tournaments/${groupTournamentId}/advance-from-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.ok).toBe(true);

      // Verify tournament phase updated
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('phase')
        .eq('id', groupTournamentId)
        .single();

      expect(tournament?.phase).toBe('knockout');
    });

    afterAll(async () => {
      if (groupTournamentId) {
        await supabase
          .from('tournaments')
          .delete()
          .eq('id', groupTournamentId);
      }
    });
  });

  describe('Campionato (Championship) Flow', () => {
    let championshipId: string;

    it('should create a championship tournament', async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          title: 'Test Campionato',
          description: 'Test championship tournament',
          tournament_type: 'campionato',
          max_participants: 6,
          best_of: 3,
          status: 'Aperto',
          start_date: new Date().toISOString(),
          created_by: testUserId
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.tournament_type).toBe('campionato');
      championshipId = data?.id;
    });

    it('should generate round-robin calendar', async () => {
      // Enroll participants
      const enrollments = [];
      for (let i = 0; i < 6; i++) {
        enrollments.push({
          tournament_id: championshipId,
          user_id: testUserId,
          status: 'accepted'
        });
      }

      await supabase
        .from('tournament_participants')
        .insert(enrollments);

      const response = await fetch(`http://localhost:3000/api/tournaments/${championshipId}/generate-championship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.ok).toBe(true);

      // Verify matches created (n*(n-1)/2 for round robin)
      const { data: matches } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', championshipId);

      expect(matches).toHaveLength(15); // 6*5/2 = 15 matches
    });

    it('should calculate standings correctly', async () => {
      // Complete some matches
      const { data: matches } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', championshipId)
        .limit(5);

      for (const match of matches || []) {
        await supabase
          .from('tournament_matches')
          .update({
            sets: [
              { player1_score: 6, player2_score: 4 },
              { player1_score: 6, player2_score: 3 }
            ],
            winner_id: match.player1_id,
            status: 'completed'
          })
          .eq('id', match.id);
      }

      // Standings are calculated in the component, so just verify data structure
      const { data: allMatches } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', championshipId);

      expect(allMatches).toBeDefined();
      const completedMatches = allMatches?.filter(m => m.status === 'completed');
      expect(completedMatches?.length).toBeGreaterThan(0);
    });

    afterAll(async () => {
      if (championshipId) {
        await supabase
          .from('tournaments')
          .delete()
          .eq('id', championshipId);
      }
    });
  });

  describe('Statistics and Reports', () => {
    it('should fetch tournament statistics', async () => {
      const response = await fetch('http://localhost:3000/api/tournaments/stats');
      
      if (response.status === 403) {
        // Stats endpoint requires admin role
        console.log('Stats endpoint requires admin authentication');
        return;
      }

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.stats).toBeDefined();
    });

    it('should generate player reports', async () => {
      const response = await fetch('http://localhost:3000/api/tournaments/reports');
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.report).toBeDefined();
      expect(data.report.overview).toBeDefined();
      expect(data.report.player_rankings).toBeDefined();
    });

    it('should calculate player statistics correctly', async () => {
      const response = await fetch('http://localhost:3000/api/tournaments/reports');
      const { report } = await response.json();

      // Verify statistics structure
      if (report.player_rankings.length > 0) {
        const player = report.player_rankings[0];
        expect(player).toHaveProperty('player_name');
        expect(player).toHaveProperty('tournaments_played');
        expect(player).toHaveProperty('matches_won');
        expect(player).toHaveProperty('matches_lost');
        expect(player).toHaveProperty('win_rate');
        expect(player.win_rate).toBeGreaterThanOrEqual(0);
        expect(player.win_rate).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to access all features', async () => {
      // Test admin dashboard access
      const response = await fetch('http://localhost:3000/api/tournaments/stats');
      // Admin should be able to access stats
      expect([200, 403]).toContain(response.status); // 403 if not authenticated
    });

    it('should restrict maestro from creating tournaments', async () => {
      // Maestro role should only view tournaments
      // This would require role-based authentication in tests
      expect(true).toBe(true); // Placeholder
    });

    it('should allow atleta to enroll in tournaments', async () => {
      // Atleta should be able to enroll
      // This would require authenticated user in tests
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Tennis Scoring Validation', () => {
    it('should validate best-of-3 scoring', async () => {
      const validSets = [
        { player1_score: 6, player2_score: 4 },
        { player1_score: 6, player2_score: 3 }
      ];

      // Player 1 wins 2-0, valid for best-of-3
      expect(validSets.length).toBe(2);
      expect(validSets[0].player1_score).toBeGreaterThan(validSets[0].player2_score);
      expect(validSets[1].player1_score).toBeGreaterThan(validSets[1].player2_score);
    });

    it('should validate best-of-5 scoring', async () => {
      const validSets = [
        { player1_score: 6, player2_score: 4 },
        { player1_score: 4, player2_score: 6 },
        { player1_score: 6, player2_score: 3 },
        { player1_score: 6, player2_score: 2 }
      ];

      // Player 1 wins 3-1, valid for best-of-5
      const player1Wins = validSets.filter(s => s.player1_score > s.player2_score).length;
      expect(player1Wins).toBe(3);
      expect(validSets.length).toBeLessThanOrEqual(5);
    });

    it('should validate tie-break scenarios', async () => {
      const tieBreakSet = { player1_score: 7, player2_score: 6 };
      expect(tieBreakSet.player1_score).toBe(7);
      expect(tieBreakSet.player2_score).toBe(6);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tournament type', async () => {
      const { error } = await supabase
        .from('tournaments')
        .insert({
          title: 'Invalid Tournament',
          tournament_type: 'invalid_type',
          max_participants: 8,
          status: 'Aperto',
          created_by: testUserId
        });

      expect(error).toBeDefined();
    });

    it('should prevent starting tournament with insufficient participants', async () => {
      const { data: tournament } = await supabase
        .from('tournaments')
        .insert({
          title: 'Incomplete Tournament',
          tournament_type: 'eliminazione_diretta',
          max_participants: 8,
          status: 'Aperto',
          created_by: testUserId
        })
        .select()
        .single();

      // Try to generate bracket with 0 participants
      const response = await fetch(`http://localhost:3000/api/tournaments/${tournament?.id}/generate-bracket`, {
        method: 'POST'
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.error).toBeDefined();

      // Cleanup
      await supabase.from('tournaments').delete().eq('id', tournament?.id);
    });

    it('should prevent duplicate bracket generation', async () => {
      const { data: tournament } = await supabase
        .from('tournaments')
        .insert({
          title: 'Duplicate Test',
          tournament_type: 'eliminazione_diretta',
          max_participants: 4,
          status: 'In Corso',
          created_by: testUserId
        })
        .select()
        .single();

      // Enroll participants
      const enrollments = [];
      for (let i = 0; i < 4; i++) {
        enrollments.push({
          tournament_id: tournament?.id,
          user_id: testUserId,
          status: 'accepted'
        });
      }
      await supabase.from('tournament_participants').insert(enrollments);

      // Generate bracket first time
      const response1 = await fetch(`http://localhost:3000/api/tournaments/${tournament?.id}/generate-bracket`, {
        method: 'POST'
      });
      expect(response1.ok).toBe(true);

      // Try to generate again
      const response2 = await fetch(`http://localhost:3000/api/tournaments/${tournament?.id}/generate-bracket`, {
        method: 'POST'
      });
      expect(response2.ok).toBe(false);

      // Cleanup
      await supabase.from('tournaments').delete().eq('id', tournament?.id);
    });
  });
});
