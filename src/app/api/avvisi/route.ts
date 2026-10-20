import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { getRouteAuth, unauthorized, forbidden } from '@/lib/auth/routeAuth';
import logger from '@/lib/logger/secure-logger';
import { oggiRoma } from '@/lib/avvisi/tipi';

export const dynamic = 'force-dynamic';

const SERVER_ERROR = 'Errore interno del server';

/**
 * GET /api/avvisi — avvisi attivi per la Bacheca della dashboard atleta.
 * Solo atleti; esclude gli avvisi disattivati o con scadenza passata.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized(request);
    if (auth.role !== 'atleta') return forbidden(request, auth.user.id);

    const { data, error } = await supabaseServer
      .from('avvisi')
      .select('id, tipo, testo, messaggio, link, created_at')
      .eq('attivo', true)
      .or(`visibile_fino.is.null,visibile_fino.gte.${oggiRoma()}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      logger.error('Errore nel caricamento degli avvisi', error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    return NextResponse.json({ avvisi: data ?? [] });
  } catch (err) {
    logger.error('Eccezione nel caricamento degli avvisi', err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
