import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { getRouteAuth, unauthorized, forbidden } from '@/lib/auth/routeAuth';
import { sanitizeUuid } from '@/lib/security/sanitize-server';
import logger from '@/lib/logger/secure-logger';
import { oggiRoma } from '@/lib/avvisi/tipi';

export const dynamic = 'force-dynamic';

const SERVER_ERROR = 'Errore interno del server';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/avvisi/[id] — dettaglio di un avviso della Bacheca.
 * Solo atleti; gli avvisi disattivati o scaduti risultano non trovati.
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized(request);
    if (auth.role !== 'atleta') return forbidden(request, auth.user.id);

    const id = sanitizeUuid((await params).id);
    if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });

    const { data, error } = await supabaseServer
      .from('avvisi')
      .select('id, tipo, testo, messaggio, link, created_at, autore:profiles(full_name)')
      .eq('id', id)
      .eq('attivo', true)
      .or(`visibile_fino.is.null,visibile_fino.gte.${oggiRoma()}`)
      .maybeSingle();

    if (error) {
      logger.error("Errore nel caricamento dell'avviso", error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Avviso non trovato' }, { status: 404 });

    return NextResponse.json({ avviso: data });
  } catch (err) {
    logger.error("Eccezione nel caricamento dell'avviso", err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
