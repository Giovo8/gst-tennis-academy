'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEK_DAY_LABELS = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

const NAV_BUTTON_CLASS =
  'h-8 w-8 inline-flex items-center justify-center rounded-lg border border-black/10 text-secondary hover:bg-gray-50 transition-colors';

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function firstOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Stessa data a mezzogiorno: evita slittamenti di giorno con fusi e cambi d'ora. */
export function atNoon(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(12, 0, 0, 0);
  return normalized;
}

type Props = {
  /** Mese mostrato (un giorno qualsiasi del mese). */
  month: Date;
  onMonthChange: (month: Date) => void;
  selected: Date | null;
  /** Riceve il giorno scelto, a mezzogiorno. */
  onSelect: (date: Date) => void;
  /** `bordered`: celle con bordo (pannelli in pagina); `plain`: celle senza bordo (finestre). */
  variant?: 'bordered' | 'plain';
  isDisabled?: (date: Date) => boolean;
};

/** Griglia di un mese con le frecce per cambiarlo. Base di tutti i selettori di data. */
export default function CalendarMonth({
  month,
  onMonthChange,
  selected,
  onSelect,
  variant = 'bordered',
  isDisabled,
}: Props) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const days = useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    const offset = (first.getDay() + 6) % 7; // la settimana parte da lunedì
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(year, monthIndex, 1 - offset + index, 12);
      return { date, isCurrentMonth: date.getMonth() === monthIndex };
    });
  }, [year, monthIndex]);

  const today = new Date();
  const bordered = variant === 'bordered';

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          className={NAV_BUTTON_CLASS}
          aria-label="Mese precedente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-gray-900 capitalize">
          {month.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
          className={NAV_BUTTON_CLASS}
          aria-label="Mese successivo"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="calendar-grid mt-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase">
        {WEEK_DAY_LABELS.map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div className="calendar-grid grid grid-cols-7 gap-1">
        {days.map(({ date, isCurrentMonth }) => {
          const disabled = isDisabled?.(date) ?? false;
          const isSelected = !!selected && isSameDay(date, selected);
          const tone = disabled
            ? 'text-gray-300 cursor-not-allowed'
            : isSelected
            ? 'bg-secondary text-white font-semibold'
            : isCurrentMonth
            ? `text-gray-800 hover:bg-gray-100 ${bordered ? 'border border-gray-200' : ''}`
            : `text-gray-400 hover:bg-gray-50 ${bordered ? 'border border-gray-100' : ''}`;
          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(date)}
              className={`calendar-day w-full min-w-0 h-11 sm:h-9 box-border inline-flex items-center justify-center text-sm leading-none transition-colors ${
                bordered ? 'rounded-md font-bold' : 'rounded-lg'
              } ${tone} ${
                !isSelected && !disabled && isSameDay(date, today) ? 'ring-1 ring-secondary/40' : ''
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
