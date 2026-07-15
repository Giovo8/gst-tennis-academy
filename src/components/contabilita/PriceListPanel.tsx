"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface ListinoPrezzoRow {
  id: string;
  tipo_prenotazione: string;
  formato: string | null;
  fascia_oraria: string | null;
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

// Stessi tipi selezionabili in dashboard/admin/bookings/new.
const TIPI: { value: string; label: string }[] = [
  { value: "campo", label: "Campo" },
  { value: "lezione_privata", label: "Lezione privata" },
];

// Il campo ha un prezzo diverso per singolo (<=2 giocatori) e doppio (>2), come nel
// selettore "Modalità" di dashboard/admin/bookings/new.
const FORMATI_CAMPO: { value: string; label: string }[] = [
  { value: "singolo", label: "Singolo" },
  { value: "doppio", label: "Doppio" },
];

// La lezione privata ha un prezzo diverso per singola (1 partecipante) e doppia (2+
// partecipanti), calcolato dal numero di partecipanti alla creazione della prenotazione.
const FORMATI_LEZIONE_PRIVATA: { value: string; label: string }[] = [
  { value: "singola", label: "Singola" },
  { value: "doppia", label: "Doppia" },
];

const FORMATI_PER_TIPO: Record<string, { value: string; label: string }[]> = {
  campo: FORMATI_CAMPO,
  lezione_privata: FORMATI_LEZIONE_PRIVATA,
};

const TIPI_CON_FORMATO = ["campo", "lezione_privata"];

const FORMATI = [...FORMATI_CAMPO, ...FORMATI_LEZIONE_PRIVATA];

// Campo e lezione privata hanno un prezzo diverso in base alla fascia oraria (soglia
// gestita a parte in "Soglia giorno/notte", perché stagionale). "Tutto il giorno" imposta un
// prezzo unico che vale sia di giorno che di notte, senza doverli differenziare.
const FASCE: { value: string; label: string }[] = [
  { value: "giorno", label: "Giorno" },
  { value: "notte", label: "Notte" },
  { value: "unica", label: "Tutto il giorno" },
];

const TIPI_CON_FASCIA = ["campo", "lezione_privata"];

const tipoLabel = (tipo: string) => TIPI.find((t) => t.value === tipo)?.label ?? tipo;

const formatoLabel = (formato: string) => FORMATI.find((f) => f.value === formato)?.label ?? formato;

const fasciaLabel = (fascia: string) => FASCE.find((f) => f.value === fascia)?.label ?? fascia;

const rowLabel = (row: Pick<ListinoPrezzoRow, "tipo_prenotazione" | "formato" | "fascia_oraria">) => {
  const parts = [tipoLabel(row.tipo_prenotazione)];
  if (row.formato) parts.push(formatoLabel(row.formato));
  if (row.fascia_oraria) parts.push(fasciaLabel(row.fascia_oraria));
  return parts.join(" · ");
};

// Stessa palette per tipo prenotazione usata in dashboard/admin/bookings.
const tipoColor = (tipo: string) => (tipo === "lezione_privata" ? "#023047" : "var(--secondary)");

const todayISODate = () => new Date().toISOString().slice(0, 10);

const dateOnlyToISO = (dateStr: string) => new Date(`${dateStr}T00:00:00`).toISOString();

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });

function rowKey(tipo: string, durata: number, formato: string | null, fasciaOraria: string | null) {
  return `${tipo}::${durata}::${formato ?? ""}::${fasciaOraria ?? ""}`;
}

