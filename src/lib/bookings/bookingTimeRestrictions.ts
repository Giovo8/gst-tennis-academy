/**
 * Orari di apertura campi con restrizioni per atleti e maestri.
 * Admin e gestore non sono soggetti a queste restrizioni.
 */

interface DayHours {
  open: { h: number; m: number };
  close: { h: number; m: number };
}

const COURT_HOURS: Record<string, DayHours> = {
  // Lunedì - Venerdì: 07:00 - 20:30
  weekday: { open: { h: 7, m: 0 }, close: { h: 20, m: 30 } },
  // Sabato: 07:00 - 18:00
  saturday: { open: { h: 7, m: 0 }, close: { h: 18, m: 0 } },
  // Domenica: 07:00 - 13:00
  sunday: { open: { h: 7, m: 0 }, close: { h: 13, m: 0 } },
};

/** Restituisce gli orari per un dato giorno della settimana (0=Dom, 1=Lun, ..., 6=Sab) */
export function getCourtHoursForDay(dayOfWeek: number): DayHours {
  if (dayOfWeek === 0) return COURT_HOURS.sunday;
  if (dayOfWeek === 6) return COURT_HOURS.saturday;
  return COURT_HOURS.weekday;
}

/** Orario di chiusura in minuti dalla mezzanotte per il giorno dato */
export function getClosingMinutes(dayOfWeek: number): number {
  const h = getCourtHoursForDay(dayOfWeek);
  return h.close.h * 60 + h.close.m;
}

/** Orario di apertura in minuti dalla mezzanotte per il giorno dato */
export function getOpeningMinutes(dayOfWeek: number): number {
  const h = getCourtHoursForDay(dayOfWeek);
  return h.open.h * 60 + h.open.m;
}

/** Label leggibile degli orari per il giorno dato, es. "07:00 - 20:30" */
export function getCourtHoursLabel(dayOfWeek: number): string {
  const h = getCourtHoursForDay(dayOfWeek);
  const fmt = (v: number) => v.toString().padStart(2, '0');
  return `${fmt(h.open.h)}:${fmt(h.open.m)} - ${fmt(h.close.h)}:${fmt(h.close.m)}`;
}

/**
 * Verifica se start_time/end_time (stringhe ISO UTC) rientrano negli orari consentiti,
 * usando il fuso orario Europe/Rome.
 *
 * @returns null se l'orario è valido, altrimenti un messaggio di errore localizzato
 */
export function validateRestrictedBookingHours(
  startISO: string,
  endISO: string
): string | null {
  function getItalyComponents(date: Date): { dayOfWeek: number; minutesFromMidnight: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const get = (type: string) =>
      parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

    const hour = get('hour') % 24; // guard against "24" at midnight
    const minute = get('minute');
    const year = get('year');
    const month = get('month') - 1; // 0-indexed
    const day = get('day');

    // Crea una data locale solo per ricavare il giorno della settimana
    const dayOfWeek = new Date(year, month, day).getDay();
    return { dayOfWeek, minutesFromMidnight: hour * 60 + minute };
  }

  const start = getItalyComponents(new Date(startISO));
  const end = getItalyComponents(new Date(endISO));

  const hours = getCourtHoursForDay(start.dayOfWeek);
  const openMin = hours.open.h * 60 + hours.open.m;
  const closeMin = hours.close.h * 60 + hours.close.m;

  if (start.minutesFromMidnight < openMin || end.minutesFromMidnight > closeMin) {
    return `Orario non consentito. In questo giorno puoi prenotare dalle ${getCourtHoursLabel(start.dayOfWeek)}.`;
  }

  return null;
}

/**
 * Converte una data/ora locale italiana (Europe/Rome) in un oggetto Date UTC.
 * Necessario perché i server Vercel girano in UTC e gli orari dei corsi
 * sono espressi in ora locale italiana.
 *
 * @param dateStr - Data in formato YYYY-MM-DD
 * @param hh - Ora (0-23) in orario locale italiano
 * @param mm - Minuti (0-59)
 */
export function parseItalyLocalToUTC(dateStr: string, hh: number, mm: number): Date {
  // Crea una stima UTC trattando l'orario come UTC (sarà sfasata dell'offset Italy)
  const estimate = new Date(`${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`);

  // Trova l'orario Italy (Europe/Rome) corrispondente alla stima UTC
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(estimate);

  const italyHour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const italyMin = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0');

  // Aggiusta: sposta la stima per ottenere l'orario Italy corretto
  const diffMs = ((hh - italyHour) * 60 + (mm - italyMin)) * 60_000;
  return new Date(estimate.getTime() + diffMs);
}
