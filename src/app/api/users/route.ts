import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { verifyAuth } from '@/lib/auth/verifyAuth';
import { isBookableCoachProfile } from '@/lib/roles';
import logger from '@/lib/logger/secure-logger';

/**
 * GET /api/users — utenti selezionabili in prenotazioni, iscrizioni e chat.
 * Gli atleti vedono solo i maestri prenotabili; maestro, gestore e admin vedono tutti.
 * Ogni utente ha il flag calcolato `is_bookable_coach`.
 */
export async function GET(req: Request) {
  try {
    const auth = await verifyAuth(req, ['admin', 'gestore', 'maestro', 'atleta']);
    if (!auth.success) return auth.response;

    const roleLower = String(auth.data.profile?.role).toLowerCase();

    const { data: users, error } = await supabaseServer
      .from('profiles')
      .select('id, full_name, email, role, avatar_url, metadata')
      .not('role', 'is', null)
      .order('full_name', { ascending: true, nullsFirst: false });

    if (error) {
      logger.error('Error fetching users', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filteredUsers =
      roleLower === 'atleta'
        ? // Maestri e gestori con ruolo secondario "maestro"
          (users || []).filter((user) => isBookableCoachProfile(user))
        : users || [];

    const usersResponse = filteredUsers.map((user) => ({
      ...user,
      is_bookable_coach: isBookableCoachProfile(user),
    }));

    return NextResponse.json({ users: usersResponse });
  } catch (error) {
    logger.error('Error in users API', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
