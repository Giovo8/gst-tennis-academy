/**
 * @jest-environment node
 *
 * Test per la selezione multi-campo nei periodi di un corso: un periodo può
 * occupare più campi contemporaneamente (stesso giorno/ora) e deve bloccare
 * le prenotazioni su OGNI campo selezionato, senza rompere la compatibilità
 * con i corsi legacy che hanno ancora un solo campo (`court`).
 */

import {
  courseOccupiesSlot,
  resolveCourseCourtsForDate,
  courseAllCourtsSummary,
  type CourseScheduleRow,
} from "@/lib/bookings/courseConflicts";

/** Lunedì 2026-05-25, 09:00–10:00 ora italiana (CEST, UTC+2) */
const MON_START = "2026-05-25T07:00:00.000Z";
const MON_END = "2026-05-25T08:00:00.000Z";

describe("courseOccupiesSlot — multi-campo", () => {
  const twoCourtsCourse: CourseScheduleRow = {
    id: "c1",
    schedule_days: ["lun"],
    schedule_time: null,
    schedule_periods: [
      { days: ["lun"], time: "09:00 - 11:00", courts: ["Campo 1", "Campo 2"] },
    ],
    court_name: null,
    cancelled_dates: null,
    start_date: null,
    end_date: null,
  };

  it("blocca il primo campo selezionato", () => {
    expect(courseOccupiesSlot(twoCourtsCourse, "Campo 1", MON_START, MON_END)).toBe(true);
  });

  it("blocca anche il secondo campo selezionato", () => {
    expect(courseOccupiesSlot(twoCourtsCourse, "Campo 2", MON_START, MON_END)).toBe(true);
  });

  it("non blocca un terzo campo non selezionato", () => {
    expect(courseOccupiesSlot(twoCourtsCourse, "Campo 3", MON_START, MON_END)).toBe(false);
  });

  it("compatibilità legacy: corso con solo `court` singolo continua a funzionare", () => {
    const legacyCourse: CourseScheduleRow = {
      ...twoCourtsCourse,
      id: "c2",
      schedule_periods: [{ days: ["lun"], time: "09:00 - 11:00", court: "Campo 1" }],
    };
    expect(courseOccupiesSlot(legacyCourse, "Campo 1", MON_START, MON_END)).toBe(true);
    expect(courseOccupiesSlot(legacyCourse, "Campo 2", MON_START, MON_END)).toBe(false);
  });

  it("compatibilità legacy: fallback su court_name senza schedule_periods", () => {
    const legacyCourse: CourseScheduleRow = {
      id: "c3",
      schedule_days: ["lun"],
      schedule_time: "09:00 - 11:00",
      schedule_periods: null,
      court_name: "Campo 1",
      cancelled_dates: null,
      start_date: null,
      end_date: null,
    };
    expect(courseOccupiesSlot(legacyCourse, "Campo 1", MON_START, MON_END)).toBe(true);
    expect(courseOccupiesSlot(legacyCourse, "Campo 2", MON_START, MON_END)).toBe(false);
  });

  it("lesson_overrides con singolo campo ha precedenza su periodo multi-campo", () => {
    const withOverride: CourseScheduleRow = {
      ...twoCourtsCourse,
      id: "c4",
      lesson_overrides: { "2026-05-25": "Campo 4" },
    };
    expect(courseOccupiesSlot(withOverride, "Campo 4", MON_START, MON_END)).toBe(true);
    // Con override attivo, i campi del periodo normale non bloccano più quella data
    expect(courseOccupiesSlot(withOverride, "Campo 1", MON_START, MON_END)).toBe(false);
  });
});

describe("resolveCourseCourtsForDate", () => {
  it("restituisce entrambi i campi di un periodo multi-campo per il giorno corretto", () => {
    const course: CourseScheduleRow = {
      schedule_periods: [{ days: ["lun"], time: "09:00 - 11:00", courts: ["Campo 1", "Campo 2"] }],
    };
    expect(resolveCourseCourtsForDate(course, "2026-05-25", "lun")).toEqual(["Campo 1", "Campo 2"]);
  });

  it("restituisce array vuoto se nessun periodo copre il giorno e non c'è fallback", () => {
    const course: CourseScheduleRow = {
      schedule_periods: [{ days: ["mer"], time: "09:00 - 11:00", courts: ["Campo 1"] }],
    };
    expect(resolveCourseCourtsForDate(course, "2026-05-25", "lun")).toEqual([]);
  });
});

describe("courseAllCourtsSummary", () => {
  it("unisce (deduplicati) i campi di tutti i periodi del corso", () => {
    const course: CourseScheduleRow = {
      schedule_periods: [
        { days: ["lun"], time: "09:00 - 11:00", courts: ["Campo 1", "Campo 2"] },
        { days: ["mer"], time: "14:00 - 15:00", courts: ["Campo 2", "Campo 3"] },
      ],
    };
    expect(courseAllCourtsSummary(course)).toEqual(["Campo 1", "Campo 2", "Campo 3"]);
  });

  it("fallback su court_name se non ci sono periodi", () => {
    const course: CourseScheduleRow = { schedule_periods: null, court_name: "Campo 1" };
    expect(courseAllCourtsSummary(course)).toEqual(["Campo 1"]);
  });
});
