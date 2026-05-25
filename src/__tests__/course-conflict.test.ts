/**
 * @jest-environment node
 *
 * Test per il controllo conflitti tra prenotazioni e corsi programmati.
 * Verifica che uno slot occupato da un corso non sia prenotabile.
 */

// ============================================
// Interfacce e logica estratta dalla API
// ============================================

interface CourseRecord {
  id: string;
  schedule_time: string | null;
  schedule_days: string[];
  schedule_periods: { days: string[]; time: string | null }[] | null;
  cancelled_dates: string[] | null;
  start_date: string | null;
  end_date: string | null;
}

const DAY_NAMES = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

/**
 * Controlla se una prenotazione confligge con un corso programmato.
 * Replica la logica del check server-side in /api/bookings/route.ts
 */
export function hasCourseConflict(
  start_time: string,
  end_time: string,
  courses: CourseRecord[]
): boolean {
  const bookingStart = new Date(start_time);
  const bookingEnd = new Date(end_time);
  const dateStr = start_time.split("T")[0];
  const dayName = DAY_NAMES[bookingStart.getDay()];

  return courses.some((c) => {
    if (!c.schedule_days.includes(dayName)) return false;
    if (c.start_date && new Date(c.start_date) > bookingStart) return false;
    if (c.end_date && new Date(c.end_date) < bookingStart) return false;
    if (c.cancelled_dates && c.cancelled_dates.includes(dateStr)) return false;

    let timeStr: string | null = c.schedule_time ?? null;
    if (c.schedule_periods && c.schedule_periods.length > 0) {
      const mp = c.schedule_periods.find((p) => p.days.includes(dayName));
      timeStr = mp?.time ?? null;
    }
    if (!timeStr) return false;

    const m = timeStr.match(/(\d{1,2}):(\d{2})\s*[\u2013\-]\s*(\d{1,2}):(\d{2})/);
    if (!m) return false;

    const courseStart = new Date(
      `${dateStr}T${m[1].padStart(2, "0")}:${m[2]}:00`
    );
    const courseEnd = new Date(
      `${dateStr}T${m[3].padStart(2, "0")}:${m[4]}:00`
    );
    return courseStart < bookingEnd && courseEnd > bookingStart;
  });
}

// ============================================
// Dati di supporto
// ============================================

/** Lunedì 2026-05-25 09:00–11:00 (ora locale) */
const MON_09_11_START = "2026-05-25T09:00:00";
const MON_09_11_END   = "2026-05-25T11:00:00";

/** Lunedì — giorno indice 1 → "lun" */
const courseMonday: CourseRecord = {
  id: "c1",
  schedule_time: "09:00 - 11:00",
  schedule_days: ["lun"],
  schedule_periods: null,
  cancelled_dates: null,
  start_date: null,
  end_date: null,
};

// ============================================
// TESTS
// ============================================

