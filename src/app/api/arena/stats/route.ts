import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { getRouteAuth, unauthorized } from '@/lib/auth/routeAuth';
import logger from '@/lib/logger/secure-logger';

// GET - Fetch arena stats
export async function GET(req: Request) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    if (userId) {
      // Get specific user stats
      const { data, error } = await supabaseServer
        .from('arena_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If stats don't exist, create them
        if (error.code === 'PGRST116') {
          const { data: newStats, error: createError } = await supabaseServer
            .from('arena_stats')
            .insert([{ user_id: userId }])
            .select('*')
            .single();

          if (createError) {
            logger.error('Error creating stats:', createError);
            return NextResponse.json({ error: createError.message }, { status: 500 });
          }

          // Fetch profile separately
          const { data: profile } = await supabaseServer
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', userId)
            .single();

          return NextResponse.json({ stats: { ...newStats, profile } });
        }

        logger.error('Error fetching stats:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Fetch profile separately
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', userId)
        .single();

      return NextResponse.json({ stats: { ...data, profile } });
    } else {
      // Get leaderboard
      const { data, error } = await supabaseServer
        .from('arena_stats')
        .select('*')
        .order('points', { ascending: false })
        .order('wins', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching leaderboard:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Fetch profiles manually
      if (data && data.length > 0) {
        const userIds = data.map((s) => s.user_id).filter(Boolean);

        const { data: profiles } = await supabaseServer
          .from('profiles')
          .select('id, full_name, avatar_url, role, metadata')
          .in('id', userIds);

        // Attach profiles to stats, filtering out admin/gestore without maestro secondary role
        const enrichedLeaderboard = data
          .map((stat) => ({
            ...stat,
            profile: profiles?.find((p) => p.id === stat.user_id),
          }))
          .filter((entry) => {
            const p = entry.profile;
            if (!p) return false;
            if (p.role === 'atleta' || p.role === 'maestro') return true;
            // admin/gestore: only include if "maestro" is in secondary_roles
            const secondaryRoles = (p.metadata as { secondary_roles?: unknown } | null)
              ?.secondary_roles;
            return (
              Array.isArray(secondaryRoles) &&
              (secondaryRoles as string[]).map(String).includes('maestro')
            );
          });

        return NextResponse.json({ leaderboard: enrichedLeaderboard });
      }

      return NextResponse.json({ leaderboard: data || [] });
    }
  } catch (error) {
    logger.error('Error in GET /api/arena/stats:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
