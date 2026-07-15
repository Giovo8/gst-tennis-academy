"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Loader2, Moon, X } from "lucide-react";
import { toast } from "sonner";

interface SogliaRow {
  id: string;
  ora_notte: string;
  valido_dal: string;
  valido_al: string | null;
  created_at: string;
}

const todayISODate = () => new Date().toISOString().slice(0, 10);

const dateOnlyToISO = (dateStr: string) => new Date(`${dateStr}T00:00:00`).toISOString();

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });

// Il DB restituisce "HH:MM:SS" per una colonna time.
const toHHMM = (ora: string) => ora.slice(0, 5);

export default function NightThresholdPanel() {
  const [current, setCurrent] = useState<SogliaRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [oraNotte, setOraNotte] = useState("20:00");
  const [validoDal, setValidoDal] = useState(todayISODate());
  const [validoAl, setValidoAl] = useState("");

  const [showStorico, setShowStorico] = useState(false);
  const [storico, setStorico] = useState<SogliaRow[] | null>(null);
  const [loadingStorico, setLoadingStorico] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contabilita/soglia-notturna");
      if (!res.ok) throw new Error("Errore nel caricamento della soglia notturna");
      const json = await res.json();
      setCurrent(json.attuale || null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel caricamento della soglia notturna");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isValidoAlValid = !validoAl || validoAl > validoDal;
  const isValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(oraNotte) && validoDal && isValidoAlValid;

  async function saveNew() {
    if (!isValid) return;
    setSaving(true);
    try {
      const res = await fetch("/api/contabilita/soglia-notturna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ora_notte: oraNotte,
          valido_dal: dateOnlyToISO(validoDal),
          valido_al: validoAl ? dateOnlyToISO(validoAl) : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore durante il salvataggio della soglia");
      toast.success(`Soglia notturna aggiornata: notte da ${oraNotte}`);
      setShowForm(false);
      setValidoDal(todayISODate());
      setValidoAl("");
      setStorico(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante il salvataggio della soglia");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStorico() {
    if (showStorico) {
      setShowStorico(false);
      return;
    }
    setShowStorico(true);
    if (!storico) {
      setLoadingStorico(true);
      try {
        const res = await fetch("/api/contabilita/soglia-notturna?storico=1");
        if (!res.ok) throw new Error("Errore nel caricamento dello storico");
        const json = await res.json();
        setStorico(json.storico || []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore nel caricamento dello storico");
      } finally {
        setLoadingStorico(false);
      }
    }
  }

  async function deleteSoglia(row: SogliaRow) {
    if (
      !window.confirm(
        `Eliminare la soglia notte da ${toHHMM(row.ora_notte)} (dal ${formatDate(row.valido_dal)})? L'operazione non è reversibile.`,
      )
    ) {
      return;
    }
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/contabilita/soglia-notturna?id=${encodeURIComponent(row.id)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore durante l'eliminazione della soglia");
      toast.success("Soglia eliminata");
      setStorico(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'eliminazione della soglia");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-secondary/10 flex-shrink-0">
          <Moon className="h-5 w-5 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-secondary/60 uppercase tracking-wide">Soglia giorno/notte</p>
          {loading ? (
            <p className="text-sm text-secondary/60">Caricamento...</p>
          ) : current ? (
            <p className="text-sm text-secondary">
              Notte da <span className="font-bold">{toHHMM(current.ora_notte)}</span> — in vigore dal{" "}
              {formatDate(current.valido_dal)}
            </p>
          ) : (
            <p className="text-sm text-secondary/60">Nessuna soglia configurata (prezzo sempre &quot;giorno&quot;)</p>
          )}
        </div>
        {current && (
          <button
            type="button"
            onClick={() => deleteSoglia(current)}
            disabled={deletingId === current.id}
            title="Elimina soglia attuale"
            className="flex-shrink-0 p-1.5 rounded-md text-secondary/50 hover:text-secondary hover:bg-black/5 transition-colors disabled:opacity-40"
          >
            {deletingId === current.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex-shrink-0 text-xs font-semibold text-secondary underline underline-offset-2 hover:opacity-70 transition-opacity"
        >
          {showForm ? "Annulla" : "Cambia"}
        </button>
      </div>

      {showForm && (
        <div className="px-4 pb-4 flex flex-wrap items-end gap-3 border-t border-black/10 pt-4">
          <div>
            <label className="block text-xs font-semibold text-secondary/60 mb-1">Notte da</label>
            <input
              type="time"
              value={oraNotte}
              onChange={(e) => setOraNotte(e.target.value)}
              className="h-10 rounded-lg border border-black/10 bg-white px-3 text-secondary focus:outline-none focus:ring-0 focus:border-secondary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary/60 mb-1">Valido dal</label>
            <input
              type="date"
              value={validoDal}
              onChange={(e) => setValidoDal(e.target.value)}
              className="h-10 rounded-lg border border-black/10 bg-white px-3 text-secondary focus:outline-none focus:ring-0 focus:border-secondary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary/60 mb-1">Fino a</label>
            <input
              type="date"
              value={validoAl}
              onChange={(e) => setValidoAl(e.target.value)}
              placeholder="Illimitato"
              className={`h-10 rounded-lg border bg-white px-3 text-secondary focus:outline-none focus:ring-0 ${
                isValidoAlValid ? "border-black/10 focus:border-secondary" : "border-red-400 focus:border-red-400"
              }`}
            />
          </div>
          <button
            type="button"
            onClick={saveNew}
            disabled={!isValid || saving}
            className="inline-flex h-10 items-center gap-2 px-4 rounded-lg bg-secondary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Salva
          </button>
          {!isValidoAlValid && (
            <p className="w-full text-xs text-red-500">
              Se impostata, la data &quot;fino a&quot; deve essere successiva a &quot;valido dal&quot;.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={toggleStorico}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-secondary/60 hover:text-secondary border-t border-black/10 transition-colors"
      >
        Storico soglie
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showStorico ? "rotate-180" : ""}`} />
      </button>

      {showStorico && (
        <div className="border-t border-black/10 divide-y divide-black/5">
          {loadingStorico ? (
            <div className="py-4 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-secondary/50" />
            </div>
          ) : !storico || storico.length === 0 ? (
            <p className="px-4 py-4 text-sm text-secondary/60 text-center">Nessuna soglia storica.</p>
          ) : (
            storico.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-secondary">
                  Notte da <span className="font-semibold">{toHHMM(row.ora_notte)}</span> · dal{" "}
                  {formatDate(row.valido_dal)}
                  {row.valido_al ? ` al ${formatDate(row.valido_al)}` : " (in vigore)"}
                </span>
                <button
                  type="button"
                  onClick={() => deleteSoglia(row)}
                  disabled={deletingId === row.id}
                  title="Elimina"
                  className="flex-shrink-0 p-1 rounded-md text-secondary/40 hover:text-secondary hover:bg-black/5 transition-colors disabled:opacity-40"
                >
                  {deletingId === row.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
