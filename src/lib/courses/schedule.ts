import { resolveCourseCourtsForDate, type CourseScheduleRow } from '@/lib/bookings/courseConflicts';

/**
 * Helper puri sul calendario dei corsi (tabella `courses`), condivisi dalle pagine
 * corsi e prenotazioni di tutte le aree. Nessuna dipendenza da Supabase.
 */

/** Codice giorno italiano (come in `courses.schedule_days`) → indice di `Date.getDay()`. */
export const COURSE_DAY_INDEX: Record<string, number> = {
  dom: 0,
  lun: 1,
  mar: 2,
  mer: 3,
  gio: 4,
  ven: 5,
  sab: 6,
};

const COURSE_DAY_CODES = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

/** Data locale del browser in formato YYYY-MM-DD. */
export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** Codice giorno (dom..sab) di una data YYYY-MM-DD. */
function courseDayCode(dateStr: string): string {
  return COURSE_DAY_CODES[new Date(dateStr + 'T12:00:00').getDay()];
}

/** Periodo di programmazione del corso che copre il giorno della data indicata. */
function getCoursePeriodForDate<P extends { days: string[] }>(
  course: { schedule_periods?: P[] | null },
  dateStr: string,
): P | null {
  if (!course.schedule_periods?.length) return null;
  const dayCode = courseDayCode(dateStr);
  return course.schedule_periods.find((p) => p.days?.includes(dayCode)) ?? null;
}

/** Campi occupati dal corso in una data: override per-data > periodo > `court_name`. */
export function getCourseCourtsForDate(
  course: Pick<CourseScheduleRow, 'court_name' | 'schedule_periods' | 'lesson_overrides'>,
  dateStr: string,
): string[] {
  return resolveCourseCourtsForDate(course, dateStr, courseDayCode(dateStr));
}

/** Come `getCourseCourtsForDate`, ma in un'unica etichetta ("Campo 1, Campo 2"). */
export function getCourseCourtForDate(
  course: Pick<CourseScheduleRow, 'court_name' | 'schedule_periods' | 'lesson_overrides'>,
  dateStr: string,
): string | null {
  const courts = getCourseCourtsForDate(course, dateStr);
  return courts.length > 0 ? courts.join(', ') : null;
}

/** Orario del corso in una data: override per-data > periodo > `schedule_time`. */
export function getCourseTimeForDate(
  course: Pick<CourseScheduleRow, 'schedule_time' | 'schedule_periods' | 'lesson_time_overrides'>,
  dateStr: string,
): string | null {
  if (course.lesson_time_overrides?.[dateStr]) return course.lesson_time_overrides[dateStr];
  const period = getCoursePeriodForDate(course, dateStr);
  if (period?.time) return period.time;
  return course.schedule_time ?? null;
}

/**
 * Date delle lezioni tra `start_date` e `end_date` nei giorni di `schedule_days`.
 * Salta sempre le date annullate; con `includeExtra` aggiunge le lezioni extra.
 */
export function computeLessonDates(
  course: Pick<
    CourseScheduleRow,
    'start_date' | 'end_date' | 'schedule_days' | 'cancelled_dates' | 'extra_dates'
  >,
  { includeExtra = false } = {},
): Date[] {
  if (!course.start_date || !course.end_date || !course.schedule_days?.length) return [];
  const allowed = new Set(course.schedule_days.map((d) => COURSE_DAY_INDEX[d] ?? -1));
  const cancelled = new Set(course.cancelled_dates ?? []);
  const end = new Date(course.end_date);
  const result: Date[] = [];
  const cur = new Date(course.start_date);
  while (cur <= end) {
    const dateStr = cur.toISOString().split('T')[0];
    if (allowed.has(cur.getDay()) && !cancelled.has(dateStr)) result.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  if (includeExtra) {
    for (const d of course.extra_dates ?? []) result.push(new Date(d));
    result.sort((a, b) => a.getTime() - b.getTime());
  }
  return result;
}
