import { parseDateInput, toInputDateValue } from '@/lib/utils/dateInput';

/** Tipi di blocco campo: l'etichetta finisce nel testo di `court_blocks.reason`. */
export const BLOCK_TYPES = [
  { value: 'corsi_tennis', label: 'Corsi Tennis' },
  { value: 'corso_adulti', label: 'Corso Adulti' },
  { value: 'manutenzione', label: 'Manutenzione' },
  { value: 'evento', label: 'Evento' },
  { value: 'altro', label: 'Altro' },
];

/** Giorni della settimana, da lunedì; `value` è quello di `Date.getDay()`. */
export const WEEK_DAYS = [
  { value: 1, label: 'Lun', fullLabel: 'Lunedì' },
  { value: 2, label: 'Mar', fullLabel: 'Martedì' },
  { value: 3, label: 'Mer', fullLabel: 'Mercoledì' },
  { value: 4, label: 'Gio', fullLabel: 'Giovedì' },
  { value: 5, label: 'Ven', fullLabel: 'Venerdì' },
  { value: 6, label: 'Sab', fullLabel: 'Sabato' },
  { value: 0, label: 'Dom', fullLabel: 'Domenica' },
];

export type CourtBlockInsert = {
  court_id: string;
  start_time: string;
  end_time: string;
  reason: string;
};

/** Testo di `reason`: "[nome - ]tipo[ - note]". */
export function buildBlockReason({
  blockType,
  customBlockType,
  notes,
  blockName = '',
}: {
  blockType: string;
  customBlockType: string;
  notes: string;
  blockName?: string;
}): string {
  let typeLabel = BLOCK_TYPES.find((t) => t.value === blockType)?.label || blockType;
  if (blockType === 'altro' && customBlockType.trim()) {
    typeLabel = `Altro (${customBlockType.trim()})`;
  }
  const base = notes ? `${typeLabel} - ${notes}` : typeLabel;
  return blockName.trim() ? `${blockName.trim()} - ${base}` : base;
}

/**
 * Un blocco per ogni giorno del periodo che cade in uno dei giorni della
 * settimana scelti, saltando le date escluse (`aaaa-mm-gg`).
 * Lancia un errore se le date non sono valide.
 */
export function buildCourtBlocks({
  court,
  startDate,
  endDate,
  weekDays,
  startTime,
  endTime,
  reason,
  excludedDates = [],
}: {
  court: string;
  startDate: string;
  endDate: string;
  weekDays: number[];
  startTime: string;
  endTime: string;
  reason: string;
  excludedDates?: string[];
}): CourtBlockInsert[] {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!start || !end) throw new Error('Formato data non valido');
  if (end < start) throw new Error('La data fine deve essere successiva alla data inizio');

  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const blocks: CourtBlockInsert[] = [];
  const currentDate = new Date(start);
  while (currentDate <= end) {
    if (
      weekDays.includes(currentDate.getDay()) &&
      !excludedDates.includes(toInputDateValue(currentDate))
    ) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(startHour, startMinute, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(endHour, endMinute, 0, 0);
      blocks.push({
        court_id: court,
        start_time: dayStart.toISOString(),
        end_time: dayEnd.toISOString(),
        reason,
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return blocks;
}

/**
 * Applica al periodo la data scelta dal calendario: tiene la fine non
 * precedente all'inizio e aggiunge il giorno della settimana della data scelta.
 */
export function applyPickedDate<
  T extends { startDate: string; endDate: string; weekDays: number[] },
>(period: T, field: 'start' | 'end', day: Date): T {
  const selected = toInputDateValue(day);
  const dayOfWeek = day.getDay();
  const weekDays = period.weekDays.includes(dayOfWeek)
    ? period.weekDays
    : [...period.weekDays, dayOfWeek];
  if (field === 'start') {
    const endDate = period.endDate && period.endDate < selected ? selected : period.endDate;
    return { ...period, startDate: selected, endDate, weekDays };
  }
  const endDate = period.startDate && selected < period.startDate ? period.startDate : selected;
  return { ...period, endDate, weekDays };
}

function matchBlockType(label: string): { blockType: string; customBlockType: string } | null {
  const custom = label.match(/^Altro\s*\((.+)\)$/i);
  if (custom?.[1]) return { blockType: 'altro', customBlockType: custom[1].trim() };
  const found = BLOCK_TYPES.find((t) => t.label.toLowerCase() === label.toLowerCase());
  return found ? { blockType: found.value, customBlockType: '' } : null;
}

/** Inverso di `buildBlockReason`: nome, tipo e note dal testo di `reason`. */
export function parseBlockReason(reason: string): {
  blockName: string;
  blockType: string;
  customBlockType: string;
  notes: string;
} {
  const parts = reason.split(' - ').map((part) => part.trim());
  const typeIndex = parts.findIndex((part) => matchBlockType(part) !== null);

  if (typeIndex >= 0) {
    return {
      blockName: parts.slice(0, typeIndex).join(' - '),
      ...matchBlockType(parts[typeIndex])!,
      notes: parts.slice(typeIndex + 1).join(' - '),
    };
  }

  // Testo libero (blocchi vecchi): il tipo si deduce se nominato, altrimenti il testo resta nelle note.
  const found = BLOCK_TYPES.find(
    (t) => t.value !== 'altro' && reason.toLowerCase().includes(t.label.toLowerCase()),
  );
  return {
    blockName: '',
    blockType: found?.value ?? '',
    customBlockType: '',
    notes: found ? '' : reason.trim(),
  };
}
