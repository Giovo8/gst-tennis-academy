'use client';

import { useState } from 'react';
import CalendarMonth, { atNoon, firstOfMonth } from '@/components/ui/CalendarMonth';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDateHeader(date: Date, short: boolean): string {
  const formatted = date.toLocaleDateString(
    'it-IT',
    short
      ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
      : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  );
  return capitalizeWords(formatted);
}

type DateNavigatorProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

export default function DateNavigator({ selectedDate, onSelectDate }: DateNavigatorProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => firstOfMonth(selectedDate));

  function changeDate(days: number) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    onSelectDate(atNoon(newDate));
  }

  function toggleDatePicker() {
    setDatePickerOpen((prev) => {
      const next = !prev;
      if (next) setCalendarViewDate(firstOfMonth(selectedDate));
      return next;
    });
  }

  function selectCalendarDay(day: Date) {
    onSelectDate(atNoon(day));
    setDatePickerOpen(false);
  }

  function handleDatePickerToday() {
    onSelectDate(atNoon(new Date()));
    setDatePickerOpen(false);
  }

  return (
    <div className="rounded-lg transition-all overflow-hidden">
      <div
        className="px-4 sm:px-5 py-3 sm:py-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center cursor-pointer bg-secondary hover:opacity-90 transition-all"
        role="button"
        tabIndex={0}
        title="Scegli data"
        aria-expanded={datePickerOpen}
        onClick={toggleDatePicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleDatePicker();
          }
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            changeDate(-1);
          }}
          className="justify-self-start h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-white/10 transition-colors hover:bg-white/20 inline-flex items-center justify-center"
        >
          <ChevronLeft className="h-4 w-4 text-white" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex justify-center">
          <div className="relative inline-flex items-center justify-center gap-1.5 rounded-lg px-1.5 sm:px-2 py-1">
            <span
              className="inline-flex items-center justify-center sm:hidden"
              style={{ gap: '6px' }}
            >
              <span className="font-bold text-white text-xl leading-none text-center whitespace-nowrap">
                {formatDateHeader(selectedDate, true)}
              </span>
            </span>
            <span className="hidden sm:inline-flex sm:items-center sm:gap-2">
              <span className="font-bold text-white text-xl leading-none text-left whitespace-nowrap capitalize">
                {formatDateHeader(selectedDate, false)}
              </span>
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            changeDate(1);
          }}
          className="justify-self-end h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-white/10 transition-colors hover:bg-white/20 inline-flex items-center justify-center"
        >
          <ChevronRight className="h-4 w-4 text-white" strokeWidth={3} />
        </button>
      </div>

      {/* Apertura/chiusura animata in CSS (grid-template-rows 0fr -> 1fr) invece di framer-motion */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-[250ms] ease-in-out ${
          datePickerOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
        aria-hidden={!datePickerOpen}
        inert={!datePickerOpen}
      >
        <div className="overflow-hidden min-h-0">
          <div className="bg-white border border-gray-200 rounded-b-lg px-3 sm:px-4 pb-4 pt-3">
            <CalendarMonth
              month={calendarViewDate}
              onMonthChange={setCalendarViewDate}
              selected={selectedDate}
              onSelect={selectCalendarDay}
            />

            <div className="mt-3">
              <button
                type="button"
                onClick={handleDatePickerToday}
                className="w-full py-2 rounded-lg text-sm font-bold text-white bg-secondary hover:opacity-90 transition-opacity"
              >
                Oggi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
