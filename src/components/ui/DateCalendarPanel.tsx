'use client';

import { useState } from 'react';
import CalendarMonth, { firstOfMonth } from '@/components/ui/CalendarMonth';
import { parseDateInput } from '@/lib/utils/dateInput';

type Props = {
  open: boolean;
  /** Data selezionata, `aaaa-mm-gg` (stringa vuota se nessuna). */
  value: string;
  onSelect: (date: Date) => void;
  /** Data su cui aprire il mese quando `value` è vuoto (altrimenti oggi). */
  fallbackValue?: string;
};

/** Calendario mensile a scomparsa, da mettere sotto il pulsante della data. */
export default function DateCalendarPanel({ open, value, onSelect, fallbackValue = '' }: Props) {
  const [month, setMonth] = useState<Date>(() => firstOfMonth(new Date()));

  // A ogni apertura il calendario riparte dal mese della data selezionata
  // (stato aggiornato durante il render, senza effetto).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMonth(firstOfMonth(parseDateInput(value) || parseDateInput(fallbackValue) || new Date()));
    }
  }

  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="overflow-hidden min-h-0">
        <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
          <CalendarMonth
            month={month}
            onMonthChange={setMonth}
            selected={parseDateInput(value)}
            onSelect={onSelect}
          />
        </div>
      </div>
    </div>
  );
}
