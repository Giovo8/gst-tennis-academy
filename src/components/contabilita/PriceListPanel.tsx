"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface ListinoPrezzoRow {
  id: string;
  tipo_prenotazione: string;
  durata_minuti: number;
  prezzo: number;
  valido_dal: string;
  valido_al: string | null;
  created_at: string;
}

interface PriceListPanelProps {
  /** Chiamato dopo un salvataggio riuscito, per aggiornare i KPI del parent. */
  onSaved?: () => void;
  /** Controlla dall'esterno (bottone in cima alla pagina) la visibilità del form nuovo prezzo. */
  showNewForm: boolean;
  /** Chiamato per chiudere il form nuovo prezzo (dopo salvataggio o annullamento). */
  onCloseNewForm: () => void;
}

const TIPI: { value: string; label: string }[] = [
  { value: "campo", label: "Campo" },
  { value: "lezione", label: "Lezione" },
  { value: "lezione_privata", label: "Lezione privata" },
  { value: "lezione_gruppo", label: "Lezione di gruppo" },
];

const tipoLabel = (tipo: string) => TIPI.find((t) => t.value === tipo)?.label ?? tipo;

// Stessa palette per tipo prenotazione usata in dashboard/admin/bookings.
const tipoColor = (tipo: string) =>
  tipo === "lezione_privata" || tipo === "lezione_gruppo" || tipo === "lezione"
    ? "#023047"
    : "var(--secondary)";

const todayISODate = () => new Date().toISOString().slice(0, 10);

const dateOnlyToISO = (dateStr: string) => new Date(`${dateStr}T00:00:00`).toISOString();

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });

function rowKey(tipo: string, durata: number) {
  return `${tipo}::${durata}`;
}

