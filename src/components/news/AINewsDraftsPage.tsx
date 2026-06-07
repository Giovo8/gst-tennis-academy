"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, Check, Loader2, RefreshCw, Search, Settings, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import AuthGuard from "@/components/auth/AuthGuard";
import { sanitizeAINewsBody, sanitizeAINewsTitle } from "@/lib/ai-news/contentSanitizer";

type DraftItem = {
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

type Props = {
  basePath: string;
};

export default function AINewsDraftsPage({ basePath }: Props) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [cleaningArchive, setCleaningArchive] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [filtro, setFiltro] = useState<"tutte" | "bozza" | "pubblicata" | "scartata">("tutte");
  const [searchQuery, setSearchQuery] = useState("");
  const [pubblicazioneAuto, setPubblicazioneAuto] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, { titolo: string; testo: string }>>({});

  const filteredItems = useMemo(() => {
    const byStatus = filtro === "tutte" ? items : items.filter((item) => item.stato === filtro);

    const query = searchQuery.trim().toLowerCase();
    if (!query) return byStatus;

    return byStatus.filter((item) => {
      return (
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        (item.category || "").toLowerCase().includes(query) ||
        (item.fonte_nome || "").toLowerCase().includes(query)
      );
    });
  }, [items, filtro, searchQuery]);

  async function loadAll() {
    setLoading(true);

    try {
      const [bozzeRes, configRes] = await Promise.all([
        fetch(`/api/ai-news/bozze?stato=tutte`, { cache: "no-store" }),
        fetch(`/api/ai-news/config`, { cache: "no-store" }),
      ]);

      const bozzeJson = await bozzeRes.json();
      const configJson = await configRes.json();

      if (!bozzeRes.ok) throw new Error(bozzeJson?.error ?? "Errore caricamento bozze");
      if (!configRes.ok) throw new Error(configJson?.error ?? "Errore caricamento configurazione");

      const nextItems = ((bozzeJson.items ?? []) as DraftItem[]).map((item) => ({
        ...item,
        title: sanitizeAINewsTitle(item.title || ""),
        content: sanitizeAINewsBody(item.content || ""),
        excerpt: item.excerpt ? sanitizeAINewsBody(item.excerpt) : item.excerpt,
      }));
      setItems(nextItems);
      setPubblicazioneAuto(Boolean(configJson?.pubblicazione_auto));

      const mapped: Record<string, { titolo: string; testo: string }> = {};
      nextItems.forEach((item) => {
        mapped[item.id] = { titolo: item.title, testo: item.content };
      });
      setDraftValues(mapped);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore caricamento dati");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function generaOra() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai-news/genera", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Errore durante la generazione");

      toast.success(`Generate ${json.generate ?? 0} news, skippate ${json.skippate ?? 0}`);
      const errori = Array.isArray(json?.errori) ? json.errori : [];
      if (errori.length > 0) {
        toast.error(`Alcune fonti hanno restituito errore (${errori.length}). Controlla il log in Configurazione.`);
      }
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore generazione news");
    } finally {
      setGenerating(false);
    }
  }

  async function approva(id: string) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/ai-news/${id}/approva`, { method: "PATCH" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Errore approvazione");

      toast.success("News approvata e pubblicata");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore approvazione news");
    } finally {
      setSavingId(null);
    }
  }

  async function bonificaArchivioAi() {
    setCleaningArchive(true);
    try {
      const res = await fetch("/api/ai-news/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Errore bonifica archivio AI");

      const errored = Array.isArray(json?.errors) ? json.errors.length : 0;
      const translatedCount: number = json?.translated ?? 0;
      toast.success(
        `Bonifica completata: ${json.updated ?? 0} aggiornate su ${json.scanned ?? 0}${translatedCount > 0 ? `, ${translatedCount} tradotte in italiano` : ""}${errored > 0 ? ` (${errored} errori)` : ""}`
      );

      if (json?.geminiAvailable === false) {
        toast.error("Gemini non configurato: le news in inglese non sono state tradotte. Imposta GEMINI_API_KEY nelle variabili d'ambiente.");
      }

      if (errored > 0) {
        toast.error("Alcune righe non sono state aggiornate. Controlla i log server.");
      }

      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore bonifica archivio AI");
    } finally {
      setCleaningArchive(false);
    }
  }

  async function scarta(id: string) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/ai-news/${id}/scarta`, { method: "PATCH" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Errore scarto");

      toast.success("News scartata");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore scarto news");
    } finally {
      setSavingId(null);
    }
  }

  async function salvaModifiche(id: string) {
    const values = draftValues[id];
    if (!values?.titolo?.trim() || !values?.testo?.trim()) {
      toast.error("Titolo e testo sono obbligatori");
      return;
    }

    setSavingId(id);
    try {
      const res = await fetch(`/api/ai-news/${id}/modifica`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titolo: values.titolo.trim(), testo: values.testo.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Errore salvataggio modifiche");

      setEditingTitleId(null);
      setEditingTextId(null);
      toast.success("Modifiche salvate");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore modifica news");
    } finally {
      setSavingId(null);
    }
  }

  function renderBadgeStato(stato: DraftItem["stato"]) {
    if (stato === "pubblicata") return "bg-emerald-100 text-emerald-700";
    if (stato === "scartata") return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-700";
  }

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="breadcrumb text-secondary/60">
              <span>News</span>
              {" › "}
              <span>News AI</span>
            </p>
            <h1 className="text-4xl font-bold text-secondary">News AI</h1>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              onClick={generaOra}
              disabled={generating || cleaningArchive}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Genera ora
            </button>
            <button
              onClick={bonificaArchivioAi}
              disabled={generating || cleaningArchive}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-secondary shadow-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {cleaningArchive ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Bonifica archivio AI
            </button>
            <Link
              href={`${basePath}/configurazione`}
              title="Configurazione News AI"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 bg-white text-secondary shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {pubblicazioneAuto && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Modalita automatica attiva - le news vengono pubblicate senza approvazione
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per titolo, testo, categoria o fonte..."
            className="w-full rounded-md border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-secondary shadow-sm placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: "tutte", label: "Tutte" },
            { key: "bozza", label: "In attesa" },
            { key: "pubblicata", label: "Pubblicate" },
            { key: "scartata", label: "Scartate" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFiltro(opt.key as typeof filtro)}
              className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
                filtro === opt.key
                  ? "border border-secondary bg-secondary text-white"
                  : "border border-gray-200 bg-white text-secondary hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-secondary" />
            <p className="mt-4 text-secondary/60">Caricamento bozze AI...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-md bg-white py-20 text-center">
            <Bot className="mx-auto mb-3 h-12 w-12 text-secondary/20" />
            <h2 className="text-xl font-semibold text-secondary">Nessuna bozza trovata</h2>
            <p className="mt-1 text-sm text-secondary/70">Prova a generare nuove news o modifica filtri e ricerca</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredItems.map((item) => {
              const values = draftValues[item.id] ?? { titolo: item.title, testo: item.content };

              return (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">
                      AI
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      Notizie
                    </span>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                      {item.fonte_nome || "Fonte sconosciuta"}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${renderBadgeStato(item.stato)}`}>
                      {item.stato}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {editingTitleId === item.id ? (
                      <input
                        value={values.titolo}
                        onChange={(e) =>
                          setDraftValues((prev) => ({ ...prev, [item.id]: { ...values, titolo: e.target.value } }))
                        }
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-lg font-bold text-secondary shadow-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingTitleId(item.id)}
                        className="w-full text-left text-lg font-bold text-secondary hover:text-secondary/80"
                      >
                        {values.titolo}
                      </button>
                    )}

                    {editingTextId === item.id ? (
                      <textarea
                        value={values.testo}
                        onChange={(e) =>
                          setDraftValues((prev) => ({ ...prev, [item.id]: { ...values, testo: e.target.value } }))
                        }
                        rows={4}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-secondary shadow-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingTextId(item.id)}
                        className="w-full text-left text-sm text-secondary/80 hover:text-secondary"
                      >
                        {values.testo}
                      </button>
                    )}

                    <p className="text-xs text-secondary/60">
                      Generata il {new Date(item.created_at).toLocaleString("it-IT")}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => approva(item.id)}
                      disabled={savingId === item.id}
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {savingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Approva
                    </button>
                    <button
                      onClick={() => salvaModifiche(item.id)}
                      disabled={savingId === item.id}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-secondary shadow-sm hover:bg-gray-50 disabled:opacity-60"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Salva modifiche
                    </button>
                    <button
                      onClick={() => scarta(item.id)}
                      disabled={savingId === item.id}
                      className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      <X className="h-3 w-3" />
                      Scarta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
