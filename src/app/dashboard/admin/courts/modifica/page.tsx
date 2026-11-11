'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCourts } from '@/lib/hooks/useCourts';
import { checkCourtBlockConflicts } from '@/lib/courts/blockConflicts';
import {
  applyPickedDate,
  buildBlockReason,
  buildCourtBlocks,
  parseBlockReason,
} from '@/lib/courts/blocks';
import { getBlockStyle } from '@/lib/courts/blockDisplay';
import { toInputDateValue } from '@/lib/utils/dateInput';
import {
  BlockCard,
  BlockCourtField,
  BlockDateField,
  BlockFieldRow,
  BlockNameField,
  BlockNotesCard,
  BlockTypeField,
  BlockWeekDaysField,
} from '@/components/courts/BlockFormFields';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

type Block = {
  id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  created_at: string;
};

// Slot ogni 30 minuti dalle 07:00 alle 22:00
const TIME_SLOTS: string[] = [];
for (let hour = 7; hour <= 22; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
  if (hour < 22) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:30`);
  }
}

const SELECT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-0 focus:border-black/10';

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

const toTimeValue = (date: Date) =>
  `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

export default function CourtBlockEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const blockId = searchParams.get('id');
  const courts = useCourts();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Dati blocco corrente
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);
  const [selectedCourt, setSelectedCourt] = useState('');
  const [blockName, setBlockName] = useState('');
  const [blockType, setBlockType] = useState('');
  const [customBlockType, setCustomBlockType] = useState('');
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('22:00');
  const [period, setPeriod] = useState<{ startDate: string; endDate: string; weekDays: number[] }>({
    startDate: '',
    endDate: '',
    weekDays: [],
  });
  // Date (aaaa-mm-gg) tolte a mano dall'elenco: non vengono ricreate al salvataggio.
  const [excludedDates, setExcludedDates] = useState<string[]>([]);

  const [activeDateField, setActiveDateField] = useState<'start' | 'end' | null>(null);

  const toggleDatePanel = (field: 'start' | 'end') => {
    setActiveDateField((prev) => (prev === field ? null : field));
  };

  const selectCalendarDay = (field: 'start' | 'end', day: Date) => {
    setPeriod((prev) => applyPickedDate(prev, field, day));
    setActiveDateField(null);
  };

  const toggleWeekDay = (day: number) => {
    setPeriod((prev) => ({
      ...prev,
      weekDays: prev.weekDays.includes(day)
        ? prev.weekDays.filter((d) => d !== day)
        : [...prev.weekDays, day],
    }));
  };

  const handleDisableDateTab = (block: Block) => {
    if (allBlocks.length <= 1) {
      toast.warning("Non puoi rimuovere l'ultimo giorno");
      return;
    }

    const dateLabel = format(new Date(block.start_time), 'dd/MM/yyyy', { locale: it });
    if (!confirm(`Vuoi rimuovere il tab del ${dateLabel}?`)) return;

    const dateKey = toInputDateValue(new Date(block.start_time));
    setExcludedDates((prev) => (prev.includes(dateKey) ? prev : [...prev, dateKey]));
    setAllBlocks((prev) => prev.filter((item) => item.id !== block.id));
  };

  useEffect(() => {
    if (!blockId) {
      setLoading(false);
      return;
    }

    void loadBlockDetails();
  }, [blockId]);

  async function loadBlockDetails() {
    if (!blockId) return;

    try {
      setLoading(true);

      // Carica il blocco principale
      const { data: mainBlock, error: mainError } = await supabase
        .from('court_blocks')
        .select('*')
        .eq('id', blockId)
        .single();

      if (mainError || !mainBlock) {
        console.error('Block not found');
        router.push('/dashboard/admin/courts');
        return;
      }

      const mainStart = new Date(mainBlock.start_time);
      const mainEnd = new Date(mainBlock.end_time);

      // Trova tutti i blocchi con stesso campo, motivo e orario
      const { data: relatedBlocks, error: relatedError } = await supabase
        .from('court_blocks')
        .select('*')
        .eq('court_id', mainBlock.court_id)
        .eq('reason', mainBlock.reason || '')
        .eq('is_disabled', false)
        .order('start_time', { ascending: true });

      if (!relatedError && relatedBlocks) {
        const sameTimeBlocks: Block[] = relatedBlocks.filter(
          (b) =>
            minutesOfDay(new Date(b.start_time)) === minutesOfDay(mainStart) &&
            minutesOfDay(new Date(b.end_time)) === minutesOfDay(mainEnd),
        );

        setAllBlocks(sameTimeBlocks);
        setExcludedDates([]);

        // Periodo e giorni della settimana ricavati dai blocchi reali
        const blockDates = sameTimeBlocks.map((b) => new Date(b.start_time));
        setPeriod({
          startDate: blockDates.length > 0 ? toInputDateValue(blockDates[0]) : '',
          endDate: blockDates.length > 0 ? toInputDateValue(blockDates[blockDates.length - 1]) : '',
          weekDays: [...new Set(blockDates.map((d) => d.getDay()))],
        });
      }

      setSelectedCourt(mainBlock.court_id);

      const parsedReason = parseBlockReason(mainBlock.reason || '');
      setBlockName(parsedReason.blockName);
      setBlockType(parsedReason.blockType);
      setCustomBlockType(parsedReason.customBlockType);
      setNotes(parsedReason.notes);

      setStartTime(toTimeValue(mainStart));
      setEndTime(toTimeValue(mainEnd));
    } catch (err) {
      console.error('Error loading block:', err);
      router.push('/dashboard/admin/courts');
    } finally {
      setLoading(false);
    }
  }

  async function disableCurrentBlocks() {
    return supabase
      .from('court_blocks')
      .update({ is_disabled: true })
      .in(
        'id',
        allBlocks.map((b) => b.id),
      );
  }

  async function handleUpdate() {
    if (!selectedCourt || !blockType || period.weekDays.length === 0) {
      toast.warning('Compila i campi obbligatori');
      return;
    }

    if (blockType === 'altro' && !customBlockType.trim()) {
      toast.warning('Specifica il tipo di blocco');
      return;
    }

    if (toMinutes(endTime) <= toMinutes(startTime)) {
      toast.warning('Orario di fine non valido');
      return;
    }

    if (allBlocks.length === 0) {
      toast.warning('Nessun blocco da aggiornare');
      return;
    }

    if (!period.startDate || !period.endDate) {
      toast.warning('Seleziona le date');
      return;
    }

    try {
      setSubmitting(true);

      const newBlocks = buildCourtBlocks({
        court: selectedCourt,
        startDate: period.startDate,
        endDate: period.endDate,
        weekDays: period.weekDays,
        startTime,
        endTime,
        reason: buildBlockReason({ blockType, customBlockType, notes, blockName }),
        excludedDates,
      });

      if (newBlocks.length === 0) {
        toast.warning('Nessun giorno selezionato');
        return;
      }

      const conflictResult = await checkCourtBlockConflicts(supabase, newBlocks);
      if (conflictResult.hasConflict) {
        toast.error('Periodo già occupato');
        return;
      }

      // Disattiva i blocchi correnti (soft-delete) e crea quelli nuovi
      await disableCurrentBlocks();

      const { error } = await supabase.from('court_blocks').insert(newBlocks);

      if (error) throw error;

      router.push('/dashboard/admin/courts');
    } catch (err) {
      console.error('Error updating blocks:', err);
      toast.error('Salvataggio non riuscito');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Sei sicuro di voler disattivare tutti i ${allBlocks.length} giorni di questo blocco?`,
      )
    ) {
      return;
    }

    try {
      setDeleting(true);

      const { error } = await disableCurrentBlocks();

      if (error) throw error;

      router.push('/dashboard/admin/courts');
    } catch (err) {
      console.error('Error deleting blocks:', err);
      toast.error('Eliminazione non riuscita');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento dettagli...</p>
      </div>
    );
  }

  if (!blockId) {
    return (
      <div className="space-y-4">
        <p className="text-secondary/70">ID blocco mancante.</p>
        <Link href="/dashboard/admin/courts" className="text-secondary font-medium hover:underline">
          Torna a Blocco Campi
        </Link>
      </div>
    );
  }

  const blockStyle = getBlockStyle(allBlocks[0]?.reason);
  const BlockIcon = blockStyle.icon;

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
          <Link
            href={`/dashboard/admin/courts/${blockId}`}
            className="hover:text-secondary/80 transition-colors"
          >
            Dettagli Blocco
          </Link>
          {' › '}
          <span>Modifica Blocco</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Modifica Blocco</h1>
      </div>

      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{
          backgroundColor: blockStyle.background,
          borderColor: blockStyle.background,
          borderLeftColor: blockStyle.background,
        }}
      >
        <div className="flex items-start gap-6">
          <BlockIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{selectedCourt}</h2>
          </div>
        </div>
      </div>

      <BlockCard title="Date bloccate">
        <ul className="flex flex-col gap-2">
          {allBlocks.map((block, index) => {
            const dateStart = new Date(block.start_time);
            const dateEnd = new Date(block.end_time);

            return (
              <li key={block.id}>
                <div
                  className="flex items-center gap-4 py-3 px-3 rounded-lg"
                  style={{ background: 'var(--secondary)' }}
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-bold leading-none text-white">{index + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-white">
                      {format(dateStart, 'EEEE d MMMM yyyy', { locale: it }).replace(
                        /^./,
                        (letter) => letter.toUpperCase(),
                      )}
                    </p>
                    <p className="text-xs truncate mt-0.5 text-white/70">
                      {format(dateStart, 'HH:mm')} - {format(dateEnd, 'HH:mm')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDisableDateTab(block)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded transition-all focus:outline-none hover:bg-white/10 text-white/70 hover:text-white"
                      aria-label={`Rimuovi ${format(dateStart, 'dd/MM/yyyy', { locale: it })}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </BlockCard>

      <BlockCard title="Dettagli blocco">
        <div className="space-y-6">
          <BlockNameField value={blockName} onChange={setBlockName} />
          <BlockCourtField courts={courts} value={selectedCourt} onChange={setSelectedCourt} />
          <BlockTypeField
            blockType={blockType}
            customBlockType={customBlockType}
            onTypeChange={setBlockType}
            onCustomTypeChange={setCustomBlockType}
          />
        </div>
      </BlockCard>

      <BlockCard title="Periodo">
        <div className="space-y-6">
          <BlockDateField
            label="Data inizio"
            value={period.startDate}
            open={activeDateField === 'start'}
            onToggle={() => toggleDatePanel('start')}
            onSelect={(day) => selectCalendarDay('start', day)}
          />
          <BlockDateField
            label="Data fine"
            value={period.endDate}
            open={activeDateField === 'end'}
            onToggle={() => toggleDatePanel('end')}
            onSelect={(day) => selectCalendarDay('end', day)}
          />
          <BlockWeekDaysField value={period.weekDays} onToggle={toggleWeekDay} />
          <BlockFieldRow label="Ora inizio">
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={SELECT_CLASS}
            >
              {TIME_SLOTS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </BlockFieldRow>
          <BlockFieldRow label="Ora fine" last>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={SELECT_CLASS}
            >
              {TIME_SLOTS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </BlockFieldRow>
        </div>
      </BlockCard>

      <BlockNotesCard value={notes} onChange={setNotes} />

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleUpdate}
          disabled={
            !selectedCourt ||
            !blockType ||
            period.weekDays.length === 0 ||
            (blockType === 'altro' && !customBlockType.trim()) ||
            submitting ||
            deleting
          }
          className="w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <span>Salva</span>
          )}
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting || submitting}
          className="w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Eliminazione...
            </>
          ) : (
            <span>Elimina</span>
          )}
        </button>
      </div>
    </div>
  );
}
