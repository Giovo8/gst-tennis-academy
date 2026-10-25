import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { getRouteAuth, unauthorized } from '@/lib/auth/routeAuth';
import { sanitizeUuid } from '@/lib/security/sanitize-server';
import logger from '@/lib/logger/secure-logger';
import { upsertChatNotifications } from '@/lib/notifications/chatNotifications';

const SERVER_ERROR = 'Errore interno del server';
const MAX_TITLE = 200;
const MAX_MESSAGE = 2000;

/**
 * POST /api/notifications — crea una notifica per un altro utente
 * (usata da `createNotification()`: avvisi al maestro, al proprietario di una
 * prenotazione, ai gestori, al destinatario di un messaggio).
 *
 * Lettura, "segna come letta" ed eliminazione avvengono direttamente su
 * Supabase con la RLS della tabella `notifications`, non da questa route.
 *
 * Qualsiasi utente loggato può notificare un altro utente, quindi il contenuto
 * è vincolato: link solo interni (niente phishing verso siti esterni),
 * lunghezze massime e tipo con formato semplice.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getRouteAuth();
    if (!auth) return unauthorized();

    const body = await request.json();
    const { user_id, title, message, type, link } = body ?? {};

    if (
      !sanitizeUuid(String(user_id ?? '')) ||
      typeof title !== 'string' ||
      typeof message !== 'string' ||
      !title.trim() ||
      !message.trim()
    ) {
      return NextResponse.json(
        { error: 'user_id, title e message sono obbligatori' },
        { status: 400 },
      );
    }

    if (title.length > MAX_TITLE || message.length > MAX_MESSAGE) {
      return NextResponse.json({ error: 'Titolo o messaggio troppo lunghi' }, { status: 400 });
    }

    const safeType = typeof type === 'string' && /^[a-z_]{1,40}$/.test(type) ? type : 'general';

    // Solo percorsi interni all'app ("/..."), mai URL assoluti o "//host"
    const safeLink =
      typeof link === 'string' &&
      link.startsWith('/') &&
      !link.startsWith('//') &&
      link.length <= 500
        ? link
        : null;

    // Messaggi chat: una sola notifica non letta per conversazione
    if (safeType === 'message' && safeLink) {
      await upsertChatNotifications(
        [{ userId: user_id, link: safeLink }],
        title.trim(),
        message.trim(),
      );
      return NextResponse.json({ success: true });
    }

    const { data, error } = await supabaseServer
      .from('notifications')
      .insert({
        user_id,
        title: title.trim(),
        message: message.trim(),
        type: safeType,
        link: safeLink,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('notifications POST insert failed', error);
      return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
    }

    return NextResponse.json({ notification: data });
  } catch (err) {
    logger.error('notifications POST exception', err);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
