/**
 * @jest-environment node
 * 
 * Test per la validazione delle prenotazioni
 * Logica di validazione estratta per testing unitario
 */

// ============================================
// Funzioni di validazione estratte dalla API
// ============================================

interface BookingData {
  user_id: string;
  court: string;
  start_time: string;
  end_time: string;
  coach_id?: string;
  type?: string;
  notes?: string;
}

interface ExistingBooking {
  id: string;
  court: string;
  start_time: string;
  end_time: string;
  status: string;
  manager_confirmed: boolean;
}

/**
 * Valida i campi obbligatori di una prenotazione
 */
export function validateBookingFields(booking: Partial<BookingData>): {
  valid: boolean;
  error?: string;
} {
  if (!booking.user_id) {
    return { valid: false, error: "user_id è obbligatorio" };
  }
  if (!booking.court) {
    return { valid: false, error: "court è obbligatorio" };
  }
  if (!booking.start_time) {
    return { valid: false, error: "start_time è obbligatorio" };
  }
  if (!booking.end_time) {
    return { valid: false, error: "end_time è obbligatorio" };
  }
  return { valid: true };
}

/**
 * Valida la regola delle 24 ore di anticipo
 */
export function validateAdvanceBooking(
  startTime: Date,
  now: Date,
  canBypass: boolean = false
): { valid: boolean; error?: string } {
  if (canBypass) {
    return { valid: true };
  }

  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (startTime < twentyFourHoursFromNow) {
    return {
      valid: false,
      error: "Le prenotazioni devono essere effettuate con almeno 24 ore di anticipo",
    };
  }

  return { valid: true };
}

/**
 * Verifica sovrapposizioni temporali tra due prenotazioni
 */
export function checkTimeOverlap(
  booking1Start: Date,
  booking1End: Date,
  booking2Start: Date,
  booking2End: Date
): boolean {
  return booking1Start < booking2End && booking1End > booking2Start;
}

/**
 * Trova conflitti tra una nuova prenotazione e prenotazioni esistenti
 */
export function findConflicts(
  newBooking: BookingData,
  existingBookings: ExistingBooking[]
): ExistingBooking[] {
  const newStart = new Date(newBooking.start_time);
  const newEnd = new Date(newBooking.end_time);

  return existingBookings.filter((existing) => {
    // Solo stessa corte
    if (existing.court !== newBooking.court) return false;

    // Solo prenotazioni confermate non cancellate
    if (existing.status === "cancelled") return false;
    if (!existing.manager_confirmed) return false;

    // Check sovrapposizione temporale
    const existingStart = new Date(existing.start_time);
    const existingEnd = new Date(existing.end_time);

    return checkTimeOverlap(newStart, newEnd, existingStart, existingEnd);
  });
}

/**
 * Valida un batch di prenotazioni
 */
