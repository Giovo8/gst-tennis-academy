'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

/** Evento lanciato dalla pagina chat quando l'utente legge dei messaggi. */
export const CHAT_READ_EVENT = 'messageRead';

/**
 * Messaggi chat non letti dell'utente (diretti + gruppi), per il pallino nella
 * nav. Si aggiorna in realtime all'arrivo di un messaggio (la RLS consegna solo
 * quelli dell'utente), quando la pagina chat segna qualcosa come letto e quando
 * la scheda torna visibile. `userId` null = disattivato (es. modalità "vedi come").
 */
export function useUnreadChat(userId: string | null): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      const { data, error } = await supabase.rpc('get_unread_chat_count');
      if (!cancelled && !error) setCount(typeof data === 'number' ? data : 0);
    }

    // Raggruppa raffiche di eventi in un'unica lettura
    function scheduleLoad() {
      clearTimeout(timer);
      timer = setTimeout(load, 300);
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') scheduleLoad();
    }

    load();

    const channel = supabase
      .channel(`unread_chat_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'internal_messages' },
        (payload) => {
          if ((payload.new as { sender_id?: string }).sender_id !== userId) scheduleLoad();
        },
      )
      .subscribe();

    window.addEventListener(CHAT_READ_EVENT, scheduleLoad);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      supabase.removeChannel(channel);
      window.removeEventListener(CHAT_READ_EVENT, scheduleLoad);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [userId]);

  return count;
}
