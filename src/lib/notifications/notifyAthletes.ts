import { supabaseServer } from '@/lib/supabase/serverClient';
import logger from '@/lib/logger/secure-logger';

/** Notifica in-app a tutti gli atleti (solo lato server: usa la service role). */
export async function notifyAthletes({
  type,
  title,
  message,
  link,
}: {
  type: 'announcement' | 'general';
  title: string;
  message: string;
  link?: string;
}) {
  try {
    const { data: athletes, error: athletesError } = await supabaseServer
      .from('profiles')
      .select('id')
      .eq('role', 'atleta');

    if (athletesError) {
      logger.error('Errore nel caricamento degli atleti per le notifiche', athletesError);
      return;
    }

    if (!athletes || athletes.length === 0) return;

    const notifications = athletes.map((athlete) => ({
      user_id: athlete.id,
      type,
      title,
      message,
      link: link || null,
      is_read: false,
    }));

    const { error: insertError } = await supabaseServer.from('notifications').insert(notifications);

    if (insertError) {
      logger.error("Errore nell'invio delle notifiche agli atleti", insertError);
    }
  } catch (error) {
    logger.error('Eccezione nella notifica agli atleti', error);
  }
}
