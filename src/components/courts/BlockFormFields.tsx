'use client';

import type { ReactNode } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import DateCalendarPanel from '@/components/ui/DateCalendarPanel';
import { BLOCK_TYPES, WEEK_DAYS } from '@/lib/courts/blocks';
import { formatDateInputLabel } from '@/lib/utils/dateInput';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-0 focus:border-black/10';

function choiceClass(selected: boolean, padding = 'px-5') {
  return `w-full ${padding} py-2 text-sm text-center font-medium rounded-lg border transition-all ${
    selected
      ? 'bg-secondary text-white border-secondary'
      : 'bg-white text-secondary border-gray-300 hover:border-secondary'
  }`;
}

/** Riga "etichetta a sinistra, campo a destra"; `last` toglie il separatore sotto. */
export function BlockFieldRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 ${
        last ? '' : 'pb-6 border-b border-gray-200'
      }`}
    >
      <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function BlockCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page-card">
      <div className="page-card-header flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-secondary">{title}</h2>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export function BlockNameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <BlockFieldRow label="Nome Blocco">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Es. Manutenzione rete campo 2"
        className={`${INPUT_CLASS} placeholder-secondary/40`}
      />
    </BlockFieldRow>
  );
}

export function BlockTypeField({
  blockType,
  customBlockType,
  onTypeChange,
  onCustomTypeChange,
}: {
  blockType: string;
  customBlockType: string;
  onTypeChange: (value: string) => void;
  onCustomTypeChange: (value: string) => void;
}) {
  return (
    <BlockFieldRow label="Tipo blocco" last>
      <div className="flex flex-col sm:grid sm:grid-cols-5 gap-2">
        {BLOCK_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => onTypeChange(type.value)}
            className={choiceClass(blockType === type.value)}
          >
            {type.label}
          </button>
        ))}
      </div>
      {blockType === 'altro' && (
        <div className="mt-4">
          <label className="block text-xs text-secondary/60 mb-2">Specifica in cosa consiste</label>
          <input
            type="text"
            value={customBlockType}
            onChange={(e) => onCustomTypeChange(e.target.value)}
            placeholder="Es. intervento tecnico esterno"
            className={INPUT_CLASS}
          />
        </div>
      )}
    </BlockFieldRow>
  );
}

export function BlockCourtField({
  courts,
  value,
  onChange,
}: {
  courts: string[];
  value: string;
  onChange: (court: string) => void;
}) {
  return (
    <BlockFieldRow label="Campo">
      <div className="flex flex-col sm:grid sm:grid-cols-4 gap-2">
        {courts.map((court) => (
          <button
            key={court}
            type="button"
            onClick={() => onChange(court)}
            className={choiceClass(value === court)}
          >
            {court}
          </button>
        ))}
      </div>
    </BlockFieldRow>
  );
}

export function BlockWeekDaysField({
  value,
  onToggle,
}: {
  value: number[];
  onToggle: (day: number) => void;
}) {
  return (
    <BlockFieldRow label="Giorni settimana">
      <div className="flex flex-col sm:grid sm:grid-cols-7 gap-2">
        {WEEK_DAYS.map((day) => (
          <button
            key={day.value}
            type="button"
            onClick={() => onToggle(day.value)}
            className={choiceClass(value.includes(day.value), 'px-4')}
          >
            <span className="sm:hidden">{day.fullLabel}</span>
            <span className="hidden sm:inline">{day.label}</span>
          </button>
        ))}
      </div>
    </BlockFieldRow>
  );
}

/** Pulsante con la data e calendario a scomparsa sotto. */
export function BlockDateField({
  label,
  value,
  open,
  onToggle,
  onSelect,
  fallbackValue,
}: {
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (date: Date) => void;
  fallbackValue?: string;
}) {
  return (
    <BlockFieldRow label={label}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={`${INPUT_CLASS} flex-1 min-w-0 text-left`}
        >
          {formatDateInputLabel(value)}
        </button>
        <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-white">
          <CalendarIcon className="h-4 w-4" />
        </span>
      </div>
      <DateCalendarPanel
        open={open}
        value={value}
        onSelect={onSelect}
        fallbackValue={fallbackValue}
      />
    </BlockFieldRow>
  );
}

export function BlockNotesCard({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <BlockCard title="Note">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Aggiungi dettagli aggiuntivi..."
        rows={4}
        className={`${INPUT_CLASS} resize-none`}
      />
    </BlockCard>
  );
}
