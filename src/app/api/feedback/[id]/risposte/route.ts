import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { getRouteAuth, isAdmin, unauthorized, forbidden } from '@/lib/auth/routeAuth';
import { notifyAdmins } from '@/lib/notifications/notifyAdmins';
import { createFeedbackRispostaSchema } from '@/lib/validation/schemas';
import { sanitizeObject, sanitizeUuid } from '@/lib/security/sanitize-server';
import logger from '@/lib/logger/secure-logger';

export const dynamic = 'force-dynamic';

const SERVER_ERROR = 'Errore interno del server';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Conversazione su un feedback. Usata sia dal dettaglio admin sia da quello
 * dell'autore: admin/gestore accedono a qualsiasi feedback, atleta e maestro
 * solo ai propri (altrimenti 404, come se non esistesse).
 */
async function loadContext(request: NextRequest, params: Ctx['params']) {
  const auth = await getRouteAuth();
  if (!auth) return { error: unauthorized(request) };

  const admin = isAdmin(auth.role);
  if (!admin && auth.role !== 'atleta' && auth.role !== 'maestro') {
    return { error: forbidden(request, auth.user.id) };
  }

  const id = sanitizeUuid((await params).id);
  if (!id) return { error: NextResponse.json({ error: 'ID non valido' }, { status: 400 }) };

  let query = supabaseServer.from('feedback').select('id, user_id, titolo, stato').eq('id', id);
  if (!admin) query = query.eq('user_id', auth.user.id);

  const { data: feedback, error } = await query.maybeSingle();
  if (error) {
    logger.error('Errore nel caricamento del feedback', error);
    return { error: NextResponse.json({ error: SERVER_ERROR }, { status: 500 }) };
  }
  if (!feedback) {
    return { error: NextResponse.json({ error: 'Feedback non trovato' }, { status: 404 }) };
  }

  return { auth, admin, feedback };
}

/** GET — risposte in ordine cronologico, con autore e flag `mine`. */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const ctx = await loadContext(request, params);
    if (ctx.error) return ctx.error;

    const { data, error } = await supabaseServer
      .from('feedback_risposte')
      .select('id, autore_id, messaggio, created_at')
      .eq('feedback_id', ctx.feedback.id)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Errore nel caricamento delle risposte', error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    const risposte = data ?? [];
    const autoreIds = [...new Set(risposte.map((r) => r.autore_id).filter(Boolean))];
    const profiles = new Map<string, { full_name: string | null; role: string | null }>();

    if (autoreIds.length > 0) {
      const { data: rows } = await supabaseServer
        .from('profiles')
        .select('id, full_name, role')
        .in('id', autoreIds);
      rows?.forEach((p) => profiles.set(p.id, p));
    }

    return NextResponse.json({
      risposte: risposte.map((r) => {
        const autore = r.autore_id ? profiles.get(r.autore_id) : null;
        return {
          id: r.id,
          messaggio: r.messaggio,
          created_at: r.created_at,
          mine: r.autore_id === ctx.auth.user.id,
          staff: isAdmin(autore?.role ?? null),
          autore: autore?.full_name ?? null,
        };
      }),
    });
  } catch (err) {
    logger.error('Eccezione nel caricamento delle risposte', err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}

/**
 * POST — nuova risposta. Se scrive lo staff si avvisa l'autore del feedback;
 * se scrive l'autore si avvisano admin/gestore e il feedback torna "nuovo",
 * così ricompare col puntino nella lista admin.
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const ctx = await loadContext(request, params);
    if (ctx.error) return ctx.error;

    const body = await request.json().catch(() => null);
    const parsed = createFeedbackRispostaSchema.safeParse(sanitizeObject(body ?? {}));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseServer
      .from('feedback_risposte')
      .insert({
        feedback_id: ctx.feedback.id,
        autore_id: ctx.auth.user.id,
        messaggio: parsed.data.messaggio,
      })
      .select('id, messaggio, created_at')
      .single();

    if (error || !data) {
      logger.error("Errore nell'invio della risposta", error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    const { data: me } = await supabaseServer
      .from('profiles')
      .select('full_name')
      .eq('id', ctx.auth.user.id)
      .maybeSingle();

    const titolo = ctx.feedback.titolo || 'il tuo feedback';

    if (ctx.admin) {
      const { data: owner } = await supabaseServer
        .from('profiles')
        .select('role')
        .eq('id', ctx.feedback.user_id)
        .maybeSingle();
      const ownerBase = owner?.role === 'maestro' ? '/dashboard/maestro' : '/dashboard/atleta';

      const { error: notifError } = await supabaseServer.from('notifications').insert({
        user_id: ctx.feedback.user_id,
        type: 'general',
        title: 'Risposta al tuo feedback',
        message: `Lo staff ha risposto a: ${titolo}`,
        link: `${ownerBase}/feedback/${ctx.feedback.id}`,
        is_read: false,
      });
      if (notifError) logger.error('Errore nella notifica di risposta al feedback', notifError);
    } else {
      if (ctx.feedback.stato !== 'nuovo') {
        await supabaseServer.from('feedback').update({ stato: 'nuovo' }).eq('id', ctx.feedback.id);
      }
      await notifyAdmins({
        type: 'general',
        title: 'Nuova risposta a un feedback',
        message: `${me?.full_name || 'Un utente'} · ${titolo}`,
        link: `/dashboard/admin/feedback/${ctx.feedback.id}`,
      });
    }

    return NextResponse.json(
      {
        risposta: {
          ...data,
          mine: true,
          staff: ctx.admin,
          autore: me?.full_name ?? null,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error("Eccezione nell'invio della risposta", err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
