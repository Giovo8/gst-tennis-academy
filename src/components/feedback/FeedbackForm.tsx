'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Bug, Lightbulb, Loader2, MessageCircle } from 'lucide-react';
import { toastError } from '@/lib/toast';

type Categoria = 'suggerimento' | 'problema' | 'altro';

interface FeedbackItem {
  id: string;
  categoria: Categoria;
  titolo: string | null;
  messaggio: string;
  stato: 'nuovo' | 'letto' | 'archiviato';
  created_at: string;
}

const MAX_LENGTH = 2000;

const CATEGORIE: { value: Categoria; label: string; color: string; icon: typeof Bug }[] = [
  { value: 'suggerimento', label: 'Suggerimento', color: '#023047', icon: Lightbulb },
  { value: 'problema', label: 'Problema', color: '#023b52', icon: Bug },
  { value: 'altro', label: 'Altro', color: 'var(--color-frozen-lake-900)', icon: MessageCircle },
];

export default function FeedbackForm({ basePath }: { basePath: string }) {
  const [categoria, setCategoria] = useState<Categoria>('suggerimento');
  const [titolo, setTitolo] = useState('');
  const [messaggio, setMessaggio] = useState('');
  const [sending, setSending] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback');
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

  const canSubmit = titolo.trim().length >= 3 && messaggio.trim().length >= 5 && !sending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria, titolo, messaggio }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toastError(json.error, 'Invio non riuscito');
        return;
      }

      toast.success('Feedback inviato, grazie!');
      setTitolo('');
      setMessaggio('');
      if (json.feedback) setItems((prev) => [json.feedback, ...prev]);
    } catch (error) {
      toastError(error, 'Invio non riuscito');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 pt-3">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60">Feedback</p>
        <h1 className="text-4xl font-bold text-secondary">Feedback</h1>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <div className="page-card">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Invia un feedback</h2>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <p className="text-sm font-medium text-secondary mb-2">Di cosa si tratta?</p>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIE.map(({ value, label }) => {
                  const active = categoria === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCategoria(value)}
                      aria-pressed={active}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-[#023047] text-white border-[#023047]'
                          : 'bg-secondary text-white border-secondary hover:opacity-90'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="feedback-titolo" className="text-sm font-medium text-secondary">
                Titolo
              </label>
              <input
                id="feedback-titolo"
                type="text"
                value={titolo}
                onChange={(e) => setTitolo(e.target.value)}
                maxLength={100}
                placeholder="Riassumi in poche parole"
                className="mt-2 w-full rounded-lg border border-black/10 bg-white p-3 text-secondary placeholder-secondary/40 focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label htmlFor="feedback-messaggio" className="text-sm font-medium text-secondary">
                Il tuo messaggio
              </label>
              <textarea
                id="feedback-messaggio"
                value={messaggio}
                onChange={(e) => setMessaggio(e.target.value)}
                maxLength={MAX_LENGTH}
                rows={6}
                placeholder="Scrivi qui il tuo consiglio..."
                className="mt-2 w-full rounded-lg border border-black/10 bg-white p-3 text-secondary placeholder-secondary/40 focus:outline-none focus:border-secondary"
              />
              <p className="mt-1 text-right text-xs text-secondary/50">
                {messaggio.length}/{MAX_LENGTH}
              </p>
            </div>
          </div>
        </div>

        {messaggio.trim().length > 0 && (
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full flex items-center justify-center px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Invia feedback'}
          </button>
        )}
      </form>

      <div className="page-card">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">I tuoi feedback</h2>
        </div>
        <div className="p-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-secondary" />
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-lg bg-white p-6 text-center text-secondary/60">
              Non hai ancora inviato feedback
            </p>
          ) : (
            items.map((item) => {
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
                    {item.titolo && (
                      <p className="text-xs text-white/70 mt-0.5 truncate">{item.messaggio}</p>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
