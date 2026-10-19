import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { getRouteAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth/routeAuth';
import { updateFeedbackSchema } from '@/lib/validation/schemas';
import { sanitizeUuid } from '@/lib/security/sanitize-server';
import logger from '@/lib/logger/secure-logger';

export const dynamic = 'force-dynamic';

const SERVER_ERROR = 'Errore interno del server';

type Ctx = { params: Promise<{ id: string }> };

async function authorize(request: NextRequest, params: Ctx['params']) {
  const auth = await getRouteAuth();
  if (!auth) return { error: unauthorized(request) };
  if (!isAdmin(auth.role)) return { error: forbidden(request, auth.user.id) };

  const id = sanitizeUuid((await params).id);
  if (!id) return { error: NextResponse.json({ error: 'ID non valido' }, { status: 400 }) };

  return { id };
}

/** GET — dettaglio feedback; se "nuovo" lo segna come "letto". */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const res = await authorize(request, params);
    if (res.error) return res.error;

    const { data, error } = await supabaseServer
      .from('feedback')
      .select('id, user_id, categoria, titolo, messaggio, stato, created_at')
      .eq('id', res.id)
      .maybeSingle();

    if (error) {
      logger.error('Errore nel caricamento del feedback', error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Feedback non trovato' }, { status: 404 });

    let stato = data.stato;
    if (stato === 'nuovo') {
      const { error: updError } = await supabaseServer
        .from('feedback')
        .update({ stato: 'letto' })
        .eq('id', res.id);
      if (!updError) stato = 'letto';
    }

    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', data.user_id)
      .maybeSingle();

    return NextResponse.json({ feedback: { ...data, stato, profile: profile ?? null } });
  } catch (err) {
    logger.error('Eccezione nel caricamento del feedback', err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}

/** PATCH — cambio stato (archivia / ripristina). */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const res = await authorize(request, params);
    if (res.error) return res.error;

    const body = await request.json().catch(() => null);
    const parsed = updateFeedbackSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: 'Stato non valido' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('feedback')
      .update({ stato: parsed.data.stato })
      .eq('id', res.id);

    if (error) {
      logger.error("Errore nell'aggiornamento del feedback", error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Eccezione nell'aggiornamento del feedback", err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}

/** DELETE — elimina il feedback. */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const res = await authorize(request, params);
    if (res.error) return res.error;

    const { error } = await supabaseServer.from('feedback').delete().eq('id', res.id);
    if (error) {
      logger.error("Errore nell'eliminazione del feedback", error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Eccezione nell'eliminazione del feedback", err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
