"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Settings, Sparkles, Check, X, Save, RefreshCw } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { toast } from "sonner";

type NewsItem = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string | null;
  created_at: string;
  stato: "bozza" | "pubblicata" | "scartata";
  ai_generated: boolean;
  fonte_nome: string | null;
  fonte_url: string | null;
};

type NewsConfig = {
  pubblicazione_auto: boolean;
};

export default function AiNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"tutte" | "bozza" | "pubblicata" | "scartata">("bozza");
  const [config, setConfig] = useState<NewsConfig>({ pubblicazione_auto: false });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");

  async function loadConfig() {
    const response = await fetch("/api/ai-news/config", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setConfig({ pubblicazione_auto: Boolean(data.pubblicazione_auto) });
    }
  }

  async function loadNews(nextFilter = filter) {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai-news/bozze?stato=${nextFilter}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore caricamento news AI");
      setItems(data.items ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore caricamento news AI");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
    loadNews();
  }, []);

  async function onGenerateNow() {
    setGenerating(true);
    try {
      const response = await fetch("/api/ai-news/genera", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore generazione");
      toast.success(`Generazione completata: ${data.generate ?? 0} news, ${data.skippate ?? 0} saltate`);
      await loadNews();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore durante la generazione");
    } finally {
      setGenerating(false);
    }
  }

  function startEdit(item: NewsItem) {
    setEditingId(item.id);
    setEditingTitle(item.title);
    setEditingContent(item.content);
  }

  async function saveEdit(id: string) {
    setSavingId(id);
    try {
      const response = await fetch(`/api/ai-news/${id}/modifica`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titolo: editingTitle, testo: editingContent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore salvataggio");
      toast.success("Modifiche salvate");
      setEditingId(null);
      await loadNews();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore salvataggio");
    } finally {
      setSavingId(null);
    }
  }

  async function approve(id: string) {
    setSavingId(id);
    try {
      const response = await fetch(`/api/ai-news/${id}/approva`, { method: "PATCH" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore approvazione");
      toast.success("News approvata e pubblicata");
      await loadNews();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore approvazione");
    } finally {
      setSavingId(null);
    }
  }

  async function discard(id: string) {
    setSavingId(id);
    try {
      const response = await fetch(`/api/ai-news/${id}/scarta`, { method: "PATCH" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore scarto");
      toast.success("News scartata");
      await loadNews();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore scarto");
    } finally {
      setSavingId(null);
    }
  }

  const pendingCount = useMemo(
    () => items.filter((item) => item.stato === "bozza").length,
    [items]
  );

  const filterOptions: Array<{ key: "tutte" | "bozza" | "pubblicata" | "scartata"; label: string }> = [
    { key: "tutte", label: "Tutte" },
    { key: "bozza", label: "In attesa" },
    { key: "pubblicata", label: "Pubblicate" },
    { key: "scartata", label: "Scartate" },
  ];

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-secondary">News AI</h1>
            <p className="text-sm text-secondary/70 mt-1">Bozze generate automaticamente da feed RSS + Gemini.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/admin/news/ai/configurazione"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-secondary hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
              Configurazione
            </Link>
            <button
              type="button"
              onClick={onGenerateNow}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Genera ora
            </button>
          </div>
        </div>

        {config.pubblicazione_auto ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Modalita automatica attiva: le news vengono pubblicate senza approvazione.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setFilter(option.key);
                loadNews(option.key);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === option.key
                  ? "bg-secondary text-white"
                  : "border border-gray-300 text-secondary hover:bg-gray-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="text-4xl">📰</div>
            <h2 className="mt-3 text-xl font-semibold text-secondary">Nessuna bozza disponibile</h2>
            <p className="mt-1 text-sm text-secondary/70">
              Premi "Genera ora" oppure configura un cron per popolare automaticamente le notizie.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const isEditing = editingId === item.id;
              const itemSaving = savingId === item.id;
              return (
                <article key={item.id} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">AI</span>
                    {item.category ? (
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{item.category}</span>
                    ) : null}
                    {item.fonte_nome ? (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">{item.fonte_nome}</span>
                    ) : null}
                    <span className="ml-auto text-xs text-secondary/60">
                      {new Date(item.created_at).toLocaleString("it-IT")}
                    </span>
                  </div>

                  {isEditing ? (
                    <input
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-semibold text-secondary"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="text-left text-xl font-bold text-secondary hover:text-secondary/80"
                    >
                      {item.title}
                    </button>
                  )}

                  {isEditing ? (
                    <textarea
                      value={editingContent}
                      onChange={(event) => setEditingContent(event.target.value)}
                      className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-secondary"
                      rows={4}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="mt-3 text-left text-sm leading-6 text-secondary/80 hover:text-secondary"
                    >
                      {item.content}
                    </button>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => approve(item.id)}
                      disabled={itemSaving}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {itemSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Approva
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(item.id)}
                      disabled={itemSaving || !isEditing}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-secondary hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      Salva modifiche
                    </button>
                    <button
                      type="button"
                      onClick={() => discard(item.id)}
                      disabled={itemSaving}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                      Scarta
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-secondary/80">
          Bozze in attesa visualizzate: <strong>{pendingCount}</strong>
          <button type="button" onClick={() => loadNews()} className="ml-3 inline-flex items-center gap-1 text-secondary hover:underline">
            <RefreshCw className="h-4 w-4" /> Aggiorna
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