describe("hasCourseConflict", () => {
  describe("sovrapposizione diretta", () => {
    it("rileva conflitto: prenotazione coincide esattamente con il corso", () => {
      expect(hasCourseConflict(MON_09_11_START, MON_09_11_END, [courseMonday])).toBe(true);
    });

    it("rileva conflitto: prenotazione parzialmente sovrapposta (inizio anticipato)", () => {
      // 08:30 – 09:30 → si sovrappone dalle 09:00
      expect(
        hasCourseConflict(
          "2026-05-25T08:30:00",
          "2026-05-25T09:30:00",
          [courseMonday]
        )
      ).toBe(true);
    });

    it("rileva conflitto: prenotazione parzialmente sovrapposta (fine posticipata)", () => {
      // 10:30 – 11:30 → si sovrappone fino alle 11:00
      expect(
        hasCourseConflict(
          "2026-05-25T10:30:00",
          "2026-05-25T11:30:00",
          [courseMonday]
        )
      ).toBe(true);
    });

    it("rileva conflitto: prenotazione completamente all'interno del corso", () => {
      // 09:30 – 10:30 → dentro 09:00–11:00
      expect(
        hasCourseConflict(
          "2026-05-25T09:30:00",
          "2026-05-25T10:30:00",
          [courseMonday]
        )
      ).toBe(true);
    });

    it("rileva conflitto: prenotazione contiene l'intero corso", () => {
      // 08:00 – 12:00 → contiene 09:00–11:00
      expect(
        hasCourseConflict(
          "2026-05-25T08:00:00",
          "2026-05-25T12:00:00",
          [courseMonday]
        )
      ).toBe(true);
    });
  });

  describe("nessun conflitto", () => {
    it("nessun conflitto: prenotazione prima del corso", () => {
      // 07:00 – 09:00 → adiacente, non sovrapposto
      expect(
        hasCourseConflict(
          "2026-05-25T07:00:00",
          "2026-05-25T09:00:00",
          [courseMonday]
        )
      ).toBe(false);
    });

    it("nessun conflitto: prenotazione dopo il corso", () => {
      // 11:00 – 12:00 → adiacente, non sovrapposto
      expect(
        hasCourseConflict(
          "2026-05-25T11:00:00",
          "2026-05-25T12:00:00",
          [courseMonday]
        )
      ).toBe(false);
    });

    it("nessun conflitto: giorno diverso dal corso", () => {
      // Martedì 2026-05-26 — corso solo lunedì
      expect(
        hasCourseConflict(
          "2026-05-26T09:00:00",
          "2026-05-26T10:00:00",
          [courseMonday]
        )
      ).toBe(false);
    });

    it("nessun conflitto: lista corsi vuota", () => {
      expect(hasCourseConflict(MON_09_11_START, MON_09_11_END, [])).toBe(false);
    });
  });

  describe("date di validità del corso", () => {
    it("nessun conflitto: corso non ancora iniziato (start_date futura)", () => {
      const future: CourseRecord = {
        ...courseMonday,
        id: "c2",
        start_date: "2026-06-01",
      };
      expect(hasCourseConflict(MON_09_11_START, MON_09_11_END, [future])).toBe(false);
    });

    it("nessun conflitto: corso già terminato (end_date passata)", () => {
      const expired: CourseRecord = {
        ...courseMonday,
        id: "c3",
        end_date: "2026-05-20",
      };
      expect(hasCourseConflict(MON_09_11_START, MON_09_11_END, [expired])).toBe(false);
    });

    it("rileva conflitto: corso attivo (start_date e end_date valide)", () => {
      const active: CourseRecord = {
        ...courseMonday,
        id: "c4",
        start_date: "2026-05-01",
        end_date: "2026-06-30",
      };
      expect(hasCourseConflict(MON_09_11_START, MON_09_11_END, [active])).toBe(true);
    });
  });

  describe("date annullate", () => {
    it("nessun conflitto: data specifica annullata", () => {
      const withCancelled: CourseRecord = {
        ...courseMonday,
        id: "c5",
        cancelled_dates: ["2026-05-25"],
      };
      expect(hasCourseConflict(MON_09_11_START, MON_09_11_END, [withCancelled])).toBe(false);
    });

    it("rileva conflitto: data non annullata", () => {
      const withOtherCancelled: CourseRecord = {
        ...courseMonday,
        id: "c6",
        cancelled_dates: ["2026-05-18"],
      };
      expect(hasCourseConflict(MON_09_11_START, MON_09_11_END, [withOtherCancelled])).toBe(true);
    });
  });

  describe("schedule_periods (periodi multipli)", () => {
    it("rileva conflitto: orario definito in schedule_periods per il giorno corretto", () => {
      const multiPeriod: CourseRecord = {
        id: "c7",
        schedule_time: null,
        schedule_days: ["lun", "mer"],
        schedule_periods: [
          { days: ["mer"], time: "14:00 - 15:30" },
          { days: ["lun"], time: "09:00 - 11:00" },
        ],
        cancelled_dates: null,
        start_date: null,
        end_date: null,
      };
      expect(hasCourseConflict(MON_09_11_START, MON_09_11_END, [multiPeriod])).toBe(true);
    });

    it("nessun conflitto: schedule_periods non include il giorno richiesto", () => {
      const multiPeriod: CourseRecord = {
        id: "c8",
        schedule_time: null,
        schedule_days: ["mer"],
        schedule_periods: [{ days: ["mer"], time: "09:00 - 11:00" }],
        cancelled_dates: null,
        start_date: null,
        end_date: null,
      };
      // Il corso è solo mercoledì; la prenotazione è lunedì
      expect(hasCourseConflict(MON_09_11_START, MON_09_11_END, [multiPeriod])).toBe(false);
    });

    it("nessun conflitto: schedule_periods presente ma time null per quel giorno", () => {
      const noTime: CourseRecord = {
        id: "c9",
        schedule_time: null,
        schedule_days: ["lun"],
        schedule_periods: [{ days: ["lun"], time: null }],
        cancelled_dates: null,
        start_date: null,
        end_date: null,
      };
      expect(hasCourseConflict(MON_09_11_START, MON_09_11_END, [noTime])).toBe(false);
    });
  });

  describe("formato orario con trattino en-dash (–)", () => {
    it("rileva conflitto con orario separato da en-dash", () => {
      const enDash: CourseRecord = {
        ...courseMonday,
        id: "c10",
        schedule_time: "09:00\u201311:00",
      };
      expect(hasCourseConflict(MON_09_11_START, MON_09_11_END, [enDash])).toBe(true);
    });
  });

  describe("corso con orario non parsabile", () => {
    it("nessun conflitto: schedule_time non valido", () => {
      const bad: CourseRecord = {
        ...courseMonday,
        id: "c11",
        schedule_time: "orario da definire",
      };
      expect(hasCourseConflict(MON_09_11_START, MON_09_11_END, [bad])).toBe(false);
    });

    it("nessun conflitto: schedule_time null e schedule_periods null", () => {
      const nullTime: CourseRecord = {
        ...courseMonday,
        id: "c12",
        schedule_time: null,
        schedule_periods: null,
      };
      expect(hasCourseConflict(MON_09_11_START, MON_09_11_END, [nullTime])).toBe(false);
    });
  });
});
