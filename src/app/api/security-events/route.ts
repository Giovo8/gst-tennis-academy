import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { getRouteAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth/routeAuth';
import logger from '@/lib/logger/secure-logger';

export const dynamic = 'force-dynamic';

const LIMIT_MAX = 1000;
const LIMIT_DEFAULT = 200;

/**
 * Eventi di sicurezza per /dashboard/admin/platform-logs.
 *
 * Riservata ad admin e gestore: il registro contiene IP e user agent, e sapere
 * quali endpoint respingono chi è di per sé un'informazione sensibile.
 */
export async function GET(req: Request) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized(req);
    if (!isAdmin(auth.role)) return forbidden(req, auth.user.id);

    const url = new URL(req.url);
    const parsedLimit = Number.parseInt(url.searchParams.get('limit') || '', 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), LIMIT_MAX)
      : LIMIT_DEFAULT;

    const tipo = url.searchParams.get('tipo');
    const severita = url.searchParams.get('severita');

    let query = supabaseServer
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (tipo) query = query.eq('tipo', tipo);
    if (severita) query = query.eq('severita', severita);

    const { data: events, error } = await query;

    if (error) {
      logger.error('Errore nel caricamento degli eventi di sicurezza', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Gli eventi con utente noto (es. ruolo insufficiente) vengono arricchiti col
    // profilo, come fa /api/activity-logs: senza nome l'ID non dice nulla.
    const userIds = [...new Set((events ?? []).map((e: any) => e.user_id).filter(Boolean))];
    const profilesMap = new Map();

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseServer
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      profiles?.forEach((profile: any) => profilesMap.set(profile.id, profile));
    }

    const enriched = (events ?? []).map((event: any) => ({
      ...event,
      profiles: event.user_id ? profilesMap.get(event.user_id) ?? null : null,
    }));

    // Riepilogo per IP sulle ultime 24 ore: serve a distinguere il rumore di
    // fondo (tanti IP con un evento each) da un singolo aggressore insistente.
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const perIp = new Map<string, number>();
    for (const event of enriched) {
      if (!event.ip_address) continue;
      if (new Date(event.created_at).getTime() < dayAgo) continue;
      perIp.set(event.ip_address, (perIp.get(event.ip_address) ?? 0) + 1);
    }
    const topIps = [...perIp.entries()]
      .map(([ip, eventi]) => ({ ip, eventi }))
      .sort((a, b) => b.eventi - a.eventi)
      .slice(0, 5);

    return NextResponse.json({ events: enriched, topIps });
  } catch (err: any) {
    logger.error('Eccezione nel caricamento degli eventi di sicurezza', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
