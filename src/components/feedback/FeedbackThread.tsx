'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Loader2, Send } from 'lucide-react';
import { toastError } from '@/lib/toast';

interface Risposta {
  id: string;
  messaggio: string;
  created_at: string;
  mine: boolean;
  staff: boolean;
  autore: string | null;
}

const MAX_LENGTH = 2000;

/**
 * Messaggi su un feedback, condivisi tra dettaglio admin e dettaglio
 * dell'autore, con l'estetica della chat. La prima bolla è il messaggio
 * originale del feedback; le proprie risposte sono a destra, quelle dell'altra
 * parte a sinistra con il nome (o "Staff GST" per admin/gestore visti
 * dall'autore).
 */
export default function FeedbackThread({
  feedbackId,
  viewer,
  originale,
}: {
  feedbackId: string;
  viewer: 'admin' | 'autore';
  originale: { messaggio: string; created_at: string; autore: string | null };
}) {
  const [risposte, setRisposte] = useState<Risposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [testo, setTesto] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/feedback/${feedbackId}/risposte`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setRisposte(json.risposte ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feedbackId]);

  // Come in chat: l'area messaggi resta ancorata all'ultimo messaggio.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [risposte, loading]);

  const send = async () => {
    if (!testo.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/risposte`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaggio: testo }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(json.error, 'Invio non riuscito');
        return;
      }
      setRisposte((prev) => [...prev, json.risposta]);
      setTesto('');
    } catch (error) {
      toastError(error, 'Invio non riuscito');
    } finally {
      setSending(false);
    }
  };

  const messaggi: Risposta[] = [
    {
      id: 'originale',
      messaggio: originale.messaggio,
      created_at: originale.created_at,
      mine: viewer === 'autore',
      staff: false,
      autore: originale.autore,
    },
    ...risposte,
  ];

  const otherName = (r: Risposta) =>
    viewer === 'autore' && r.staff ? 'Staff GST' : r.autore || 'Utente';

  return (
    <div className="page-card overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base sm:text-lg font-semibold text-secondary">Messaggi</h2>
      </div>

      <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto p-4 bg-white space-y-4">
        {messaggi.map((r) => (
          <div key={r.id} className={`flex ${r.mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] ${r.mine ? 'text-right' : 'text-left'}`}>
              {!r.mine && <p className="text-xs text-gray-600 mb-1 px-1">{otherName(r)}</p>}
              <div
                className={`inline-block rounded-2xl px-4 py-2 text-left ${
                  r.mine
                    ? 'bg-secondary text-white rounded-br-sm'
                    : 'bg-white border border-black/10 rounded-bl-sm'
                }`}
                style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                <p className="text-sm whitespace-pre-wrap">{r.messaggio}</p>
              </div>
              <p
                className={`text-xs text-gray-500 mt-1 px-1 ${r.mine ? 'text-right' : 'text-left'}`}
              >
                {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: it })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-secondary" />
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t border-black/10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            maxLength={MAX_LENGTH}
            placeholder="Scrivi un messaggio..."
            aria-label="Scrivi un messaggio"
            className="h-11 flex-1 px-4 border border-gray-300 bg-white rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-black/10"
            disabled={sending}
          />
          <button
            type="button"
            onClick={send}
            disabled={!testo.trim() || sending}
            aria-label="Invia"
            className="inline-flex h-11 w-11 items-center justify-center bg-secondary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
