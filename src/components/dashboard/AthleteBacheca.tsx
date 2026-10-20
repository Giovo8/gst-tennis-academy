'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getSessionUser } from '@/lib/auth/clientSession';
import { avvisoTipoUi, formatDataAvviso } from '@/lib/avvisi/tipi';
import { getAvvisiLetti, segnaAvvisoLetto } from '@/lib/avvisi/letti';

interface Avviso {
  id: string;
  tipo: string;
  testo: string;
  link: string | null;
  created_at: string;
}

/**
 * Bacheca della dashboard atleta: avvisi attivi e non scaduti scritti da
 * admin/gestore (/dashboard/admin/avvisi) e, in cima, il richiamo alle
 * notifiche non lette. Se non c'è nulla da mostrare la sezione è nascosta.
 */
export default function AthleteBacheca() {
  const [avvisi, setAvvisi] = useState<Avviso[]>([]);
  const [letti, setLetti] = useState<Set<string>>(new Set());
  const [nonLette, setNonLette] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/avvisi');
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setLetti(getAvvisiLetti());
        setAvvisi(json.avvisi ?? []);
      } catch {
        // bacheca non essenziale: errore silenzioso
      }
    })();
    (async () => {
      const {
        data: { user },
      } = await getSessionUser();
      if (!user) return;
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (!cancelled) setNonLette(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (avvisi.length === 0 && nonLette === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
      <div className="px-6 py-4 border-b border-black/10 flex items-center gap-2 bg-gray-50">
        <h2 className="text-base sm:text-lg font-semibold text-secondary">Bacheca</h2>
      </div>
      <ul className="px-6 py-4 space-y-2">
        {nonLette > 0 && (
          <li className="rounded-lg" style={{ background: '#023047' }}>
            <Link
              href="/dashboard/atleta/notifications"
              className="flex items-center gap-4 py-3 px-3 hover:opacity-95 transition-opacity"
            >
              <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                <Bell className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">
                  {nonLette === 1
                    ? 'Hai 1 notifica da leggere'
                    : `Hai ${nonLette} notifiche da leggere`}
                </p>
                <p className="text-xs text-white/70 mt-0.5">Apri le notifiche</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/70 flex-shrink-0" />
            </Link>
          </li>
        )}
        {avvisi.map((a) => {
          const tipo = avvisoTipoUi(a.tipo);
          const Icon = tipo.icon;
          const content = (
            <div className="flex items-center gap-4 py-3 px-3">
              <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                <Icon className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm break-words">{a.testo}</p>
                <p className="text-xs text-white/70 mt-0.5">{formatDataAvviso(a.created_at)}</p>
              </div>
              {!letti.has(a.id) && (
                <span
                  className="h-2.5 w-2.5 rounded-full bg-white flex-shrink-0"
                  aria-label="Non letto"
                />
              )}
            </div>
          );

          return (
            <li key={a.id} className="rounded-lg" style={{ background: tipo.bg }}>
              <Link
                href={`/dashboard/atleta/avvisi/${a.id}`}
                onClick={() => segnaAvvisoLetto(a.id)}
                className="block hover:opacity-95 transition-opacity"
              >
                {content}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
