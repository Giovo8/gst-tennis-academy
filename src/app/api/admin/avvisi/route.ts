import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { getRouteAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth/routeAuth';
import { createAvvisoSchema } from '@/lib/validation/schemas';
import { sanitizeObject } from '@/lib/security/sanitize-server';
import { notifyAthletes } from '@/lib/notifications/notifyAthletes';
import logger from '@/lib/logger/secure-logger';

export const dynamic = 'force-dynamic';

const SERVER_ERROR = 'Errore interno del server';

/**
 * GET /api/admin/avvisi — elenco avvisi per /dashboard/admin/avvisi.
 * Solo admin e gestore.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized(request);
    if (!isAdmin(auth.role)) return forbidden(request, auth.user.id);

    const { data, error } = await supabaseServer
      .from('avvisi')
      .select('id, tipo, testo, messaggio, visibile_fino, link, attivo, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      logger.error('Errore nel caricamento degli avvisi (admin)', error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    return NextResponse.json({ avvisi: data ?? [] });
  } catch (err) {
    logger.error('Eccezione nel caricamento degli avvisi (admin)', err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}

/** POST /api/admin/avvisi — pubblica un nuovo avviso per gli atleti. */
export async function POST(request: NextRequest) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized(request);
    if (!isAdmin(auth.role)) return forbidden(request, auth.user.id);

    const body = await request.json().catch(() => null);
    const parsed = createAvvisoSchema.safeParse(sanitizeObject(body ?? {}));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseServer
      .from('avvisi')
      .insert({
        tipo: parsed.data.tipo,
        testo: parsed.data.testo,
        messaggio: parsed.data.messaggio || null,
        visibile_fino: parsed.data.visibile_fino || null,
        link: parsed.data.link || null,
        autore_id: auth.user.id,
      })
      .select('id, tipo, testo, messaggio, visibile_fino, link, attivo, created_at')
      .single();

    if (error || !data) {
      logger.error("Errore nella creazione dell'avviso", error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    await notifyAthletes({
      type: 'announcement',
      title: 'Nuovo avviso in bacheca',
      message: data.testo,
      link: `/dashboard/atleta/avvisi/${data.id}`,
    });

    return NextResponse.json({ avviso: data }, { status: 201 });
  } catch (err) {
    logger.error("Eccezione nella creazione dell'avviso", err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
