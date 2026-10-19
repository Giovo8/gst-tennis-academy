import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { getRouteAuth, unauthorized, forbidden } from '@/lib/auth/routeAuth';
import { sanitizeUuid } from '@/lib/security/sanitize-server';
import logger from '@/lib/logger/secure-logger';

export const dynamic = 'force-dynamic';

const SERVER_ERROR = 'Errore interno del server';

/**
 * GET /api/feedback/[id] — dettaglio di un feedback inviato dall'utente loggato.
 * Service role: l'ownership è garantita dal filtro su user_id (un feedback di
 * un altro utente risponde 404, come se non esistesse).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized(request);
    if (auth.role !== 'atleta' && auth.role !== 'maestro') {
      return forbidden(request, auth.user.id);
    }

    const id = sanitizeUuid((await params).id);
    if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });

    const { data, error } = await supabaseServer
      .from('feedback')
      .select('id, categoria, titolo, messaggio, stato, created_at')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (error) {
      logger.error('Errore nel caricamento del feedback', error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Feedback non trovato' }, { status: 404 });

    return NextResponse.json({ feedback: data });
  } catch (err) {
    logger.error('Eccezione nel caricamento del feedback', err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
