'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AVVISO_TIPO_UI, oggiRoma, type AvvisoTipo } from '@/lib/avvisi/tipi';

export interface AvvisoFormValues {
  tipo: AvvisoTipo;
  testo: string;
  messaggio: string;
  visibile_fino: string;
  link: string;
}

export const EMPTY_AVVISO: AvvisoFormValues = {
  tipo: 'generale',
  testo: '',
  messaggio: '',
  visibile_fino: '',
  link: '',
};

const MAX_TESTO = 120;
const MAX_MESSAGGIO = 1000;
const TIPI = Object.keys(AVVISO_TIPO_UI) as AvvisoTipo[];

const cardClassName = 'bg-white border border-black/10 rounded-lg overflow-hidden';
const cardHeaderClassName = 'px-4 sm:px-6 py-4 border-b border-black/10 bg-gray-50';
const rowClassName =
  'flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200 last:border-b-0 last:pb-0';
const labelClassName = 'sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0';
const inputClassName =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus-visible:ring-0 focus-visible:border-gray-300';

interface AvvisoFormProps {
  initialValues?: AvvisoFormValues;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: AvvisoFormValues) => Promise<void>;
}

/** Form di creazione/modifica avviso (stile pagina "Nuova prenotazione"). */
export default function AvvisoForm({
  initialValues = EMPTY_AVVISO,
  submitLabel,
  submittingLabel,
  onSubmit,
}: AvvisoFormProps) {
  const [values, setValues] = useState<AvvisoFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof AvvisoFormValues>(key: K, value: AvvisoFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit() {
    if (!values.testo.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  const oggi = oggiRoma();

  return (
    <div className="space-y-6">
      <div className={cardClassName}>
        <div className={cardHeaderClassName}>
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli avviso</h2>
        </div>
        <div className="space-y-6 p-4 sm:p-6">
          <div className={rowClassName}>
            <label className={labelClassName}>Tipo avviso</label>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {TIPI.map((t) => {
                const ui = AVVISO_TIPO_UI[t];
                const Icon = ui.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('tipo', t)}
                    className={`w-full px-3 sm:px-5 py-2 text-sm text-center rounded-lg border transition-all inline-flex items-center justify-center gap-2 ${
                      values.tipo === t
                        ? 'bg-[#023047] text-white border-[#023047]'
                        : 'bg-secondary text-white border-secondary hover:opacity-90'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {ui.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={rowClassName}>
            <label htmlFor="avviso-titolo" className={labelClassName}>
              Titolo
            </label>
            <div className="flex-1">
              <input
                id="avviso-titolo"
                type="text"
                placeholder="Es. Campi chiusi lunedì"
                value={values.testo}
                maxLength={MAX_TESTO}
                onChange={(e) => set('testo', e.target.value)}
                className={inputClassName}
              />
              <p className="mt-1 text-right text-xs text-secondary/40">
                {values.testo.length}/{MAX_TESTO}
              </p>
            </div>
          </div>

          <div className={rowClassName}>
            <label htmlFor="avviso-testo" className={labelClassName}>
              Testo <span className="text-secondary/40 font-normal">(facoltativo)</span>
            </label>
            <textarea
              id="avviso-testo"
              placeholder="Dettagli dell'avviso..."
              value={values.messaggio}
              maxLength={MAX_MESSAGGIO}
              rows={4}
              onChange={(e) => set('messaggio', e.target.value)}
              className={`${inputClassName} flex-1 resize-none`}
            />
          </div>
        </div>
      </div>

      <div className={cardClassName}>
        <div className={cardHeaderClassName}>
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Visibilità</h2>
        </div>
        <div className="space-y-6 p-4 sm:p-6">
          <div className={rowClassName}>
            <label htmlFor="avviso-scadenza" className={labelClassName}>
              Visibile fino al
            </label>
            <div className="flex-1">
              <input
                id="avviso-scadenza"
                type="date"
                value={values.visibile_fino}
                min={oggi}
                onChange={(e) => set('visibile_fino', e.target.value)}
                className={inputClassName}
              />
              <p className="mt-1 text-xs text-secondary/50">
                Lascia vuoto per mostrarlo finché non lo disattivi
              </p>
            </div>
          </div>

          <div className={rowClassName}>
            <label htmlFor="avviso-link" className={labelClassName}>
              Link <span className="text-secondary/40 font-normal">(facoltativo)</span>
            </label>
            <div className="flex-1">
              <input
                id="avviso-link"
                type="text"
                placeholder="/dashboard/atleta/tornei"
                value={values.link}
                maxLength={300}
                onChange={(e) => set('link', e.target.value)}
                className={inputClassName}
              />
              <p className="mt-1 text-xs text-secondary/50">
                Pagina del sito aperta cliccando l&apos;avviso in Bacheca
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!values.testo.trim() || submitting}
        className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-3"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{submittingLabel}</span>
          </>
        ) : (
          <span>{submitLabel}</span>
        )}
      </button>
    </div>
  );
}
