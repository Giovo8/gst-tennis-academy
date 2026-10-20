'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { avvisoTipoUi, formatDataAvviso } from '@/lib/avvisi/tipi';
import { segnaAvvisoLetto } from '@/lib/avvisi/letti';

interface Avviso {
  id: string;
  tipo: string;
  testo: string;
  messaggio: string | null;
  link: string | null;
  created_at: string;
  autore: { full_name: string | null } | null;
}

const breadcrumb = (
  <p className="breadcrumb text-secondary/60">
    <Link href="/dashboard/atleta" className="hover:text-secondary/80">
      Dashboard
    </Link>
    {' › '}
    <span>Avviso</span>
  </p>
);

export default function AtletaAvvisoPage() {
  const params = useParams();
  const id = params.id as string;

  const [avviso, setAvviso] = useState<Avviso | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/avvisi/${id}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setAvviso(json.avviso ?? null);
        // Aperto anche dalla notifica: niente più puntino in Bacheca
        segnaAvvisoLetto(id);
      } catch {
        // gestito dallo stato "non trovato"
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento...</p>
      </div>
    );
  }

  if (!avviso) {
    return (
      <div className="space-y-6 pt-3">
        {breadcrumb}
        <div className="bg-white rounded-lg border border-black/10 py-8 text-center text-sm font-medium text-secondary/40">
          Avviso non trovato o non più disponibile
        </div>
      </div>
    );
  }

  const ui = avvisoTipoUi(avviso.tipo);
  const Icon = ui.icon;

  return (
    <div className="space-y-6 pt-3">
      <div>
        {breadcrumb}
        <h1 className="text-4xl font-bold text-secondary">Avviso</h1>
      </div>

      <div
        className="rounded-lg border border-black/10 p-6 overflow-hidden"
        style={{ backgroundColor: ui.bg }}
      >
        <div className="flex items-center gap-6">
          <Icon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <h2 className="flex-1 min-w-0 text-2xl font-bold text-white break-words">
            {avviso.testo}
          </h2>
        </div>
      </div>

      {avviso.messaggio && (
        <div className="page-card">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Avviso</h2>
          </div>
          <div className="px-6 py-4">
            <p className="text-secondary/80 leading-relaxed whitespace-pre-line break-words">
              {avviso.messaggio}
            </p>
          </div>
        </div>
      )}

      <div className="page-card">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-baseline gap-3 md:gap-8 pb-6 border-b border-gray-200">
            <span className="w-full md:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Tipo
            </span>
            <p className="flex-1 text-secondary font-semibold">{ui.label}</p>
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline gap-3 md:gap-8 pb-6 border-b border-gray-200">
            <span className="w-full md:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Pubblicato il
            </span>
            <p className="flex-1 text-secondary font-semibold">
              {formatDataAvviso(avviso.created_at)}
            </p>
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline gap-3 md:gap-8">
            <span className="w-full md:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Pubblicato da
            </span>
            <p className="flex-1 text-secondary font-semibold">
              {avviso.autore?.full_name || 'Staff GST'}
            </p>
          </div>
        </div>
      </div>

      {avviso.link && (
        <Link
          href={avviso.link}
          className="flex w-full items-center justify-center px-4 py-3 text-sm font-medium text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-colors"
        >
          Vai alla sezione
        </Link>
      )}
    </div>
  );
}
