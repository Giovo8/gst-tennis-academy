"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEK_DAYS_SHORT = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const WEEK_DAYS_FULL = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(12, 0, 0, 0);
  return normalized;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function capitalizeWords(text: string): string {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateHeader(date: Date, short: boolean): string {
  const formatted = date.toLocaleDateString("it-IT", short
    ? { weekday: "short", day: "numeric", month: "short", year: "numeric" }
    : { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return capitalizeWords(formatted);
}

function getCalendarMonthLabel(date: Date): string {
  const label = date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type DateNavigatorProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

export default function DateNavigator({ selectedDate, onSelectDate }: DateNavigatorProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const normalized = normalizeDate(selectedDate);
    return new Date(normalized.getFullYear(), normalized.getMonth(), 1);
  });

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
    const mondayBasedDayIndex = (firstOfMonth.getDay() + 6) % 7;
    const gridStartDate = new Date(firstOfMonth);
    gridStartDate.setDate(firstOfMonth.getDate() - mondayBasedDayIndex);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStartDate);
      date.setDate(gridStartDate.getDate() + index);
      return {
        date,
        isCurrentMonth: date.getMonth() === calendarViewDate.getMonth(),
      };
    });
  }, [calendarViewDate]);

  function changeDate(days: number) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    onSelectDate(normalizeDate(newDate));
  }

  function toggleDatePicker() {
    setDatePickerOpen((prev) => {
      const next = !prev;
      if (next) {
        const normalizedSelected = normalizeDate(selectedDate);
        setCalendarViewDate(new Date(normalizedSelected.getFullYear(), normalizedSelected.getMonth(), 1));
      }
      return next;
    });
  }

  function changeCalendarMonth(delta: number) {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function selectCalendarDay(day: Date) {
    onSelectDate(normalizeDate(day));
    setDatePickerOpen(false);
  }

  function handleDatePickerToday() {
    onSelectDate(normalizeDate(new Date()));
    setDatePickerOpen(false);
  }

  return (
    <div className="rounded-lg transition-all bg-secondary">
      <div
        className="p-3 sm:p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center cursor-pointer"
        role="button"
        tabIndex={0}
        title="Scegli data"
        aria-expanded={datePickerOpen}
        onClick={toggleDatePicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleDatePicker();
          }
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); changeDate(-1); }}
          className="justify-self-start h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-white/10 transition-colors hover:bg-white/20 inline-flex items-center justify-center"
        >
          <ChevronLeft className="h-4 w-4 text-white" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex justify-center">
          <div className="relative inline-flex items-center justify-center gap-1.5 rounded-lg px-1.5 sm:px-2 py-1">
            <span className="inline-flex items-center justify-center sm:hidden" style={{ gap: "6px" }}>
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
          onClick={(e) => { e.stopPropagation(); changeDate(1); }}
          className="justify-self-end h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-white/10 transition-colors hover:bg-white/20 inline-flex items-center justify-center"
        >
          <ChevronRight className="h-4 w-4 text-white" strokeWidth={3} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {datePickerOpen && (
          <motion.div
            key="date-picker-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-gray-200 rounded-b-lg px-3 sm:px-4 pb-4 pt-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(-1)}
                  className="appearance-none h-8 w-8 box-border inline-flex items-center justify-center rounded-md border border-gray-200 text-secondary hover:bg-gray-100 transition-colors"
                  aria-label="Mese precedente"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={3} />
                </button>
                <div className="flex-1 mx-2 inline-flex items-center justify-center text-sm font-bold text-gray-900 capitalize">
                  {getCalendarMonthLabel(calendarViewDate)}
                </div>
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(1)}
                  className="appearance-none h-8 w-8 box-border inline-flex items-center justify-center rounded-md border border-gray-200 text-secondary hover:bg-gray-100 transition-colors"
                  aria-label="Mese successivo"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 text-xs font-bold text-gray-500 uppercase">
                {WEEK_DAYS_SHORT.map((day, index) => (
                  <div key={day} className="w-full box-border flex items-center justify-center py-1 border border-transparent">
                    <span className="sm:hidden truncate">{day}</span>
                    <span className="hidden sm:inline truncate">{WEEK_DAYS_FULL[index]}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ date, isCurrentMonth }) => {
                  const isSelected = isSameCalendarDay(date, selectedDate);
                  const isTodayDate = isSameCalendarDay(date, new Date());

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => selectCalendarDay(date)}
                      className={`h-9 rounded-md text-sm font-bold transition-colors ${
                        isSelected
                          ? "bg-secondary text-white"
                          : isCurrentMonth
                          ? "text-gray-800 border border-gray-200 hover:bg-gray-100"
                          : "text-gray-400 border border-gray-100 hover:bg-gray-50"
                      } ${!isSelected && isTodayDate ? "ring-1 ring-secondary/40" : ""}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
