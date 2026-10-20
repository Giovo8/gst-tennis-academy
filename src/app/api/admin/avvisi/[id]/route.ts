import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { getRouteAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth/routeAuth';
import { updateAvvisoSchema } from '@/lib/validation/schemas';
import { sanitizeObject, sanitizeUuid } from '@/lib/security/sanitize-server';
import logger from '@/lib/logger/secure-logger';

export const dynamic = 'force-dynamic';

const SERVER_ERROR = 'Errore interno del server';
const AVVISO_FIELDS = 'id, tipo, testo, messaggio, visibile_fino, link, attivo, created_at';

type Ctx = { params: Promise<{ id: string }> };

async function authorize(request: NextRequest, params: Ctx['params']) {
  const auth = await getRouteAuth();
  if (!auth) return { error: unauthorized(request) };
  if (!isAdmin(auth.role)) return { error: forbidden(request, auth.user.id) };

  const id = sanitizeUuid((await params).id);
  if (!id) return { error: NextResponse.json({ error: 'ID non valido' }, { status: 400 }) };

  return { id };
}

/** GET — dettaglio avviso. */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const res = await authorize(request, params);
    if (res.error) return res.error;

    const { data, error } = await supabaseServer
      .from('avvisi')
      .select(AVVISO_FIELDS)
      .eq('id', res.id)
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

/** PATCH — modifica i campi presenti nel body (contenuto e/o attivo). */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const res = await authorize(request, params);
    if (res.error) return res.error;

    const body = await request.json().catch(() => null);
    const parsed = updateAvvisoSchema.safeParse(sanitizeObject(body ?? {}));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
        { status: 400 },
      );
    }

    // Campi facoltativi svuotati ("") → null
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) update[key] = value === '' ? null : value;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nessuna modifica' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('avvisi')
      .update(update)
      .eq('id', res.id)
      .select(AVVISO_FIELDS)
      .maybeSingle();

    if (error) {
      logger.error("Errore nell'aggiornamento dell'avviso", error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Avviso non trovato' }, { status: 404 });

    return NextResponse.json({ avviso: data });
  } catch (err) {
    logger.error("Eccezione nell'aggiornamento dell'avviso", err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}

/** DELETE — elimina l'avviso. */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const res = await authorize(request, params);
    if (res.error) return res.error;

    const { error } = await supabaseServer.from('avvisi').delete().eq('id', res.id);
    if (error) {
      logger.error("Errore nell'eliminazione dell'avviso", error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Eccezione nell'eliminazione dell'avviso", err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
