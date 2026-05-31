/**
 * @jest-environment node
 *
 * Test per le restrizioni orarie dei campi in /lib/bookings/bookingTimeRestrictions.ts
 */

import {
  getCourtHoursForDay,
  getClosingMinutes,
  getOpeningMinutes,
  getCourtHoursLabel,
  validateRestrictedBookingHours,
  parseItalyLocalToUTC,
} from "@/lib/bookings/bookingTimeRestrictions";

// 0=Dom, 1=Lun, 2=Mar, 3=Mer, 4=Gio, 5=Ven, 6=Sab

// ─────────────────────────────────────────────
// getCourtHoursForDay
// ─────────────────────────────────────────────
describe("getCourtHoursForDay", () => {
  it("restituisce orari feriali per lunedì-venerdì", () => {
    for (const day of [1, 2, 3, 4, 5]) {
      const h = getCourtHoursForDay(day);
      expect(h.open).toEqual({ h: 7, m: 0 });
      expect(h.close).toEqual({ h: 20, m: 30 });
    }
  });

  it("restituisce orari sabato (chiude 18:00)", () => {
    const h = getCourtHoursForDay(6);
    expect(h.open).toEqual({ h: 7, m: 0 });
    expect(h.close).toEqual({ h: 18, m: 0 });
  });

  it("restituisce orari domenica (chiude 13:00)", () => {
    const h = getCourtHoursForDay(0);
    expect(h.open).toEqual({ h: 7, m: 0 });
    expect(h.close).toEqual({ h: 13, m: 0 });
  });
});

// ─────────────────────────────────────────────
// getOpeningMinutes / getClosingMinutes
// ─────────────────────────────────────────────
describe("getOpeningMinutes", () => {
  it("apertura alle 7:00 → 420 minuti per tutti i giorni", () => {
    for (const day of [0, 1, 2, 3, 4, 5, 6]) {
      expect(getOpeningMinutes(day)).toBe(7 * 60); // 420
    }
  });
});

describe("getClosingMinutes", () => {
  it("chiusura feriale 20:30 → 1230 minuti", () => {
    for (const day of [1, 2, 3, 4, 5]) {
      expect(getClosingMinutes(day)).toBe(20 * 60 + 30); // 1230
    }
  });

  it("chiusura sabato 18:00 → 1080 minuti", () => {
    expect(getClosingMinutes(6)).toBe(18 * 60); // 1080
  });

  it("chiusura domenica 13:00 → 780 minuti", () => {
    expect(getClosingMinutes(0)).toBe(13 * 60); // 780
  });
});

// ─────────────────────────────────────────────
// getCourtHoursLabel
// ─────────────────────────────────────────────
describe("getCourtHoursLabel", () => {
  it("ritorna '07:00 - 20:30' per i feriali", () => {
    expect(getCourtHoursLabel(1)).toBe("07:00 - 20:30");
    expect(getCourtHoursLabel(5)).toBe("07:00 - 20:30");
  });

  it("ritorna '07:00 - 18:00' per sabato", () => {
    expect(getCourtHoursLabel(6)).toBe("07:00 - 18:00");
  });

  it("ritorna '07:00 - 13:00' per domenica", () => {
    expect(getCourtHoursLabel(0)).toBe("07:00 - 13:00");
  });
});

// ─────────────────────────────────────────────
// validateRestrictedBookingHours
// ─────────────────────────────────────────────
// 2026-05-04 = lunedì (feriale), 2026-05-09 = sabato, 2026-05-10 = domenica

describe("validateRestrictedBookingHours", () => {
  it("ritorna null per una prenotazione feriale valida (09:00–10:00)", () => {
    const result = validateRestrictedBookingHours(
      "2026-05-04T07:00:00.000Z", // 09:00 CEST (UTC+2)
      "2026-05-04T08:00:00.000Z"  // 10:00 CEST
    );
    expect(result).toBeNull();
  });

  it("ritorna null per una prenotazione al limite orario feriale (07:00–20:30)", () => {
    const result = validateRestrictedBookingHours(
      "2026-05-04T05:00:00.000Z", // 07:00 CEST
      "2026-05-04T18:30:00.000Z"  // 20:30 CEST
    );
    expect(result).toBeNull();
  });

  it("ritorna errore per una prenotazione feriale fuori orario (troppo tardi)", () => {
    const result = validateRestrictedBookingHours(
      "2026-05-04T05:00:00.000Z", // 07:00 CEST
      "2026-05-04T19:00:00.000Z"  // 21:00 CEST — oltre 20:30
    );
    expect(result).not.toBeNull();
    expect(result).toContain("07:00 - 20:30");
  });

  it("ritorna errore per una prenotazione troppo mattiniera (prima apertura)", () => {
    const result = validateRestrictedBookingHours(
      "2026-05-04T03:00:00.000Z", // 05:00 CEST — prima delle 07:00
      "2026-05-04T07:00:00.000Z"  // 09:00 CEST
    );
    expect(result).not.toBeNull();
  });

  it("ritorna null per una prenotazione sabato valida (09:00–10:00)", () => {
    const result = validateRestrictedBookingHours(
      "2026-05-09T07:00:00.000Z", // 09:00 CEST (sabato)
      "2026-05-09T08:00:00.000Z"  // 10:00 CEST
    );
    expect(result).toBeNull();
  });

  it("ritorna errore per una prenotazione sabato oltre le 18:00", () => {
    const result = validateRestrictedBookingHours(
      "2026-05-09T07:00:00.000Z", // 09:00 CEST
      "2026-05-09T17:30:00.000Z"  // 19:30 CEST — oltre 18:00
    );
    expect(result).not.toBeNull();
    expect(result).toContain("07:00 - 18:00");
  });

  it("ritorna null per una prenotazione domenica valida (09:00–10:00)", () => {
    const result = validateRestrictedBookingHours(
      "2026-05-10T07:00:00.000Z", // 09:00 CEST (domenica)
      "2026-05-10T08:00:00.000Z"  // 10:00 CEST
    );
    expect(result).toBeNull();
  });

  it("ritorna errore per una prenotazione domenica oltre le 13:00", () => {
    const result = validateRestrictedBookingHours(
      "2026-05-10T07:00:00.000Z", // 09:00 CEST
      "2026-05-10T12:30:00.000Z"  // 14:30 CEST — oltre 13:00
    );
    expect(result).not.toBeNull();
    expect(result).toContain("07:00 - 13:00");
  });
});

// ─────────────────────────────────────────────
// parseItalyLocalToUTC
// ─────────────────────────────────────────────
describe("parseItalyLocalToUTC", () => {
  it("converte un orario CEST (UTC+2) correttamente", () => {
    // 10:00 ora italiana estiva = 08:00 UTC
    const result = parseItalyLocalToUTC("2026-05-04", 10, 0);
    expect(result).toBeInstanceOf(Date);
    expect(result.getUTCHours()).toBe(8);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it("restituisce sempre un oggetto Date", () => {
    const result = parseItalyLocalToUTC("2026-01-15", 9, 30);
    expect(result).toBeInstanceOf(Date);
  });

  it("gestisce la mezzanotte italiana", () => {
    // Mezzanotte ora italiana invernale (CET = UTC+1) = 23:00 UTC del giorno prima
    const result = parseItalyLocalToUTC("2026-01-15", 0, 0);
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });
});