export default function PriceListPanel({ onSaved, showNewForm, onCloseNewForm }: PriceListPanelProps) {
  const [rows, setRows] = useState<ListinoPrezzoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editPrezzo, setEditPrezzo] = useState("");
  const [editValidoDal, setEditValidoDal] = useState(todayISODate());
  const [editValidoAl, setEditValidoAl] = useState("");
  const [saving, setSaving] = useState(false);

  const [newTipo, setNewTipo] = useState("campo");
  const [newDurata, setNewDurata] = useState("60");
  const [newPrezzo, setNewPrezzo] = useState("");
  const [newValidoDal, setNewValidoDal] = useState(todayISODate());
  const [newValidoAl, setNewValidoAl] = useState("");

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [storico, setStorico] = useState<Record<string, ListinoPrezzoRow[]>>({});
  const [loadingStorico, setLoadingStorico] = useState<string | null>(null);

  const loadPrices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contabilita/listino-prezzi");
      if (!res.ok) throw new Error("Errore nel caricamento del listino");
      const json = await res.json();
      setRows(json.attuali || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel caricamento del listino");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  async function submitPrice(params: {
    tipo_prenotazione: string;
    durata_minuti: number;
    prezzo: number;
    valido_dal: string;
    valido_al?: string | null;
  }) {
    const res = await fetch("/api/contabilita/listino-prezzi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || "Errore durante il salvataggio del prezzo");
    }
  }

  const editParsed = Number(editPrezzo.replace(",", "."));
  const isEditValidoAlValid = !editValidoAl || editValidoAl > editValidoDal;
  const isEditValid =
    editPrezzo.trim() !== "" &&
    Number.isFinite(editParsed) &&
    editParsed >= 0 &&
    editValidoDal &&
    isEditValidoAlValid;

  async function saveEdit(row: ListinoPrezzoRow) {
    if (!isEditValid) return;
    setSaving(true);
    try {
      await submitPrice({
        tipo_prenotazione: row.tipo_prenotazione,
        durata_minuti: row.durata_minuti,
        prezzo: editParsed,
        valido_dal: dateOnlyToISO(editValidoDal),
        valido_al: editValidoAl ? dateOnlyToISO(editValidoAl) : null,
      });
      toast.success(`Nuovo prezzo per ${tipoLabel(row.tipo_prenotazione)} (${row.durata_minuti} min) impostato`);
      setExpandedKey(null);
      setStorico((prev) => {
        const rest = { ...prev };
        delete rest[rowKey(row.tipo_prenotazione, row.durata_minuti)];
        return rest;
      });
      await loadPrices();
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante il salvataggio del prezzo");
    } finally {
      setSaving(false);
    }
  }

  const newParsedDurata = Number(newDurata);
  const newParsedPrezzo = Number(newPrezzo.replace(",", "."));
  const isNewDurataTaken = rows.some((r) => r.tipo_prenotazione === newTipo && r.durata_minuti === newParsedDurata);
  const isNewValidoAlValid = !newValidoAl || newValidoAl > newValidoDal;
  const isNewValid =
    Number.isInteger(newParsedDurata) &&
    newParsedDurata > 0 &&
    newPrezzo.trim() !== "" &&
    Number.isFinite(newParsedPrezzo) &&
    newParsedPrezzo >= 0 &&
    newValidoDal &&
    isNewValidoAlValid &&
    !isNewDurataTaken;

  async function saveNew() {
    if (!isNewValid) return;
    setSaving(true);
    try {
      await submitPrice({
        tipo_prenotazione: newTipo,
        durata_minuti: newParsedDurata,
        prezzo: newParsedPrezzo,
        valido_dal: dateOnlyToISO(newValidoDal),
        valido_al: newValidoAl ? dateOnlyToISO(newValidoAl) : null,
      });
      toast.success(`Prezzo per ${tipoLabel(newTipo)} (${newParsedDurata} min) aggiunto al listino`);
      onCloseNewForm();
      setNewPrezzo("");
      setNewDurata("60");
      setNewValidoDal(todayISODate());
      setNewValidoAl("");
      await loadPrices();
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante il salvataggio del prezzo");
    } finally {
      setSaving(false);
    }
  }

  async function toggleExpand(row: ListinoPrezzoRow) {
    const key = rowKey(row.tipo_prenotazione, row.durata_minuti);
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    setEditPrezzo(String(row.prezzo));
    setEditValidoDal(todayISODate());
    setEditValidoAl("");
    if (!storico[key]) {
      setLoadingStorico(key);
      try {
        const res = await fetch(
          `/api/contabilita/listino-prezzi?storico=1&tipo=${encodeURIComponent(row.tipo_prenotazione)}&durata=${row.durata_minuti}`,
        );
        if (!res.ok) throw new Error("Errore nel caricamento dello storico");
        const json = await res.json();
        setStorico((prev) => ({ ...prev, [key]: json.storico || [] }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore nel caricamento dello storico");
      } finally {
        setLoadingStorico(null);
      }
    }
  }

  const groups = TIPI.map((t) => ({
    tipo: t,
    items: rows.filter((r) => r.tipo_prenotazione === t.value),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {showNewForm && (
        <div className="bg-white rounded-lg border border-black/10 px-4 py-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-secondary/60 mb-1">Tipo</label>
            <select
              value={newTipo}
              onChange={(e) => setNewTipo(e.target.value)}
              className="h-10 rounded-lg border border-black/10 bg-white px-3 text-secondary focus:outline-none focus:ring-0 focus:border-secondary"
            >
              {TIPI.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary/60 mb-1">Durata (min)</label>
            <input
              type="number"
              min={1}
              step="1"
              value={newDurata}
              onChange={(e) => setNewDurata(e.target.value)}
              className="h-10 w-24 rounded-lg border border-black/10 bg-white px-3 text-secondary focus:outline-none focus:ring-0 focus:border-secondary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary/60 mb-1">Prezzo</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step="0.5"
                value={newPrezzo}
                onChange={(e) => setNewPrezzo(e.target.value)}
                className="h-10 w-28 rounded-lg border border-black/10 bg-white pl-3 pr-7 text-right text-secondary focus:outline-none focus:ring-0 focus:border-secondary"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/50 text-sm">€</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary/60 mb-1">Valido dal</label>
            <input
              type="date"
              value={newValidoDal}
              onChange={(e) => setNewValidoDal(e.target.value)}
              className="h-10 rounded-lg border border-black/10 bg-white px-3 text-secondary focus:outline-none focus:ring-0 focus:border-secondary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary/60 mb-1">Fino a</label>
            <input
              type="date"
              value={newValidoAl}
              onChange={(e) => setNewValidoAl(e.target.value)}
              placeholder="Illimitato"
              className={`h-10 rounded-lg border bg-white px-3 text-secondary focus:outline-none focus:ring-0 ${
                isNewValidoAlValid ? "border-black/10 focus:border-secondary" : "border-red-400 focus:border-red-400"
              }`}
            />
          </div>
          <button
            type="button"
            onClick={saveNew}
            disabled={!isNewValid || saving}
            className="inline-flex h-10 items-center gap-2 px-4 rounded-lg bg-secondary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Salva
          </button>
          {!isNewValidoAlValid && (
            <p className="w-full text-xs text-red-500">Se impostata, la data &quot;fino a&quot; deve essere successiva a &quot;valido dal&quot;. Lascia vuoto per un prezzo illimitato.</p>
          )}
          {isNewDurataTaken && (
            <p className="w-full text-xs text-red-500">
              Esiste già un prezzo attivo per {tipoLabel(newTipo)} a {newDurata} min: apri quella riga per modificarlo.
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-secondary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-black/10 py-10 text-center text-secondary/60">
          Nessun prezzo configurato. Aggiungine uno con &quot;Nuovo prezzo&quot;.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.tipo.value} className="space-y-2">
              {g.items.map((row) => {
                const key = rowKey(row.tipo_prenotazione, row.durata_minuti);
                const isExpanded = expandedKey === key;
                return (
                  <div
                    key={key}
                    className="rounded-lg overflow-visible transition-opacity"
                    style={{ background: tipoColor(row.tipo_prenotazione) }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(row)}
                      className="w-full flex items-center gap-4 py-3 px-3 text-left hover:opacity-95 transition-opacity"
                    >
                      <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
                        <span className="text-[10px] uppercase font-bold text-white/70 leading-none">min</span>
                        <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
                          {row.durata_minuti}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{tipoLabel(row.tipo_prenotazione)}</p>
                        <p className="text-xs text-white/70 mt-0.5">
                          dal {formatDate(row.valido_dal)}
                          {row.valido_al ? ` al ${formatDate(row.valido_al)}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-white flex-shrink-0 tabular-nums">
                        {formatCurrency(row.prezzo)}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-white/70 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="bg-black/10 px-3 pb-3 pt-1 space-y-3">
                        <div className="flex flex-wrap items-end gap-2 pt-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-white/70 mb-1">Nuovo prezzo</label>
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                step="0.5"
                                value={editPrezzo}
                                onChange={(e) => setEditPrezzo(e.target.value)}
                                className="h-10 w-24 rounded-lg border border-white/20 bg-white pl-3 pr-7 text-right text-secondary focus:outline-none focus:ring-0"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/50 text-sm">
                                €
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-white/70 mb-1">Valido dal</label>
                            <input
                              type="date"
                              value={editValidoDal}
                              onChange={(e) => setEditValidoDal(e.target.value)}
                              className="h-10 rounded-lg border border-white/20 bg-white px-3 text-sm text-secondary focus:outline-none focus:ring-0"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-white/70 mb-1">Fino a</label>
                            <input
                              type="date"
                              value={editValidoAl}
                              onChange={(e) => setEditValidoAl(e.target.value)}
                              placeholder="Illimitato"
                              className={`h-10 rounded-lg border bg-white px-3 text-sm text-secondary focus:outline-none focus:ring-0 ${
                                isEditValidoAlValid ? "border-white/20" : "border-red-400"
                              }`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => saveEdit(row)}
                            disabled={!isEditValid || saving}
                            className="inline-flex h-10 items-center gap-2 px-4 rounded-lg bg-white text-secondary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Salva
                          </button>
                        </div>
                        {!isEditValidoAlValid && (
                          <p className="text-xs text-white/80">
                            Se impostata, la data &quot;fino a&quot; deve essere successiva a &quot;valido dal&quot;. Lascia vuoto per un
                            prezzo illimitato.
                          </p>
                        )}

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-1">
                            Storico
                          </p>
                          {loadingStorico === key ? (
                            <div className="py-3 flex justify-center">
                              <Loader2 className="w-5 h-5 animate-spin text-white/70" />
                            </div>
                          ) : (
                            <div className="rounded-lg bg-white/10 divide-y divide-white/10">
                              {(storico[key] || []).map((h) => (
                                <div
                                  key={h.id}
                                  className="flex items-center justify-between px-3 py-2 text-sm text-white/80"
                                >
                                  <span>
                                    {formatDate(h.valido_dal)} — {h.valido_al ? formatDate(h.valido_al) : "in vigore"}
                                  </span>
                                  <span className="font-medium tabular-nums text-white">
                                    {formatCurrency(h.prezzo)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
