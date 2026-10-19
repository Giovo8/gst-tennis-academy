import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { getRouteAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth/routeAuth';
import { FEEDBACK_CATEGORIE, FEEDBACK_STATI } from '@/lib/validation/schemas';
import logger from '@/lib/logger/secure-logger';

export const dynamic = 'force-dynamic';

const SERVER_ERROR = 'Errore interno del server';

/**
 * GET /api/admin/feedback — elenco feedback per /dashboard/admin/feedback.
 * Solo admin e gestore. Filtri opzionali: ?stato=&categoria=
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized(request);
    if (!isAdmin(auth.role)) return forbidden(request, auth.user.id);

    const { searchParams } = new URL(request.url);
    const stato = searchParams.get('stato');
    const categoria = searchParams.get('categoria');

    let query = supabaseServer
      .from('feedback')
      .select('id, user_id, categoria, titolo, messaggio, stato, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (stato && (FEEDBACK_STATI as readonly string[]).includes(stato)) {
      query = query.eq('stato', stato);
    }
    if (categoria && (FEEDBACK_CATEGORIE as readonly string[]).includes(categoria)) {
      query = query.eq('categoria', categoria);
    }

    const { data, error } = await query;
    if (error) {
      logger.error('Errore nel caricamento dei feedback (admin)', error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    const feedback = data ?? [];
    const userIds = [...new Set(feedback.map((f) => f.user_id))];
    const profilesMap = new Map<
      string,
      { full_name: string | null; email: string | null; role: string | null }
    >();

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseServer
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', userIds);
      profiles?.forEach((p) => profilesMap.set(p.id, p));
    }

    const enriched = feedback.map((f) => ({ ...f, profile: profilesMap.get(f.user_id) ?? null }));
    const { count: nuovi } = await supabaseServer
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .eq('stato', 'nuovo');

    return NextResponse.json({ feedback: enriched, nuovi: nuovi ?? 0 });
  } catch (err) {
    logger.error('Eccezione nel caricamento dei feedback (admin)', err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
