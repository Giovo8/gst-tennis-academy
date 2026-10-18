'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { checkCourtBlockConflicts, formatBlockConflictMessage } from '@/lib/courts/blockConflicts';
import { useDragScroll } from '@/components/admin/hooks/useDragScroll';

const COURTS = ['Campo 1', 'Campo 2', 'Campo 3', 'Campo 4'];

const BLOCK_TYPES = [
  { value: 'corsi_tennis', label: 'Corsi Tennis' },
  { value: 'corso_adulti', label: 'Corso Adulti' },
  { value: 'manutenzione', label: 'Manutenzione' },
  { value: 'evento', label: 'Evento' },
  { value: 'altro', label: 'Altro' },
];

const WEEK_DAYS = [
  { value: 1, label: 'Lun', fullLabel: 'Lunedì' },
  { value: 2, label: 'Mar', fullLabel: 'Martedì' },
  { value: 3, label: 'Mer', fullLabel: 'Mercoledì' },
  { value: 4, label: 'Gio', fullLabel: 'Giovedì' },
  { value: 5, label: 'Ven', fullLabel: 'Venerdì' },
  { value: 6, label: 'Sab', fullLabel: 'Sabato' },
  { value: 0, label: 'Dom', fullLabel: 'Domenica' },
];

const CALENDAR_WEEK_DAYS = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

type CourtBlockPeriod = {
  court: string;
  startDate: string;
  endDate: string;
  weekDays: number[];
  slots: string[];
};

const createEmptyPeriod = (): CourtBlockPeriod => ({
  court: '',
  startDate: '',
  endDate: '',
  weekDays: [],
  slots: [],
});