export default function PriceListPanel({ onSaved, showNewForm, onCloseNewForm }: PriceListPanelProps) {
  const [rows, setRows] = useState<ListinoPrezzoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editPrezzo, setEditPrezzo] = useState("");
  const [editValidoDal, setEditValidoDal] = useState(todayISODate());
  const [editValidoAl, setEditValidoAl] = useState("");
  const [saving, setSaving] = useState(false);

  const [newTipo, setNewTipo] = useState("campo");
  const [newFormato, setNewFormato] = useState("singolo");
  const [newFasciaOraria, setNewFasciaOraria] = useState("giorno");
  const [newDurata, setNewDurata] = useState("60");
  const [newPrezzo, setNewPrezzo] = useState("");
  const [newValidoDal, setNewValidoDal] = useState(todayISODate());
  const [newValidoAl, setNewValidoAl] = useState("");

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [storico, setStorico] = useState<Record<string, ListinoPrezzoRow[]>>({});
  const [loadingStorico, setLoadingStorico] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

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
    formato?: string | null;
    fascia_oraria?: string | null;
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
        formato: row.formato,
        fascia_oraria: row.fascia_oraria,
        durata_minuti: row.durata_minuti,
        prezzo: editParsed,
        valido_dal: dateOnlyToISO(editValidoDal),
        valido_al: editValidoAl ? dateOnlyToISO(editValidoAl) : null,
      });
      toast.success(`Nuovo prezzo per ${rowLabel(row)} (${row.durata_minuti} min) impostato`);
      setExpandedKey(null);
      setStorico((prev) => {
        const rest = { ...prev };
        delete rest[rowKey(row.tipo_prenotazione, row.durata_minuti, row.formato, row.fascia_oraria)];
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
  const newFormatoEffective = TIPI_CON_FORMATO.includes(newTipo) ? newFormato : null;
  const newFasciaOrariaEffective = TIPI_CON_FASCIA.includes(newTipo) ? newFasciaOraria : null;
  const isNewDurataTaken = rows.some(
    (r) =>
      r.tipo_prenotazione === newTipo &&
      r.durata_minuti === newParsedDurata &&
      r.formato === newFormatoEffective &&
      r.fascia_oraria === newFasciaOrariaEffective,
  );
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
        formato: newFormatoEffective,
        fascia_oraria: newFasciaOrariaEffective,
        durata_minuti: newParsedDurata,
        prezzo: newParsedPrezzo,
        valido_dal: dateOnlyToISO(newValidoDal),
        valido_al: newValidoAl ? dateOnlyToISO(newValidoAl) : null,
      });
      toast.success(
        `Prezzo per ${rowLabel({ tipo_prenotazione: newTipo, formato: newFormatoEffective, fascia_oraria: newFasciaOrariaEffective })} (${newParsedDurata} min) aggiunto al listino`,
      );
      onCloseNewForm();
      setNewPrezzo("");
      setNewDurata("60");
      setNewFormato(FORMATI_PER_TIPO[newTipo]?.[0].value ?? "singolo");
      setNewFasciaOraria("giorno");
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
    const key = rowKey(row.tipo_prenotazione, row.durata_minuti, row.formato, row.fascia_oraria);
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
        const formatoQuery = row.formato ? `&formato=${encodeURIComponent(row.formato)}` : "";
        const fasciaQuery = row.fascia_oraria ? `&fascia_oraria=${encodeURIComponent(row.fascia_oraria)}` : "";
        const res = await fetch(
          `/api/contabilita/listino-prezzi?storico=1&tipo=${encodeURIComponent(row.tipo_prenotazione)}&durata=${row.durata_minuti}${formatoQuery}${fasciaQuery}`,
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

  async function deleteRow(row: ListinoPrezzoRow) {
    const key = rowKey(row.tipo_prenotazione, row.durata_minuti, row.formato, row.fascia_oraria);
    if (
      !window.confirm(
        `Eliminare il prezzo ${rowLabel(row)} (${row.durata_minuti} min, ${formatCurrency(row.prezzo)})? L'operazione non è reversibile.`,
      )
    ) {
      return;
    }
    setDeletingKey(key);
    try {
      const res = await fetch(`/api/contabilita/listino-prezzi?id=${encodeURIComponent(row.id)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Errore durante l'eliminazione del prezzo");
      }
      toast.success(`Prezzo ${rowLabel(row)} (${row.durata_minuti} min) eliminato`);
      if (expandedKey === key) setExpandedKey(null);
      setStorico((prev) => {
        const rest = { ...prev };
        delete rest[key];
        return rest;
      });
      await loadPrices();
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'eliminazione del prezzo");
    } finally {
      setDeletingKey(null);
    }
  }

  // Include anche eventuali tipi legacy presenti nel listino ma non più selezionabili
  // (es. "lezione", "lezione_gruppo"), per non nascondere prezzi già impostati.
  const tipiConDati = [
    ...TIPI,
    ...Array.from(new Set(rows.map((r) => r.tipo_prenotazione)))
      .filter((v) => !TIPI.some((t) => t.value === v))
      .map((v) => ({ value: v, label: tipoLabel(v) })),
  ];
  const groups = tipiConDati
    .map((t) => ({
      tipo: t,
      items: rows.filter((r) => r.tipo_prenotazione === t.value),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {showNewForm && (
        <div className="bg-white rounded-lg border border-black/10 px-4 py-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-secondary/60 mb-1">Tipo</label>
            <select
              value={newTipo}
              onChange={(e) => {
                const tipo = e.target.value;
                setNewTipo(tipo);
                const formati = FORMATI_PER_TIPO[tipo];
                if (formati) setNewFormato(formati[0].value);
              }}
              className="h-10 rounded-lg border border-black/10 bg-white px-3 text-secondary focus:outline-none focus:ring-0 focus:border-secondary"
            >
              {TIPI.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {TIPI_CON_FORMATO.includes(newTipo) && (
            <div>
              <label className="block text-xs font-semibold text-secondary/60 mb-1">Formato</label>
              <select
                value={newFormato}
                onChange={(e) => setNewFormato(e.target.value)}
                className="h-10 rounded-lg border border-black/10 bg-white px-3 text-secondary focus:outline-none focus:ring-0 focus:border-secondary"
              >
                {FORMATI_PER_TIPO[newTipo].map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {TIPI_CON_FASCIA.includes(newTipo) && (
            <div>
              <label className="block text-xs font-semibold text-secondary/60 mb-1">Fascia oraria</label>
              <select
                value={newFasciaOraria}
                onChange={(e) => setNewFasciaOraria(e.target.value)}
                className="h-10 rounded-lg border border-black/10 bg-white px-3 text-secondary focus:outline-none focus:ring-0 focus:border-secondary"
              >
                {FASCE.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              Esiste già un prezzo attivo per{" "}
              {rowLabel({ tipo_prenotazione: newTipo, formato: newFormatoEffective, fascia_oraria: newFasciaOrariaEffective })}{" "}
              a {newDurata} min: apri quella riga per modificarlo.
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
                const key = rowKey(row.tipo_prenotazione, row.durata_minuti, row.formato, row.fascia_oraria);
                const isExpanded = expandedKey === key;
                return (
                  <div
                    key={key}
                    className="rounded-lg overflow-visible transition-opacity"
                    style={{ background: tipoColor(row.tipo_prenotazione) }}
                  >
                    <div className="w-full flex items-center gap-1 py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(row)}
                        className="flex-1 min-w-0 flex items-center gap-4 text-left hover:opacity-95 transition-opacity"
                      >
                        <div className="flex flex-col items-center justify-center bg-white/10 rounded-lg w-11 py-1.5 flex-shrink-0">
                          <span className="text-[10px] uppercase font-bold text-white/70 leading-none">min</span>
                          <span className="text-lg font-bold text-white leading-none mt-0.5 tabular-nums">
                            {row.durata_minuti}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{rowLabel(row)}</p>
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
                      <button
                        type="button"
                        onClick={() => deleteRow(row)}
                        disabled={deletingKey === key}
                        title="Elimina prezzo"
                        className="flex-shrink-0 p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
                      >
                        {deletingKey === key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </div>

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
