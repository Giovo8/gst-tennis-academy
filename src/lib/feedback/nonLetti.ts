import { supabase } from '@/lib/supabase/client';
import { getSessionUser } from '@/lib/auth/clientSession';

/**
 * Risposte dello staff non ancora lette dall'autore di un feedback.
 * Si basano sulle notifiche "Risposta al tuo feedback" (link .../feedback/<id>)
 * ancora non lette: niente tabelle dedicate.
 */
export const FEEDBACK_READ_EVENT = 'feedbackRead';

const FEEDBACK_LINK = '%/feedback/%';

/** Mappa feedbackId → numero di risposte non lette. */
export async function getFeedbackNonLetti(): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const {
    data: { user },
  } = await getSessionUser();
  if (!user) return result;

  const { data, error } = await supabase
    .from('notifications')
    .select('link')
    .eq('user_id', user.id)
    .eq('is_read', false)
    .like('link', FEEDBACK_LINK);

  if (error) return result;
  for (const row of data ?? []) {
    const id = row.link?.split('/feedback/')[1]?.split(/[/?#]/)[0];
    if (id) result.set(id, (result.get(id) ?? 0) + 1);
  }
  return result;
}

/** Segna come lette le risposte di un feedback e aggiorna il numerino in nav bar. */
export async function segnaFeedbackLetto(feedbackId: string) {
  const {
    data: { user },
  } = await getSessionUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
    .like('link', `%/feedback/${feedbackId}`);

  if (!error) window.dispatchEvent(new Event(FEEDBACK_READ_EVENT));
}
