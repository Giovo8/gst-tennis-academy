import { parseItalyLocalToUTC } from "./bookingTimeRestrictions";

/**
 * Logica condivisa per rilevare la sovrapposizione tra un corso programmato
 * (tabella `courses`) e uno slot campo (prenotazione o slot candidato).
 *
 * Isomorfa: non importa client Supabase né codice server-only, quindi è
 * utilizzabile sia nelle route API (server) sia nelle pagine client
 * (es. blocco creazione corso sopra prenotazioni esistenti).
 *
 * Il giorno della settimana e la data vengono calcolati nel fuso Europe/Rome
 * a partire dall'istante UTC, così il matching è corretto indipendentemente
 * dal fuso del server (Vercel gira in UTC).
 */

export interface CourseSchedulePeriod {
  days: string[];
  time: string | null;
  court?: string | null;
  courts?: string[] | null;
}

export interface CourseScheduleRow {
  id?: string;
  name?: string | null;
  court_name?: string | null;
  schedule_time?: string | null;
  schedule_days?: string[] | null;
  schedule_periods?: CourseSchedulePeriod[] | null;
  cancelled_dates?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  extra_dates?: string[] | null;
  lesson_overrides?: Record<string, string> | null;
  lesson_time_overrides?: Record<string, string> | null;
}

/** Campi da selezionare dalla tabella `courses` per il controllo conflitti. */
export const COURSE_CONFLICT_SELECT =
  "id, name, court_name, schedule_time, schedule_days, schedule_periods, cancelled_dates, start_date, end_date, extra_dates, lesson_overrides, lesson_time_overrides";

const WEEKDAY_MAP: Record<string, string> = {
  Sun: "dom",
  Mon: "lun",
  Tue: "mar",
  Wed: "mer",
  Thu: "gio",
  Fri: "ven",
  Sat: "sab",
};

const TIME_RANGE_RE = /(\d{1,2}):(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})/;

/** Data locale italiana (YYYY-MM-DD) per un dato istante. */
export function italyDateStr(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Nome breve del giorno della settimana italiano (dom..sab) per un istante. */
export function italyDayName(instant: Date): string {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    weekday: "short",
  }).format(instant);
  return WEEKDAY_MAP[wd] ?? "";
}

/** Campi di un periodo: `courts` (multi-campo) se presente, altrimenti `court` singolo legacy. */
function periodCourts(p: CourseSchedulePeriod | undefined | null): string[] {
  if (!p) return [];
  if (p.courts && p.courts.length > 0) return p.courts;
  if (p.court) return [p.court];
  return [];
}

/**
 * Risolve i campi occupati da un corso in una data specifica, con la stessa
 * precedenza usata in tutta l'app: override per-singola-lezione > periodo del
 * giorno > `court_name` (fallback legacy per corsi a schedule singolo).
 * Un periodo può occupare più campi contemporaneamente (stesso giorno/ora).
 */
export function resolveCourseCourtsForDate(
  course: Pick<CourseScheduleRow, "court_name" | "schedule_periods" | "lesson_overrides">,
  dateStr: string,
  dayCode: string
): string[] {
  if (course.lesson_overrides?.[dateStr]) {
    return [course.lesson_overrides[dateStr]];
  }
  const periods = course.schedule_periods ?? [];
  if (periods.length > 0) {
    const mp = periods.find((p) => p.days.includes(dayCode));
    const courts = periodCourts(mp);
    if (courts.length > 0) return courts;
  }
  return course.court_name ? [course.court_name] : [];
}

/**
 * Unione deduplicata di tutti i campi usati in tutti i periodi del corso,
 * senza riferimento a una data specifica (per viste elenco/ricerca).
 */
export function courseAllCourtsSummary(
  course: Pick<CourseScheduleRow, "court_name" | "schedule_periods">
): string[] {
  const periods = course.schedule_periods ?? [];
  const fromPeriods = periods.flatMap((p) => periodCourts(p));
  const unique = [...new Set(fromPeriods)];
  if (unique.length > 0) return unique;
  return course.court_name ? [course.court_name] : [];
}

/**
 * Verifica se un singolo corso occupa il campo `court` nell'intervallo
 * [startISO, endISO) per la data/orario indicati.
 */
export function courseOccupiesSlot(
  course: CourseScheduleRow,
  court: string,
  startISO: string,
  endISO: string
): boolean {
  const bookingStart = new Date(startISO);
  const bookingEnd = new Date(endISO);
  const dateStr = italyDateStr(bookingStart);
  const dayName = italyDayName(bookingStart);

  if (course.start_date && course.start_date > dateStr) return false;
  if (course.end_date && course.end_date < dateStr) return false;
  if (course.cancelled_dates?.includes(dateStr)) return false;

  const isExtraDate = course.extra_dates?.includes(dateStr) ?? false;
  const isRegularDay = course.schedule_days?.includes(dayName) ?? false;
  if (!isExtraDate && !isRegularDay) return false;

  const periods = course.schedule_periods ?? [];

  const candidateCourts = resolveCourseCourtsForDate(course, dateStr, dayName)
    .map((c) => c.trim())
    .filter(Boolean);
  // Un corso senza campo risolto per il giorno non blocca alcuna prenotazione.
  if (candidateCourts.length === 0) return false;
  if (!candidateCourts.includes(court)) return false;

  // Orario del corso per quel giorno: override per-data > periodo > schedule_time.
  let timeStr: string | null = course.schedule_time ?? null;
  if (course.lesson_time_overrides?.[dateStr]) {
    timeStr = course.lesson_time_overrides[dateStr];
  } else if (periods.length > 0) {
    const mp = periods.find((p) => p.days.includes(dayName));
    if (mp) timeStr = mp.time ?? null;
  }
  if (!timeStr) return false;

  const m = timeStr.match(TIME_RANGE_RE);
  if (!m) return false;

  const courseStart = parseItalyLocalToUTC(dateStr, parseInt(m[1], 10), parseInt(m[2], 10));
  const courseEnd = parseItalyLocalToUTC(dateStr, parseInt(m[3], 10), parseInt(m[4], 10));
  return courseStart < bookingEnd && courseEnd > bookingStart;
}

/**
 * Restituisce il primo corso in conflitto con lo slot indicato, oppure null.
 * Usato dalle route API (creazione/modifica/conferma prenotazione).
 */
export function findCourseConflict(
  courses: CourseScheduleRow[] | null | undefined,
  court: string,
  startISO: string,
  endISO: string
): CourseScheduleRow | null {
  for (const course of courses ?? []) {
    if (courseOccupiesSlot(course, court, startISO, endISO)) return course;
  }
  return null;
}

/** Slot prenotazione minimale usato per il controllo inverso (corso → prenotazioni). */
export interface BookingSlotLike {
  id?: string;
  court: string;
  start_time: string;
  end_time: string;
}

/**
 * Controllo inverso: date le prenotazioni esistenti, restituisce quelle che
 * cadrebbero dentro le occorrenze del corso indicato (usato quando si crea o
 * modifica un corso, per avvisare che ci sono prenotazioni sovrapposte).
 */
export function findBookingsBlockedByCourse(
  course: CourseScheduleRow,
  bookings: BookingSlotLike[] | null | undefined
): BookingSlotLike[] {
  return (bookings ?? []).filter((b) =>
    courseOccupiesSlot(course, b.court, b.start_time, b.end_time)
  );
}
