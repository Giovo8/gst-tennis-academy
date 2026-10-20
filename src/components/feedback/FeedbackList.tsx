'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MessageSquare, Plus, Search } from 'lucide-react';
import { getFeedbackNonLetti } from '@/lib/feedback/nonLetti';
import { CATEGORIE, type FeedbackItem } from '@/components/feedback/FeedbackForm';

export default function FeedbackList({ basePath }: { basePath: string }) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonLetti, setNonLetti] = useState<Map<string, number>>(new Map());
  const [search, setSearch] = useState('');

  const loadItems = useCallback(async () => {
    try {
      const [res, unread] = await Promise.all([
        fetch('/api/feedback'),
        getFeedbackNonLetti().catch(() => new Map<string, number>()),
      ]);
      setNonLetti(unread);
      if (res.ok) {
        const json = await res.json();
        setItems(json.feedback ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const q = search.trim().toLowerCase();
  const filteredItems = q
    ? items.filter((item) => {
        const cat = CATEGORIE.find((c) => c.value === item.categoria);
        return (
          item.titolo?.toLowerCase().includes(q) ||
          item.messaggio.toLowerCase().includes(q) ||
          cat?.label.toLowerCase().includes(q)
        );
      })
    : items;

  return (
    <div className="space-y-6 pt-3">
      {/* Header actions */}
      <div className="w-full">
        <Link
          href={`${basePath}/feedback/new`}
          className="w-full px-4 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Nuovo Feedback</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per titolo, messaggio o categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full pl-10 pr-4 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento feedback...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg border border-black/10 flex flex-col items-center justify-center py-8 text-secondary/40">
          <MessageSquare className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">
            {q ? 'Nessun feedback corrisponde alla ricerca' : 'Non hai ancora inviato feedback'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const cat = CATEGORIE.find((c) => c.value === item.categoria) ?? CATEGORIE[2];
            const Icon = cat.icon;
            return (
              <Link
                key={item.id}
                href={`${basePath}/feedback/${item.id}`}
                className="w-full flex items-center gap-4 py-3 px-3 rounded-lg hover:opacity-95 transition-opacity"
                style={{ background: cat.color }}
              >
                <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                  <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">
                    {item.titolo || item.messaggio}
                  </p>
                  <p className="text-xs text-white/70 mt-0.5">
                    {new Date(item.created_at)
                      .toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                      .replace('.', '')
                      .replace(/ (\p{L})/u, (_, c: string) => ` ${c.toUpperCase()}`)}
                  </p>
                </div>

                <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide">
                  {cat.label}
                </span>

                {nonLetti.has(item.id) && (
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-white flex-shrink-0"
                    aria-label="Nuova risposta"
                  />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
