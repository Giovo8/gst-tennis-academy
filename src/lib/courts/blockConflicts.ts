import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COURSE_CONFLICT_SELECT,
  findCourseConflict,
  type CourseScheduleRow,
} from "@/lib/bookings/courseConflicts";

/**
 * Controllo conflitti per la creazione/modifica di un blocco campo
 * (dashboard/admin/courts): verifica che il periodo del blocco non si
 * sovrapponga a prenotazioni attive o corsi programmati già esistenti.
 *
 * Direzione complementare a `courseConflicts.ts`, che copre invece il
 * controllo prenotazione/corso → blocco già esistente.
 */

export interface CourtBlockCandidate {
  court_id: string;
  start_time: string;
  end_time: string;
}

export interface BlockConflictResult {
  hasConflict: boolean;
  bookingConflicts: number;
  courseConflict: CourseScheduleRow | null;
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart);
}

export async function checkCourtBlockConflicts(
  supabase: SupabaseClient,
  candidates: CourtBlockCandidate[]
): Promise<BlockConflictResult> {
  if (candidates.length === 0) {
    return { hasConflict: false, bookingConflicts: 0, courseConflict: null };
  }

  const courts = [...new Set(candidates.map((c) => c.court_id))];
  const minStart = candidates.reduce((min, c) => (c.start_time < min ? c.start_time : min), candidates[0].start_time);
  const maxEnd = candidates.reduce((max, c) => (c.end_time > max ? c.end_time : max), candidates[0].end_time);

  const [bookingsRes, coursesRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, court, start_time, end_time")
      .in("court", courts)
      .neq("status", "cancelled")
      .neq("status", "rejected")
      .lt("start_time", maxEnd)
      .gt("end_time", minStart),
    supabase.from("courses").select(COURSE_CONFLICT_SELECT).eq("is_active", true),
  ]);

  if (bookingsRes.error) throw bookingsRes.error;
  if (coursesRes.error) throw coursesRes.error;

  const bookings = (bookingsRes.data ?? []) as { id: string; court: string; start_time: string; end_time: string }[];
  const courses = (coursesRes.data ?? []) as CourseScheduleRow[];

  let bookingConflicts = 0;
  for (const candidate of candidates) {
    for (const booking of bookings) {
      if (
        booking.court === candidate.court_id &&
        rangesOverlap(candidate.start_time, candidate.end_time, booking.start_time, booking.end_time)
      ) {
        bookingConflicts++;
      }
    }
  }

  let courseConflict: CourseScheduleRow | null = null;
  for (const candidate of candidates) {
    const conflict = findCourseConflict(courses, candidate.court_id, candidate.start_time, candidate.end_time);
    if (conflict) {
      courseConflict = conflict;
      break;
    }
  }

  return {
    hasConflict: bookingConflicts > 0 || courseConflict !== null,
    bookingConflicts,
    courseConflict,
  };
}

export function formatBlockConflictMessage(result: BlockConflictResult): string {
  const parts: string[] = [];
  if (result.bookingConflicts > 0) {
    parts.push(
      `${result.bookingConflicts} prenotazione${result.bookingConflicts > 1 ? "i" : ""} esistente${result.bookingConflicts > 1 ? "i" : ""}`
    );
  }
  if (result.courseConflict) {
    parts.push(`il corso "${result.courseConflict.name ?? "programmato"}"`);
  }
  return `Impossibile creare il blocco: ${parts.join(" e ")} nello stesso periodo. Annulla le prenotazioni o modifica il periodo del blocco.`;
}