export function validateBatchBookings(bookings: Partial<BookingData>[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
    return { valid: false, errors: ["Array di prenotazioni vuoto o non valido"] };
  }

  bookings.forEach((booking, index) => {
    const validation = validateBookingFields(booking);
    if (!validation.valid) {
      errors.push(`Prenotazione ${index + 1}: ${validation.error}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

// ============================================
// TESTS
// ============================================

describe("Booking Validation", () => {
  describe("validateBookingFields", () => {
    it("returns valid for complete booking data", () => {
      const booking: BookingData = {
        user_id: "user-123",
        court: "Campo 1",
        start_time: "2025-01-20T10:00:00Z",
        end_time: "2025-01-20T11:00:00Z",
      };

      expect(validateBookingFields(booking)).toEqual({ valid: true });
    });

    it("returns error when user_id is missing", () => {
      const booking = {
        court: "Campo 1",
        start_time: "2025-01-20T10:00:00Z",
        end_time: "2025-01-20T11:00:00Z",
      };

      expect(validateBookingFields(booking)).toEqual({
        valid: false,
        error: "user_id è obbligatorio",
      });
    });

    it("returns error when court is missing", () => {
      const booking = {
        user_id: "user-123",
        start_time: "2025-01-20T10:00:00Z",
        end_time: "2025-01-20T11:00:00Z",
      };

      expect(validateBookingFields(booking)).toEqual({
        valid: false,
        error: "court è obbligatorio",
      });
    });

    it("returns error when start_time is missing", () => {
      const booking = {
        user_id: "user-123",
        court: "Campo 1",
        end_time: "2025-01-20T11:00:00Z",
      };

      expect(validateBookingFields(booking)).toEqual({
        valid: false,
        error: "start_time è obbligatorio",
      });
    });

    it("returns error when end_time is missing", () => {
      const booking = {
        user_id: "user-123",
        court: "Campo 1",
        start_time: "2025-01-20T10:00:00Z",
      };

      expect(validateBookingFields(booking)).toEqual({
        valid: false,
        error: "end_time è obbligatorio",
      });
    });
  });

  describe("validateAdvanceBooking", () => {
    const now = new Date("2025-01-18T12:00:00Z");

    it("allows booking more than 24h in advance", () => {
      const startTime = new Date("2025-01-20T10:00:00Z"); // 46h ahead
      expect(validateAdvanceBooking(startTime, now)).toEqual({ valid: true });
    });

    it("rejects booking less than 24h in advance", () => {
      const startTime = new Date("2025-01-19T10:00:00Z"); // 22h ahead
      expect(validateAdvanceBooking(startTime, now)).toEqual({
        valid: false,
        error: "Le prenotazioni devono essere effettuate con almeno 24 ore di anticipo",
      });
    });

    it("allows admin/gestore to bypass 24h rule", () => {
      const startTime = new Date("2025-01-19T10:00:00Z"); // 22h ahead
      expect(validateAdvanceBooking(startTime, now, true)).toEqual({ valid: true });
    });

    it("rejects booking in the past", () => {
      const startTime = new Date("2025-01-17T10:00:00Z"); // in the past
      expect(validateAdvanceBooking(startTime, now)).toEqual({
        valid: false,
        error: "Le prenotazioni devono essere effettuate con almeno 24 ore di anticipo",
      });
    });

    it("allows exactly 24h in advance", () => {
      const startTime = new Date("2025-01-19T12:00:00Z"); // exactly 24h
      expect(validateAdvanceBooking(startTime, now)).toEqual({ valid: true });
    });
  });

  describe("checkTimeOverlap", () => {
    it("detects overlapping bookings", () => {
      // Booking 1: 10:00 - 11:00
      // Booking 2: 10:30 - 11:30
      const result = checkTimeOverlap(
        new Date("2025-01-20T10:00:00Z"),
        new Date("2025-01-20T11:00:00Z"),
        new Date("2025-01-20T10:30:00Z"),
        new Date("2025-01-20T11:30:00Z")
      );
      expect(result).toBe(true);
    });

    it("detects when booking2 is inside booking1", () => {
      // Booking 1: 10:00 - 12:00
      // Booking 2: 10:30 - 11:30
      const result = checkTimeOverlap(
        new Date("2025-01-20T10:00:00Z"),
        new Date("2025-01-20T12:00:00Z"),
        new Date("2025-01-20T10:30:00Z"),
        new Date("2025-01-20T11:30:00Z")
      );
      expect(result).toBe(true);
    });

    it("detects when booking1 is inside booking2", () => {
      // Booking 1: 10:30 - 11:30
      // Booking 2: 10:00 - 12:00
      const result = checkTimeOverlap(
        new Date("2025-01-20T10:30:00Z"),
        new Date("2025-01-20T11:30:00Z"),
        new Date("2025-01-20T10:00:00Z"),
        new Date("2025-01-20T12:00:00Z")
      );
      expect(result).toBe(true);
    });

    it("returns false for non-overlapping bookings", () => {
      // Booking 1: 10:00 - 11:00
      // Booking 2: 12:00 - 13:00
      const result = checkTimeOverlap(
        new Date("2025-01-20T10:00:00Z"),
        new Date("2025-01-20T11:00:00Z"),
        new Date("2025-01-20T12:00:00Z"),
        new Date("2025-01-20T13:00:00Z")
      );
      expect(result).toBe(false);
    });

    it("returns false for adjacent bookings (no gap)", () => {
      // Booking 1: 10:00 - 11:00
      // Booking 2: 11:00 - 12:00
      const result = checkTimeOverlap(
        new Date("2025-01-20T10:00:00Z"),
        new Date("2025-01-20T11:00:00Z"),
        new Date("2025-01-20T11:00:00Z"),
        new Date("2025-01-20T12:00:00Z")
      );
      expect(result).toBe(false);
    });
  });

  describe("findConflicts", () => {
    const existingBookings: ExistingBooking[] = [
      {
        id: "booking-1",
        court: "Campo 1",
        start_time: "2025-01-20T10:00:00Z",
        end_time: "2025-01-20T11:00:00Z",
        status: "confirmed",
        manager_confirmed: true,
      },
      {
        id: "booking-2",
        court: "Campo 1",
        start_time: "2025-01-20T14:00:00Z",
        end_time: "2025-01-20T15:00:00Z",
        status: "confirmed",
        manager_confirmed: true,
      },
      {
        id: "booking-3",
        court: "Campo 2",
        start_time: "2025-01-20T10:00:00Z",
        end_time: "2025-01-20T11:00:00Z",
        status: "confirmed",
        manager_confirmed: true,
      },
      {
        id: "booking-4",
        court: "Campo 1",
        start_time: "2025-01-20T16:00:00Z",
        end_time: "2025-01-20T17:00:00Z",
        status: "cancelled",
        manager_confirmed: true,
      },
      {
        id: "booking-5",
        court: "Campo 1",
        start_time: "2025-01-20T18:00:00Z",
        end_time: "2025-01-20T19:00:00Z",
        status: "pending",
        manager_confirmed: false, // Non confermato
      },
    ];

    it("finds conflicts with overlapping confirmed booking", () => {
      const newBooking: BookingData = {
        user_id: "user-123",
        court: "Campo 1",
        start_time: "2025-01-20T10:30:00Z",
        end_time: "2025-01-20T11:30:00Z",
      };

      const conflicts = findConflicts(newBooking, existingBookings);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe("booking-1");
    });

    it("returns no conflicts for different court", () => {
      const newBooking: BookingData = {
        user_id: "user-123",
        court: "Campo 3",
        start_time: "2025-01-20T10:00:00Z",
        end_time: "2025-01-20T11:00:00Z",
      };

      const conflicts = findConflicts(newBooking, existingBookings);
      expect(conflicts).toHaveLength(0);
    });

    it("ignores cancelled bookings", () => {
      const newBooking: BookingData = {
        user_id: "user-123",
        court: "Campo 1",
        start_time: "2025-01-20T16:00:00Z",
        end_time: "2025-01-20T17:00:00Z",
      };

      const conflicts = findConflicts(newBooking, existingBookings);
      expect(conflicts).toHaveLength(0);
    });

    it("ignores unconfirmed bookings", () => {
      const newBooking: BookingData = {
        user_id: "user-123",
        court: "Campo 1",
        start_time: "2025-01-20T18:00:00Z",
        end_time: "2025-01-20T19:00:00Z",
      };

      const conflicts = findConflicts(newBooking, existingBookings);
      expect(conflicts).toHaveLength(0);
    });

    it("returns no conflicts for available slot", () => {
      const newBooking: BookingData = {
        user_id: "user-123",
        court: "Campo 1",
        start_time: "2025-01-20T12:00:00Z",
        end_time: "2025-01-20T13:00:00Z",
      };

      const conflicts = findConflicts(newBooking, existingBookings);
      expect(conflicts).toHaveLength(0);
    });

    it("finds multiple conflicts", () => {
      // Una prenotazione che copre più slot
      const newBooking: BookingData = {
        user_id: "user-123",
        court: "Campo 1",
        start_time: "2025-01-20T09:00:00Z",
        end_time: "2025-01-20T15:30:00Z",
      };

      const conflicts = findConflicts(newBooking, existingBookings);
      expect(conflicts).toHaveLength(2); // booking-1 e booking-2
    });
  });

  describe("validateBatchBookings", () => {
    it("validates all bookings successfully", () => {
      const bookings: BookingData[] = [
        {
          user_id: "user-123",
          court: "Campo 1",
          start_time: "2025-01-20T10:00:00Z",
          end_time: "2025-01-20T11:00:00Z",
        },
        {
          user_id: "user-123",
          court: "Campo 1",
          start_time: "2025-01-20T11:00:00Z",
          end_time: "2025-01-20T12:00:00Z",
        },
      ];

      expect(validateBatchBookings(bookings)).toEqual({
        valid: true,
        errors: [],
      });
    });

    it("rejects empty array", () => {
      expect(validateBatchBookings([])).toEqual({
        valid: false,
        errors: ["Array di prenotazioni vuoto o non valido"],
      });
    });

    it("collects errors from multiple invalid bookings", () => {
      const bookings = [
        {
          court: "Campo 1",
          start_time: "2025-01-20T10:00:00Z",
          end_time: "2025-01-20T11:00:00Z",
        },
        {
          user_id: "user-123",
          start_time: "2025-01-20T11:00:00Z",
          end_time: "2025-01-20T12:00:00Z",
        },
      ];

      const result = validateBatchBookings(bookings);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain("user_id è obbligatorio");
      expect(result.errors[1]).toContain("court è obbligatorio");
    });

    it("handles mixed valid and invalid bookings", () => {
      const bookings = [
        {
          user_id: "user-123",
          court: "Campo 1",
          start_time: "2025-01-20T10:00:00Z",
          end_time: "2025-01-20T11:00:00Z",
        },
        {
          user_id: "user-123",
          court: "Campo 1",
          // missing times
        },
      ];

      const result = validateBatchBookings(bookings);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });
});
