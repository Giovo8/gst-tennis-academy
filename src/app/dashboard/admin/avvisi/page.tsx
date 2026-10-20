'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Link2, Loader2, Megaphone, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import {
  AVVISO_TIPO_UI,
  avvisoTipoUi,
  formatDataAvviso,
  oggiRoma,
  type AvvisoTipo,
} from '@/lib/avvisi/tipi';

interface Avviso {
  id: string;
  tipo: string;
  testo: string;
  messaggio: string | null;
  visibile_fino: string | null;
  link: string | null;
  attivo: boolean;
  created_at: string;
}

type Stato = 'all' | 'visibili' | 'nascosti';

const STATI: { value: Stato; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'visibili', label: 'Visibili' },
  { value: 'nascosti', label: 'Nascosti' },
];

const TIPI = Object.keys(AVVISO_TIPO_UI) as AvvisoTipo[];

export default function AdminAvvisiPage() {
  const [items, setItems] = useState<Avviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stato, setStato] = useState<Stato>('all');
  const [tipo, setTipo] = useState<'all' | AvvisoTipo>('all');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/avvisi');
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setItems(json.avvisi ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const oggi = oggiRoma();
  const isVisibile = (a: Avviso) => a.attivo && !(a.visibile_fino && a.visibile_fino < oggi);

  function statoLabel(a: Avviso) {
    if (!a.attivo) return 'Disattivato';
    if (a.visibile_fino && a.visibile_fino < oggi) return 'Scaduto';
    if (a.visibile_fino) return `Fino al ${formatDataAvviso(`${a.visibile_fino}T12:00:00`)}`;
    return 'Attivo';
  }

  const q = search.trim().toLowerCase();
  const filtered = items.filter((a) => {
    if (stato === 'visibili' && !isVisibile(a)) return false;
    if (stato === 'nascosti' && isVisibile(a)) return false;
    if (tipo !== 'all' && a.tipo !== tipo) return false;
    if (!q) return true;
    return a.testo.toLowerCase().includes(q) || (a.messaggio ?? '').toLowerCase().includes(q);
  });

  const hasActiveFilters = stato !== 'all' || tipo !== 'all';

  const chipClass = (selected: boolean) =>
    `h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold transition-colors sm:flex-1 sm:min-w-0 ${
      selected
        ? 'border-secondary bg-secondary text-white'
        : 'border-black/10 bg-white text-secondary hover:bg-gray-50'
    }`;

  return (
    <div className="space-y-6 pt-3">
      <div className="w-full">
        <Link
          href="/dashboard/admin/avvisi/new"
          className="w-full px-4 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Nuovo Avviso</span>
        </Link>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
            <input
              type="text"
              placeholder="Cerca per titolo o testo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full pl-10 pr-4 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
              hasActiveFilters || isFilterPanelOpen
                ? 'border-secondary bg-secondary text-white hover:opacity-90'
                : 'border-black/10 bg-white text-secondary hover:bg-gray-50'
            }`}
            aria-label="Mostra o nascondi chips filtri"
            title="Filtri"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        {isFilterPanelOpen && (
          <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-2 sm:min-w-0 sm:w-full">
              <div className="flex items-center gap-2 sm:flex-1 sm:min-w-0">
                {STATI.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStato(option.value)}
                    className={chipClass(stato === option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <span className="h-6 w-px shrink-0 bg-black/10" />

              <div className="flex items-center gap-2 sm:flex-1 sm:min-w-0">
                {TIPI.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo((prev) => (prev === t ? 'all' : t))}
                    className={chipClass(tipo === t)}
                  >
                    {AVVISO_TIPO_UI[t].label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStato('all');
                  setTipo('all');
                }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#023047] bg-[#023047] text-white hover:opacity-90 transition-colors"
                aria-label="Reset filtri"
                title="Reset filtri"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento avvisi...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-black/10 overflow-hidden flex flex-col items-center justify-center py-8 text-secondary/40">
          <Megaphone className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">
            {search || hasActiveFilters
              ? 'Nessun avviso corrisponde ai filtri'
              : 'Nessun avviso pubblicato'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const ui = avvisoTipoUi(a.tipo);
            const Icon = ui.icon;
            return (
              <Link
                key={a.id}
                href={`/dashboard/admin/avvisi/${a.id}`}
                className={`block rounded-lg hover:opacity-95 transition-opacity ${
                  isVisibile(a) ? '' : 'opacity-60'
                }`}
                style={{ background: ui.bg }}
              >
                <div className="flex items-center gap-4 py-3 px-3">
                  <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                    <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{a.testo}</p>
                    <p className="text-xs text-white/70 mt-0.5 truncate">
                      {formatDataAvviso(a.created_at)} · {statoLabel(a)}
                      {a.link && (
                        <span className="inline-flex items-center gap-1 align-middle">
                          {' '}
                          · <Link2 className="h-3 w-3" />
                          {a.link}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide hidden sm:block">
                    {ui.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
