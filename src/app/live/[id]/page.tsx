'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import Footer from '@/components/layout/Footer';
import { MatchDetail } from '@/components/live-tennis/MatchScore';
import type { LiveMatch } from '@/lib/live-tennis/espn';

const REFRESH_MS = 60_000;

type LoadState = { status: 'loading' } | { status: 'ok'; match: LiveMatch } | { status: 'missing' };

function LiveMatchContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = decodeURIComponent(params.id);
  const date = searchParams.get('date');
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const query = date ? `?date=${encodeURIComponent(date)}` : '';
        const res = await fetch(`/api/live-tennis${query}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        const match = (json.matches as LiveMatch[] | undefined)?.find((m) => m.id === id);
        if (!mounted) return;
        // Se un aggiornamento fallisce si tiene l'ultimo punteggio mostrato
        setState((prev) =>
          match ? { status: 'ok', match } : prev.status === 'ok' ? prev : { status: 'missing' },
        );
      } catch {
        if (mounted) setState((prev) => (prev.status === 'ok' ? prev : { status: 'missing' }));
      }
    }

    load();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, REFRESH_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [id, date]);

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  if (state.status === 'missing') {
    return (
      <div className="text-center py-16 border border-black/10 rounded-2xl bg-gray-50">
        <p className="text-secondary/80 font-medium">Partita non trovata o non più disponibile.</p>
      </div>
    );
  }

  return <MatchDetail match={state.match} />;
}

export default function LiveMatchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Come la home: footer dentro il contenitore, sempre in fondo anche se il contenuto è corto */}
      <div className="max-w-[1400px] mx-auto bg-white min-h-screen flex flex-col">
        <PublicNavbar home flush />
        <main className="flex-1 w-full mx-auto max-w-3xl px-6 lg:px-8 pt-8 pb-16">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-secondary" />
              </div>
            }
          >
            <LiveMatchContent />
          </Suspense>
          <p className="text-[11px] text-gray-400 mt-8">
            Dati: ESPN · aggiornamento automatico ogni minuto
          </p>
        </main>
        <Footer flush />
      </div>
    </div>
  );
}
