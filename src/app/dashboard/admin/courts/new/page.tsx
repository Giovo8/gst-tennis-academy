'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useCourts } from '@/lib/hooks/useCourts';
import { checkCourtBlockConflicts } from '@/lib/courts/blockConflicts';
import {
  applyPickedDate,
  buildBlockReason,
  buildCourtBlocks,
  type CourtBlockInsert,
} from '@/lib/courts/blocks';
import { useDragScroll } from '@/components/admin/hooks/useDragScroll';
import {
  BlockCard,
  BlockCourtField,
  BlockDateField,
  BlockNameField,
  BlockNotesCard,
  BlockTypeField,
  BlockWeekDaysField,
} from '@/components/courts/BlockFormFields';
import { toast } from 'sonner';
import { toastError } from '@/lib/toast';

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

/** Orario di inizio e fine coperto dagli slot da 30 minuti selezionati. */
const getPeriodTimeRange = (slots: string[]) => {
  const sorted = [...slots].sort((a, b) => toMinutes(a) - toMinutes(b));
  const startTime = sorted[0] || '';
  const endTime = sorted.length > 0 ? addMinutesToTime(sorted[sorted.length - 1], 30) : '';
  return { startTime, endTime };
};

export default function NewCourtBlockPage() {
  const courts = useCourts();
  const router = useRouter();

  const [blockName, setBlockName] = useState('');
  const [blockType, setBlockType] = useState('');
  const [customBlockType, setCustomBlockType] = useState('');
  const [periods, setPeriods] = useState<CourtBlockPeriod[]>([createEmptyPeriod()]);
  const [notes, setNotes] = useState('');

  const { scrollRef, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } =
    useDragScroll();

  const [submitting, setSubmitting] = useState(false);

  // Calendario aperto: periodo e campo data a cui appartiene.
  const [activeDateContext, setActiveDateContext] = useState<{
    pidx: number;
    field: 'start' | 'end';
  } | null>(null);

  const updatePeriod = (pidx: number, update: (period: CourtBlockPeriod) => CourtBlockPeriod) => {
    setPeriods((prev) => prev.map((p, i) => (i === pidx ? update(p) : p)));
  };

  const isDatePanelOpen = (pidx: number, field: 'start' | 'end') =>
    activeDateContext?.pidx === pidx && activeDateContext?.field === field;

  const toggleDatePanel = (pidx: number, field: 'start' | 'end') => {
    setActiveDateContext(isDatePanelOpen(pidx, field) ? null : { pidx, field });
  };

  const selectCalendarDay = (pidx: number, field: 'start' | 'end', day: Date) => {
    updatePeriod(pidx, (p) => applyPickedDate(p, field, day));
    setActiveDateContext(null);
  };

  const toggleWeekDay = (pidx: number, day: number) => {
    updatePeriod(pidx, (p) => ({
      ...p,
      weekDays: p.weekDays.includes(day)
        ? p.weekDays.filter((d) => d !== day)
        : [...p.weekDays, day],
    }));
  };

  const toggleSlotSelection = (pidx: number, time: string) => {
    updatePeriod(pidx, (p) => {
      const slots = p.slots;

      if (slots.includes(time)) {
        return { ...p, slots: slots.filter((t) => t !== time) };
      }

      if (slots.length === 0) {
        return { ...p, slots: [time] };
      }

      const allSlots = [...slots, time].sort((a, b) => toMinutes(a) - toMinutes(b));

      // Gli slot devono essere contigui: altrimenti si riparte da quello cliccato.
      for (let idx = 1; idx < allSlots.length; idx++) {
        if (toMinutes(allSlots[idx]) - toMinutes(allSlots[idx - 1]) !== 30) {
          return { ...p, slots: [time] };
        }
      }

      return { ...p, slots: allSlots };
    });
  };

  const addPeriod = () => {
    setPeriods((prev) => [...prev, createEmptyPeriod()]);
  };

  const removePeriod = (idx: number) => {
    setActiveDateContext(null);
    setPeriods((prev) => prev.filter((_, i) => i !== idx));
  };

  async function handleCreateBlock() {
    if (!blockType) {
      toast.warning('Seleziona il tipo di blocco');
      return;
    }

    if (blockType === 'altro' && !customBlockType.trim()) {
      toast.warning('Specifica il tipo di blocco');
      return;
    }

    for (const period of periods) {
      if (!period.court) {
        toast.warning('Seleziona il campo');
        return;
      }
      if (!period.startDate || !period.endDate) {
        toast.warning('Seleziona le date');
        return;
      }
      if (period.weekDays.length === 0) {
        toast.warning('Seleziona i giorni');
        return;
      }
      if (period.slots.length === 0) {
        toast.warning("Seleziona l'orario");
        return;
      }
    }

    try {
      setSubmitting(true);

      const reason = buildBlockReason({ blockType, customBlockType, notes, blockName });
      const blocksToInsert: CourtBlockInsert[] = periods.flatMap((period) =>
        buildCourtBlocks({
          court: period.court,
          startDate: period.startDate,
          endDate: period.endDate,
          weekDays: period.weekDays,
          ...getPeriodTimeRange(period.slots),
          reason,
        }),
      );

      if (blocksToInsert.length === 0) {
        toast.warning('Nessun giorno selezionato');
        return;
      }

      const conflictResult = await checkCourtBlockConflicts(supabase, blocksToInsert);
      if (conflictResult.hasConflict) {
        toast.error('Periodo già occupato');
        return;
      }

      const { error: insertError } = await supabase.from('court_blocks').insert(blocksToInsert);

      if (insertError) throw insertError;

      const daysCount = blocksToInsert.length;
      toast.success(daysCount > 1 ? `${daysCount} blocchi creati` : 'Blocco creato');
      router.push('/dashboard/admin/courts');
    } catch (err) {
      toastError(err, 'Creazione non riuscita');
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

      <BlockCard title="Dettagli blocco">
        <div className="space-y-6">
          <BlockNameField value={blockName} onChange={setBlockName} />
          <BlockTypeField
            blockType={blockType}
            customBlockType={customBlockType}
            onTypeChange={setBlockType}
            onCustomTypeChange={setCustomBlockType}
          />
        </div>
      </BlockCard>

      {periods.map((period, pidx) => (
        <BlockCard
          key={pidx}
          title={periods.length > 1 ? `Periodo ${pidx + 1}` : 'Periodo'}
          action={
            periods.length > 1 && (
              <button
                type="button"
                onClick={() => removePeriod(pidx)}
                className="p-1 text-gray-400 hover:text-secondary transition-colors"
                aria-label="Rimuovi periodo"
              >
                <X className="h-4 w-4" />
              </button>
            )
          }
        >
          <div className="space-y-6">
            <BlockDateField
              label="Data inizio"
              value={period.startDate}
              open={isDatePanelOpen(pidx, 'start')}
              onToggle={() => toggleDatePanel(pidx, 'start')}
              onSelect={(day) => selectCalendarDay(pidx, 'start', day)}
            />
            <BlockDateField
              label="Data fine"
              value={period.endDate}
              fallbackValue={period.startDate}
              open={isDatePanelOpen(pidx, 'end')}
              onToggle={() => toggleDatePanel(pidx, 'end')}
              onSelect={(day) => selectCalendarDay(pidx, 'end', day)}
            />
            <BlockWeekDaysField
              value={period.weekDays}
              onToggle={(day) => toggleWeekDay(pidx, day)}
            />
            <BlockCourtField
              courts={courts}
              value={period.court}
              onChange={(court) => updatePeriod(pidx, (p) => ({ ...p, court }))}
            />

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
        </BlockCard>
      ))}

      <button
        type="button"
        onClick={addPeriod}
        className="w-full flex items-center justify-center px-6 py-3 text-white bg-[#023b52] rounded-lg hover:bg-[#023b52]/90 transition-all font-medium"
      >
        Aggiungi periodo
      </button>

      <BlockNotesCard value={notes} onChange={setNotes} />

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
