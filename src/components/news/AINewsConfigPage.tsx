"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import Link from "next/link";
import { Loader2, Plus, Play, RefreshCw, Settings, TestTube, Trash2 } from "lucide-react";
import { toast } from "sonner";

type CronItem = {
  id: string;
  nome: string;
  ora: number;
  minuto: number;
  categoria: string | null;
  prompt_custom: string | null;
  attivo: boolean;
  ultimo_eseguito: string | null;
};

type FonteItem = {
  id: string;
  nome: string;
  url: string;
  categoria: string | null;
  attiva: boolean;
};

type LogItem = {
  id: string;
  eseguito_a: string;
  tipo: "manuale" | "cron";
  cron_id: string | null;
  generate: number;
  skippate: number;
  errori: string[];
};

type Props = {
  basePath: string;
};

const CATEGORIE = ["tutte", "tornei", "tecnica", "locale", "generale"];

const DEFAULT_SOURCE_URLS = new Set([
  "https://www.gazzetta.it/rss/tennis.xml",
  "https://www.atptour.com/en/media/rss-feed/xml-feed",
  "https://www.ubitennis.com/feed/",
]);

export default function AINewsConfigPage({ basePath }: Props) {
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [pubblicazioneAuto, setPubblicazioneAuto] = useState(false);

  const [crons, setCrons] = useState<CronItem[]>([]);
  const [fonti, setFonti] = useState<FonteItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);

  const [cronForm, setCronForm] = useState({
    id: "",
    nome: "",
    ora: 9,
    minuto: 0,
    categoria: "tutte",
    prompt_custom: "",
    attivo: true,
  });

  const [fonteForm, setFonteForm] = useState({
    id: "",
    nome: "",
    url: "",
    categoria: "generale",
    attiva: true,
  });

  const activeCrons = useMemo(() => crons.filter((c) => c.attivo).length, [crons]);

  async function loadAll() {
    setLoading(true);
    try {
      const [configRes, cronRes, fontiRes, logsRes] = await Promise.all([
        fetch("/api/ai-news/config", { cache: "no-store" }),
        fetch("/api/ai-news/cron", { cache: "no-store" }),
        fetch("/api/ai-news/fonti", { cache: "no-store" }),
        fetch("/api/ai-news/logs", { cache: "no-store" }),
      ]);

      const [configJson, cronJson, fontiJson, logsJson] = await Promise.all([
        configRes.json(),
        cronRes.json(),
        fontiRes.json(),
        logsRes.json(),
      ]);

      if (!configRes.ok) throw new Error(configJson?.error ?? "Errore configurazione");
      if (!cronRes.ok) throw new Error(cronJson?.error ?? "Errore cron");
      if (!fontiRes.ok) throw new Error(fontiJson?.error ?? "Errore fonti");
      if (!logsRes.ok) throw new Error(logsJson?.error ?? "Errore log");

      setPubblicazioneAuto(Boolean(configJson?.pubblicazione_auto));
      setCrons(cronJson.items ?? []);
      setFonti(fontiJson.items ?? []);
      setLogs(logsJson.items ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore caricamento configurazione");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function updateConfig(nextValue: boolean) {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/ai-news/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pubblicazione_auto: nextValue }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Errore salvataggio configurazione");

      setPubblicazioneAuto(Boolean(json?.pubblicazione_auto));
      toast.success("Configurazione aggiornata");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore salvataggio");
    } finally {
      setSavingConfig(false);
    }
  }

  async function saveCron(event: FormEvent) {
    event.preventDefault();

    const isEdit = Boolean(cronForm.id);
    const url = isEdit ? `/api/ai-news/cron/${cronForm.id}` : "/api/ai-news/cron";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cronForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Errore salvataggio cron");

      await fetch("/api/ai-news/cron/sync", { method: "POST" });
      toast.success(isEdit ? "Cron aggiornato" : "Cron creato");
      setCronForm({ id: "", nome: "", ora: 9, minuto: 0, categoria: "tutte", prompt_custom: "", attivo: true });
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore cron");
    }
  }

  async function deleteCron(id: string) {
    try {
      const res = await fetch(`/api/ai-news/cron/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Errore eliminazione cron");

      await fetch("/api/ai-news/cron/sync", { method: "POST" });
      toast.success("Cron eliminato");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore eliminazione cron");
    }
  }

  async function runCronNow(id: string) {
    try {
      const res = await fetch(`/api/ai-news/cron/${id}/esegui`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Errore esecuzione cron");

      toast.success(`Generate ${json.generate ?? 0} news, skippate ${json.skippate ?? 0}`);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore esecuzione cron");
    }
  }

  async function saveFonte(event: FormEvent) {
    event.preventDefault();

    const isEdit = Boolean(fonteForm.id);
    const url = isEdit ? `/api/ai-news/fonti/${fonteForm.id}` : "/api/ai-news/fonti";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fonteForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Errore salvataggio fonte");

      toast.success(isEdit ? "Fonte aggiornata" : "Fonte aggiunta");
      setFonteForm({ id: "", nome: "", url: "", categoria: "generale", attiva: true });
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore salvataggio fonte");
    }
  }

  async function deleteFonte(id: string) {
    try {
      const res = await fetch(`/api/ai-news/fonti/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Errore eliminazione fonte");

      toast.success("Fonte eliminata");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore eliminazione fonte");
    }
  }

  async function testFonte(id: string) {
    try {
      const res = await fetch(`/api/ai-news/fonti/${id}/test`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Feed non raggiungibile");

      toast.success(`Fonte valida: ${json.articoli_trovati} articoli trovati`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore test fonte");
    }
  }

  if (loading) {
    return (
      <AuthGuard allowedRoles={["admin", "gestore"]}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="breadcrumb text-secondary/60">
              <Link href={basePath} className="hover:text-secondary/80 transition-colors">News AI</Link>
              {" › "}
              <span>Configurazione Sistema</span>
            </p>
            <h1 className="text-4xl font-bold text-secondary">Configurazione Sistema</h1>
            <p className="text-secondary/70">Gestisci modalita, cron, fonti RSS e log delle generazioni</p>
          </div>
          <Link href={basePath} className="inline-flex items-center gap-2 rounded-lg border border-secondary/20 px-4 py-2 text-sm font-semibold text-secondary hover:bg-secondary/5">
            <Settings className="h-4 w-4" />
            Torna a News AI
          </Link>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-secondary">A. Modalita pubblicazione</h2>
          <p className="mt-1 text-sm text-secondary/70">
            {pubblicazioneAuto
              ? "Pubblicazione automatica attiva: le news vengono pubblicate subito."
              : "Approvazione manuale attiva: le news restano in bozza finche non approvate."}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => updateConfig(false)}
              disabled={savingConfig}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                !pubblicazioneAuto ? "bg-secondary text-white" : "border border-gray-200 text-secondary"
              }`}
            >
              Approvazione manuale
            </button>
            <button
              onClick={() => updateConfig(true)}
              disabled={savingConfig}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                pubblicazioneAuto ? "bg-secondary text-white" : "border border-gray-200 text-secondary"
              }`}
            >
              Pubblicazione automatica
            </button>
            {savingConfig && <Loader2 className="h-4 w-4 animate-spin text-secondary" />}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-secondary">B. Cron job</h2>
            <button
              onClick={() => setCronForm({ id: "", nome: "", ora: 9, minuto: 0, categoria: "tutte", prompt_custom: "", attivo: true })}
              className="inline-flex items-center gap-2 rounded-lg border border-secondary/20 px-3 py-2 text-sm font-semibold text-secondary"
            >
              <Plus className="h-4 w-4" />
              Aggiungi cron
            </button>
          </div>

          {activeCrons > 8 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Hai superato il limite di 8 cron attivi contemporaneamente.
            </div>
          )}

          <form onSubmit={saveCron} className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
            <input
              value={cronForm.nome}
              onChange={(e) => setCronForm((prev) => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome cron"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              required
            />
            <select
              value={cronForm.ora}
              onChange={(e) => setCronForm((prev) => ({ ...prev, ora: Number(e.target.value) }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {Array.from({ length: 24 }).map((_, h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
              ))}
            </select>
            <select
              value={cronForm.minuto}
              onChange={(e) => setCronForm((prev) => ({ ...prev, minuto: Number(e.target.value) }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
              ))}
            </select>
            <select
              value={cronForm.categoria}
              onChange={(e) => setCronForm((prev) => ({ ...prev, categoria: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {CATEGORIE.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <textarea
              value={cronForm.prompt_custom}
              onChange={(e) => setCronForm((prev) => ({ ...prev, prompt_custom: e.target.value }))}
              placeholder="Prompt aggiuntivo opzionale"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
              rows={2}
            />
            <label className="inline-flex items-center gap-2 text-sm text-secondary">
              <input
                type="checkbox"
                checked={cronForm.attivo}
                onChange={(e) => setCronForm((prev) => ({ ...prev, attivo: e.target.checked }))}
              />
              Attivo
            </label>
            <button type="submit" className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white">
              Salva cron
            </button>
          </form>

          <div className="space-y-3">
            {crons.map((cron) => (
              <div key={cron.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-secondary">{cron.nome}</p>
                    <p className="text-xs text-secondary/70">
                      Ora italiana {String(cron.ora).padStart(2, "0")}:{String(cron.minuto).padStart(2, "0")} - categoria {cron.categoria || "tutte"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${cron.attivo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {cron.attivo ? "attivo" : "disattivo"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      setCronForm({
                        id: cron.id,
                        nome: cron.nome,
                        ora: cron.ora,
                        minuto: cron.minuto,
                        categoria: cron.categoria || "tutte",
                        prompt_custom: cron.prompt_custom || "",
                        attivo: cron.attivo,
                      })
                    }
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-secondary"
                  >
                    Modifica
                  </button>
                  <button onClick={() => deleteCron(cron.id)} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white">
                    <Trash2 className="mr-1 inline h-3 w-3" />
                    Elimina
                  </button>
                  <button onClick={() => runCronNow(cron.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                    <Play className="mr-1 inline h-3 w-3" />
                    Esegui ora
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-secondary">C. Fonti RSS</h2>
            <button
              onClick={() => setFonteForm({ id: "", nome: "", url: "", categoria: "generale", attiva: true })}
              className="inline-flex items-center gap-2 rounded-lg border border-secondary/20 px-3 py-2 text-sm font-semibold text-secondary"
            >
              <Plus className="h-4 w-4" />
              Aggiungi fonte
            </button>
          </div>

          <form onSubmit={saveFonte} className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
            <input
              value={fonteForm.nome}
              onChange={(e) => setFonteForm((prev) => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome fonte"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              required
            />
            <input
              value={fonteForm.url}
              onChange={(e) => setFonteForm((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="URL feed RSS"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              required
            />
            <select
              value={fonteForm.categoria}
              onChange={(e) => setFonteForm((prev) => ({ ...prev, categoria: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {CATEGORIE.filter((c) => c !== "tutte").map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-secondary">
              <input
                type="checkbox"
                checked={fonteForm.attiva}
                onChange={(e) => setFonteForm((prev) => ({ ...prev, attiva: e.target.checked }))}
              />
              Attiva
            </label>
            <button type="submit" className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white md:col-span-2">
              Salva fonte
            </button>
          </form>

          <div className="space-y-3">
            {fonti.map((fonte) => {
              const isDefault = DEFAULT_SOURCE_URLS.has(fonte.url);

              return (
                <div key={fonte.id} className="rounded-xl border border-gray-200 p-3">
                  <p className="font-semibold text-secondary">{fonte.nome}</p>
                  <p className="text-xs text-secondary/70">{fonte.url}</p>
                  <p className="mt-1 text-xs text-secondary/70">Categoria: {fonte.categoria || "generale"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        setFonteForm({
                          id: fonte.id,
                          nome: fonte.nome,
                          url: fonte.url,
                          categoria: fonte.categoria || "generale",
                          attiva: fonte.attiva,
                        })
                      }
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-secondary"
                    >
                      Modifica
                    </button>
                    {!isDefault && (
                      <button onClick={() => deleteFonte(fonte.id)} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white">
                        Elimina
                      </button>
                    )}
                    <button onClick={() => testFonte(fonte.id)} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white">
                      <TestTube className="mr-1 inline h-3 w-3" />
                      Testa fonte
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-secondary">D. Log ultime generazioni</h2>
            <button onClick={loadAll} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-secondary">
              <RefreshCw className="h-4 w-4" />
              Aggiorna log
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-secondary/70">
                  <th className="py-2">Data/ora</th>
                  <th className="py-2">Cron o Manuale</th>
                  <th className="py-2">Generate</th>
                  <th className="py-2">Skippate</th>
                  <th className="py-2">Errori</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100">
                    <td className="py-2">{new Date(log.eseguito_a).toLocaleString("it-IT")}</td>
                    <td className="py-2">{log.tipo === "cron" ? `Cron ${log.cron_id ?? "-"}` : "Manuale"}</td>
                    <td className="py-2">{log.generate}</td>
                    <td className="py-2">{log.skippate}</td>
                    <td className="py-2">{Array.isArray(log.errori) ? log.errori.length : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}
