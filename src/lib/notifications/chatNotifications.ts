import { supabaseServer } from '@/lib/supabase/serverClient';
import logger from '@/lib/logger/secure-logger';

interface ChatNotificationTarget {
  userId: string;
  /** Link alla conversazione (vedi getMessageNotificationLink). */
  link: string;
}

/**
 * Notifiche della chat: al massimo una notifica non letta per conversazione.
 *
 * Se il destinatario ha già una notifica "message" non letta con lo stesso link,
 * viene aggiornata con l'ultimo messaggio e riportata in cima, invece di
 * aggiungerne un'altra: dieci messaggi di fila non diventano dieci notifiche.
 * Solo lato server (service role).
 */
export async function upsertChatNotifications(
  targets: ChatNotificationTarget[],
  title: string,
  message: string,
): Promise<void> {
  if (targets.length === 0) return;

  try {
    const userIds = [...new Set(targets.map((t) => t.userId))];
    const links = [...new Set(targets.map((t) => t.link))];

    const { data: existing, error } = await supabaseServer
      .from('notifications')
      .select('id, user_id, link')
      .eq('type', 'message')
      .eq('is_read', false)
      .in('user_id', userIds)
      .in('link', links);

    if (error) {
      logger.error('Lettura notifiche chat non riuscita', error);
      return;
    }

    const wanted = new Set(targets.map((t) => `${t.userId}|${t.link}`));
    const toUpdate = (existing ?? []).filter((n) => wanted.has(`${n.user_id}|${n.link}`));
    const alreadyNotified = new Set(toUpdate.map((n) => `${n.user_id}|${n.link}`));
    const toInsert = targets.filter((t) => !alreadyNotified.has(`${t.userId}|${t.link}`));

    const [updateResult, insertResult] = await Promise.all([
      toUpdate.length > 0
        ? supabaseServer
            .from('notifications')
            .update({ title, message, created_at: new Date().toISOString() })
            .in(
              'id',
              toUpdate.map((n) => n.id),
            )
        : null,
      toInsert.length > 0
        ? supabaseServer.from('notifications').insert(
            toInsert.map((t) => ({
              user_id: t.userId,
              type: 'message',
              title,
              message,
              link: t.link,
              is_read: false,
            })),
          )
        : null,
    ]);

    if (updateResult?.error)
      logger.error('Aggiornamento notifiche chat non riuscito', updateResult.error);
    if (insertResult?.error)
      logger.error('Inserimento notifiche chat non riuscito', insertResult.error);
  } catch (err) {
    logger.error('Notifiche chat non inviate', err);
  }
}

/** Anteprima del messaggio per il testo della notifica. */
export function messagePreview(content: string, max = 100): string {
  return content.length > max ? `${content.substring(0, max)}...` : content;
}
