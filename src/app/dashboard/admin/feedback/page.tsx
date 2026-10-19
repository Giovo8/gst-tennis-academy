'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bug,
  Lightbulb,
  Loader2,
  MessageCircle,
  MessageSquarePlus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';

type Categoria = 'suggerimento' | 'problema' | 'altro';
type Stato = 'nuovo' | 'letto' | 'archiviato';

interface FeedbackRow {
  id: string;
  categoria: Categoria;
  titolo: string | null;
  messaggio: string;
  stato: Stato;
  created_at: string;
  profile: { full_name: string | null; email: string | null; role: string | null } | null;
}

const CATEGORIE: Record<Categoria, { label: string; icon: typeof Bug; color: string }> = {
  suggerimento: { label: 'Suggerimento', icon: Lightbulb, color: '#023047' },
  problema: { label: 'Problema', icon: Bug, color: '#023b52' },
  altro: { label: 'Altro', icon: MessageCircle, color: 'var(--color-frozen-lake-900)' },
};

const STATI: { value: 'all' | Stato; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'nuovo', label: 'Nuovi' },
  { value: 'letto', label: 'Letti' },
  { value: 'archiviato', label: 'Archiviati' },
];

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stato, setStato] = useState<'all' | Stato>('all');
  const [categoria, setCategoria] = useState<'all' | Categoria>('all');
  const [search, setSearch] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/feedback');
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setItems(json.feedback ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = items.filter((f) => {
    if (stato !== 'all' && f.stato !== stato) return false;
    if (categoria !== 'all' && f.categoria !== categoria) return false;
    if (!q) return true;
    return (
      (f.titolo ?? '').toLowerCase().includes(q) ||
      f.messaggio.toLowerCase().includes(q) ||
      (f.profile?.full_name ?? '').toLowerCase().includes(q) ||
      (f.profile?.email ?? '').toLowerCase().includes(q)
    );
  });

  const hasActiveFilters = stato !== 'all' || categoria !== 'all';

  const chipClass = (selected: boolean) =>
    `h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold transition-colors sm:flex-1 sm:min-w-0 ${
      selected
        ? 'border-secondary bg-secondary text-white'
        : 'border-black/10 bg-white text-secondary hover:bg-gray-50'
    }`;

  const categorieOptions: { value: 'all' | Categoria; label: string }[] = [
    { value: 'all', label: 'Tutte' },
    ...(Object.keys(CATEGORIE) as Categoria[]).map((c) => ({
      value: c,
      label: CATEGORIE[c].label,
    })),
  ];

  return (
    <div className="space-y-6 pt-3">
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
            <input
              type="text"
              placeholder="Cerca per nome, email o testo..."
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
                {categorieOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCategoria(option.value)}
                    className={chipClass(categoria === option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStato('all');
                  setCategoria('all');
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
          <p className="mt-4 text-secondary/60">Caricamento feedback...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-lg bg-white">
          <MessageSquarePlus className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessun feedback trovato</h3>
          <p className="text-secondary/60">Prova a modificare i filtri di ricerca</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => {
            const cat = CATEGORIE[f.categoria] ?? CATEGORIE.altro;
            const Icon = cat.icon;
            return (
              <Link
                key={f.id}
                href={`/dashboard/admin/feedback/${f.id}`}
                className="flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-95 transition-opacity"
                style={{ background: cat.color }}
              >
                <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                  <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">
                    {f.profile?.full_name || 'Utente'}
                  </p>
                  <p className="text-xs text-white/70 mt-0.5 truncate">
                    {new Date(f.created_at).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    · {f.titolo || f.messaggio}
                  </p>
                </div>
                {f.stato === 'nuovo' && (
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-white flex-shrink-0"
                    role="img"
                    aria-label="Nuovo"
                  />
                )}
                {f.stato === 'archiviato' && (
                  <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wide flex-shrink-0 hidden md:block">
                    Archiviato
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
