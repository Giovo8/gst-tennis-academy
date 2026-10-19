import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { getRouteAuth, unauthorized, forbidden } from '@/lib/auth/routeAuth';
import { notifyAdmins } from '@/lib/notifications/notifyAdmins';
import { createFeedbackSchema } from '@/lib/validation/schemas';
import { sanitizeObject } from '@/lib/security/sanitize-server';
import logger from '@/lib/logger/secure-logger';

export const dynamic = 'force-dynamic';

const SERVER_ERROR = 'Errore interno del server';
const CATEGORIA_LABEL: Record<string, string> = {
  suggerimento: 'Suggerimento',
  problema: 'Problema',
  altro: 'Altro',
};

function canSendFeedback(role: string | null) {
  return role === 'atleta' || role === 'maestro';
}

/**
 * GET /api/feedback — i feedback inviati dall'utente loggato.
 * Service role: l'ownership è garantita dal filtro su user_id.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized(request);
    if (!canSendFeedback(auth.role)) return forbidden(request, auth.user.id);

    const { data, error } = await supabaseServer
      .from('feedback')
      .select('id, categoria, titolo, messaggio, stato, created_at')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Errore nel caricamento dei feedback', error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    return NextResponse.json({ feedback: data ?? [] });
  } catch (err) {
    logger.error('Eccezione nel caricamento dei feedback', err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}

/**
 * POST /api/feedback — invia un feedback (solo atleta e maestro) e avvisa
 * admin/gestore. L'autore è sempre l'utente della sessione, mai il body.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized(request);
    if (!canSendFeedback(auth.role)) return forbidden(request, auth.user.id);

    const body = await request.json().catch(() => null);
    const parsed = createFeedbackSchema.safeParse(sanitizeObject(body ?? {}));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseServer
      .from('feedback')
      .insert({
        user_id: auth.user.id,
        categoria: parsed.data.categoria,
        titolo: parsed.data.titolo,
        messaggio: parsed.data.messaggio,
      })
      .select('id, categoria, titolo, messaggio, stato, created_at')
      .single();

    if (error || !data) {
      logger.error("Errore nell'invio del feedback", error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('full_name')
      .eq('id', auth.user.id)
      .single();

    await notifyAdmins({
      type: 'general',
      title: 'Nuovo feedback',
      message: `${profile?.full_name || 'Un utente'} · ${CATEGORIA_LABEL[data.categoria]}: ${
        data.titolo
      }`,
      link: `/dashboard/admin/feedback/${data.id}`,
    });

    return NextResponse.json({ feedback: data }, { status: 201 });
  } catch (err) {
    logger.error("Eccezione nell'invio del feedback", err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