export default function NewCourtBlockPage() {
  const router = useRouter();

  const [blockName, setBlockName] = useState('');
  const [blockType, setBlockType] = useState('');
  const [customBlockType, setCustomBlockType] = useState('');
  const [periods, setPeriods] = useState<CourtBlockPeriod[]>([createEmptyPeriod()]);
  const [notes, setNotes] = useState('');

  const { scrollRef, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } =
    useDragScroll();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeDateContext, setActiveDateContext] = useState<{
    pidx: number;
    field: 'start' | 'end';
  } | null>(null);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const parseDateInput = (value: string): Date | null => {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };

  const toInputDateValue = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDateButtonLabel = (value: string): string => {
    const date = parseDateInput(value);
    if (!date) return 'gg/mm/aaaa';
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isSameCalendarDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

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

  const getCalendarMonthLabel = (date: Date) => {
    const label = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const changeCalendarMonth = (offset: number) => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const toggleDatePickerPanel = (pidx: number, field: 'start' | 'end') => {
    if (activeDateContext?.pidx === pidx && activeDateContext?.field === field) {
      setActiveDateContext(null);
      return;
    }
    const period = periods[pidx];
    const currentValue = field === 'start' ? period.startDate : period.endDate;
    const parsed = parseDateInput(currentValue) || parseDateInput(period.startDate) || new Date();
    setActiveDateContext({ pidx, field });
    setCalendarViewDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  };

  const selectCalendarDay = (day: Date) => {
    if (!activeDateContext) return;
    const { pidx, field } = activeDateContext;
    const selected = toInputDateValue(day);
    const dayOfWeek = day.getDay();

    setPeriods((prev) =>
      prev.map((p, i) => {
        if (i !== pidx) return p;
        const weekDays = p.weekDays.includes(dayOfWeek) ? p.weekDays : [...p.weekDays, dayOfWeek];
        if (field === 'start') {
          const endDate = p.endDate && p.endDate < selected ? selected : p.endDate;
          return { ...p, startDate: selected, endDate, weekDays };
        }
        const endDate = p.startDate && selected < p.startDate ? p.startDate : selected;
        return { ...p, endDate, weekDays };
      }),
    );

    setActiveDateContext(null);
  };

  const renderDateCalendarPanel = (pidx: number, field: 'start' | 'end') => {
    const isOpen = activeDateContext?.pidx === pidx && activeDateContext?.field === field;
    const period = periods[pidx];
    const selectedValue = field === 'start' ? period?.startDate : period?.endDate;
    const selectedDate = selectedValue ? parseDateInput(selectedValue) : null;
    return (
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="overflow-hidden min-h-0">
          <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => changeCalendarMonth(-1)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-black/10 text-secondary hover:bg-gray-50 transition-colors"
                aria-label="Mese precedente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-gray-900 capitalize">
                {getCalendarMonthLabel(calendarViewDate)}
              </p>
              <button
                type="button"
                onClick={() => changeCalendarMonth(1)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-black/10 text-secondary hover:bg-gray-50 transition-colors"
                aria-label="Mese successivo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="calendar-grid mt-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase">
              {CALENDAR_WEEK_DAYS.map((day) => (
                <span key={day} className="py-1">
                  {day}
                </span>
              ))}
            </div>
            <div className="calendar-grid grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, isCurrentMonth }) => {
                const isSelected = !!selectedDate && isSameCalendarDay(date, selectedDate);
                const isTodayDate = isSameCalendarDay(date, new Date());
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => selectCalendarDay(date)}
                    className={`calendar-day w-full min-w-0 h-11 sm:h-9 box-border inline-flex items-center justify-center rounded-md text-sm font-bold leading-none transition-colors ${
                      isSelected
                        ? 'bg-secondary text-white'
                        : isCurrentMonth
                        ? 'text-gray-800 border border-gray-200 hover:bg-gray-100'
                        : 'text-gray-400 border border-gray-100 hover:bg-gray-50'
                    } ${!isSelected && isTodayDate ? 'ring-1 ring-secondary/40' : ''}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const toggleWeekDay = (pidx: number, day: number) => {
    setPeriods((prev) =>
      prev.map((p, i) => {
        if (i !== pidx) return p;
        const weekDays = p.weekDays.includes(day)
          ? p.weekDays.filter((d) => d !== day)
          : [...p.weekDays, day];
        return { ...p, weekDays };
      }),
    );
  };

  const setPeriodCourt = (pidx: number, court: string) => {
    setPeriods((prev) => prev.map((p, i) => (i !== pidx ? p : { ...p, court })));
  };

  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const addMinutesToTime = (time: string, minutesToAdd: number) => {
    const total = toMinutes(time) + minutesToAdd;
    const hours = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (total % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getPeriodTimeRange = (slots: string[]) => {
    const sorted = [...slots].sort((a, b) => toMinutes(a) - toMinutes(b));
    const startTime = sorted[0] || '';
    const endTime = sorted.length > 0 ? addMinutesToTime(sorted[sorted.length - 1], 30) : '';
    return { startTime, endTime };
  };

  const toggleSlotSelection = (pidx: number, time: string) => {
    setPeriods((prev) =>
      prev.map((p, i) => {
        if (i !== pidx) return p;
        const slots = p.slots;

        if (slots.includes(time)) {
          return { ...p, slots: slots.filter((t) => t !== time) };
        }

        if (slots.length === 0) {
          return { ...p, slots: [time] };
        }

        const allSlots = [...slots, time].sort((a, b) => toMinutes(a) - toMinutes(b));

        for (let idx = 1; idx < allSlots.length; idx++) {
          if (toMinutes(allSlots[idx]) - toMinutes(allSlots[idx - 1]) !== 30) {
            return { ...p, slots: [time] };
          }
        }

        return { ...p, slots: allSlots };
      }),
    );
  };

  const addPeriod = () => {
    setPeriods((prev) => [...prev, createEmptyPeriod()]);
  };

  const removePeriod = (idx: number) => {
    setPeriods((prev) => prev.filter((_, i) => i !== idx));
  };

  const getBlockReason = () => {
    const selectedType = BLOCK_TYPES.find((t) => t.value === blockType);
    let typeLabel = selectedType?.label || blockType;

    if (blockType === 'altro' && customBlockType.trim()) {
      typeLabel = `Altro (${customBlockType.trim()})`;
    }

    const base = notes ? `${typeLabel} - ${notes}` : typeLabel;
    return blockName.trim() ? `${blockName.trim()} - ${base}` : base;
  };

  async function handleCreateBlock() {
    if (!blockType) {
      setError('Seleziona un tipo di blocco');
      return;
    }

    if (blockType === 'altro' && !customBlockType.trim()) {
      setError("Specifica in cosa consiste il blocco 'Altro'");
      return;
    }

    for (const period of periods) {
      if (!period.court) {
        setError('Seleziona un campo per ogni periodo');
        return;
      }
      if (!period.startDate || !period.endDate) {
        setError('Seleziona data inizio e data fine per ogni periodo');
        return;
      }
      if (period.weekDays.length === 0) {
        setError('Seleziona almeno un giorno della settimana per ogni periodo');
        return;
      }
      if (period.slots.length === 0) {
        setError("Seleziona l'orario per ogni periodo");
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');

      const reasonText = getBlockReason();
      const blocksToInsert: Array<{
        court_id: string;
        start_time: string;
        end_time: string;
        reason: string;
      }> = [];

      for (const period of periods) {
        const start = parseDateInput(period.startDate);
        const end = parseDateInput(period.endDate);

        if (!start || !end) {
          throw new Error('Formato data non valido');
        }

        if (end < start) {
          throw new Error('La data fine deve essere successiva alla data inizio');
        }

        const { startTime, endTime } = getPeriodTimeRange(period.slots);
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        const currentDate = new Date(start);
        while (currentDate <= end) {
          const dayOfWeek = currentDate.getDay();

          if (period.weekDays.includes(dayOfWeek)) {
            const dayStart = new Date(currentDate);
            dayStart.setHours(startHour, startMinute, 0, 0);

            const dayEnd = new Date(currentDate);
            dayEnd.setHours(endHour, endMinute, 0, 0);

            blocksToInsert.push({
              court_id: period.court,
              start_time: dayStart.toISOString(),
              end_time: dayEnd.toISOString(),
              reason: reasonText,
            });
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      if (blocksToInsert.length === 0) {
        setError('Nessun blocco da creare: verifica periodo e giorni selezionati');
        setSubmitting(false);
        return;
      }

      const conflictResult = await checkCourtBlockConflicts(supabase, blocksToInsert);
      if (conflictResult.hasConflict) {
        setError(formatBlockConflictMessage(conflictResult));
        setSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase.from('court_blocks').insert(blocksToInsert);

      if (insertError) throw insertError;

      const daysCount = blocksToInsert.length;
      setSuccess(`${daysCount} blocco${daysCount > 1 ? 'i creati' : ' creato'} con successo!`);

      setTimeout(() => {
        router.push('/dashboard/admin/courts');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Errore nella creazione del blocco');
    } finally {
      setSubmitting(false);
    }
  }

  const periodsValid = periods.every(
    (p) => p.court && p.startDate && p.endDate && p.weekDays.length > 0 && p.slots.length > 0,
  );

  return (
    <div className="space-y-6 pt-3">
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link
            href="/dashboard/admin/courts"
            className="hover:text-secondary/80 transition-colors"
          >
            Blocco Campi
          </Link>
          {' › '}
          <span>Crea Blocco</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Crea Blocco</h1>
      </div>

      {error && (
        <div className="mt-2">
          <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-2">
          <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-green-800">{success}</p>
          </div>
        </div>
      )}

      <div className="page-card">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli blocco</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Nome Blocco
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={blockName}
                onChange={(e) => setBlockName(e.target.value)}
                placeholder="Es. Manutenzione rete campo 2"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 mt-6">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Tipo blocco
            </label>
            <div className="flex-1">
              <div className="flex flex-col sm:grid sm:grid-cols-5 gap-2">
                {BLOCK_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setBlockType(type.value)}
                    className={`w-full px-5 py-2 text-sm text-center font-medium rounded-lg border transition-all ${
                      blockType === type.value
                        ? 'bg-secondary text-white border-secondary'
                        : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              {blockType === 'altro' && (
                <div className="mt-4">
                  <label className="block text-xs text-secondary/60 mb-2">
                    Specifica in cosa consiste
                  </label>
                  <input
                    type="text"
                    value={customBlockType}
                    onChange={(e) => setCustomBlockType(e.target.value)}
                    placeholder="Es. intervento tecnico esterno"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-0 focus:border-black/10"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {periods.map((period, pidx) => (
        <div key={pidx} className="page-card">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">
              {periods.length > 1 ? `Periodo ${pidx + 1}` : 'Periodo'}
            </h2>
            {periods.length > 1 && (
              <button
                type="button"
                onClick={() => removePeriod(pidx)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Rimuovi periodo"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                  Data inizio
                </label>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleDatePickerPanel(pidx, 'start')}
                      className="flex-1 min-w-0 text-left rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-0 focus:border-black/10"
                    >
                      {formatDateButtonLabel(period.startDate)}
                    </button>
                    <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-white">
                      <CalendarIcon className="h-4 w-4" />
                    </span>
                  </div>
                  {renderDateCalendarPanel(pidx, 'start')}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                  Data fine
                </label>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleDatePickerPanel(pidx, 'end')}
                      className="flex-1 min-w-0 text-left rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-0 focus:border-black/10"
                    >
                      {formatDateButtonLabel(period.endDate)}
                    </button>
                    <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-white">
                      <CalendarIcon className="h-4 w-4" />
                    </span>
                  </div>
                  {renderDateCalendarPanel(pidx, 'end')}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                  Giorni settimana
                </label>
                <div className="flex-1">
                  <div className="flex flex-col sm:grid sm:grid-cols-7 gap-2">
                    {WEEK_DAYS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleWeekDay(pidx, day.value)}
                        className={`w-full px-4 py-2 text-sm text-center font-medium rounded-lg border transition-all ${
                          period.weekDays.includes(day.value)
                            ? 'bg-secondary text-white border-secondary'
                            : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                        }`}
                      >
                        <span className="sm:hidden">{day.fullLabel}</span>
                        <span className="hidden sm:inline">{day.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                  Campo
                </label>
                <div className="flex-1">
                  <div className="flex flex-col sm:grid sm:grid-cols-4 gap-2">
                    {COURTS.map((court) => (
                      <button
                        key={court}
                        type="button"
                        onClick={() => setPeriodCourt(pidx, court)}
                        className={`w-full px-5 py-2 text-sm text-center font-medium rounded-lg border transition-all ${
                          period.court === court
                            ? 'bg-secondary text-white border-secondary'
                            : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                        }`}
                      >
                        {court}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm text-secondary font-medium">Fascia oraria</label>
                <div
                  ref={scrollRef}
                  className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
                  style={{ overflowX: 'scroll', WebkitOverflowScrolling: 'touch' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="min-w-[1280px]">
                    <div className="grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-secondary rounded-lg mb-3">
                      {Array.from({ length: 16 }, (_, i) => (
                        <div
                          key={i}
                          className="p-3 text-center font-bold text-white text-xs flex items-center justify-center"
                        >
                          {String(7 + i).padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>
                    <div
                      className="grid grid-cols-[repeat(16,_minmax(80px,_1fr))] bg-white rounded-lg"
                      style={{ minHeight: '70px' }}
                    >
                      {Array.from({ length: 16 }, (_, hi) => {
                        const hour = 7 + hi;
                        const t1 = `${String(hour).padStart(2, '0')}:00`;
                        const t2 = hour < 22 ? `${String(hour).padStart(2, '0')}:30` : null;
                        return (
                          <div
                            key={hi}
                            className="border-r border-gray-200 last:border-r-0 relative flex"
                          >
                            <div
                              className={`flex-1 transition-colors cursor-pointer ${
                                period.slots.includes(t1)
                                  ? 'bg-secondary'
                                  : 'bg-white hover:bg-secondary/10'
                              }`}
                              onClick={() => toggleSlotSelection(pidx, t1)}
                              title={t1}
                            >
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-4 bg-gray-300 pointer-events-none" />
                            </div>
                            {t2 && (
                              <div
                                className={`flex-1 transition-colors cursor-pointer ${
                                  period.slots.includes(t2)
                                    ? 'bg-secondary'
                                    : 'bg-white hover:bg-secondary/10'
                                }`}
                                onClick={() => toggleSlotSelection(pidx, t2)}
                                title={t2}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addPeriod}
        className="w-full flex items-center justify-center px-6 py-3 text-white bg-[#023b52] rounded-lg hover:bg-[#023b52]/90 transition-all font-medium"
      >
        Aggiungi periodo
      </button>

      <div className="page-card">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Note</h2>
        </div>
        <div className="p-6">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Aggiungi dettagli aggiuntivi..."
            rows={4}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary resize-none focus:outline-none focus:ring-0 focus:border-black/10"
          />
        </div>
      </div>

      <button
        onClick={handleCreateBlock}
        disabled={
          submitting ||
          !blockType ||
          !periodsValid ||
          (blockType === 'altro' && !customBlockType.trim())
        }
        className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Creazione...</span>
          </>
        ) : (
          <span>Crea Blocco</span>
        )}
      </button>
    </div>
  );
}
