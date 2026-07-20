/**
 * @jest-environment node
 *
 * Test per l'autorizzazione dell'update prenotazioni (PUT /api/bookings).
 * Verifica che i maestri possano spostare SOLO le proprie prenotazioni e
 * limitatamente ai campi di spostamento/resize.
 */

import {
  resolveBookingUpdatePermission,
  pickBookingMoveFields,
} from "@/lib/bookings/bookingUpdateAuth";

const MAESTRO = "maestro-1";
const ATLETA = "atleta-1";
const ALTRO = "altro-1";

describe("resolveBookingUpdatePermission", () => {
  describe("admin / gestore", () => {
    it("permette all'admin la modifica completa (moveOnly: false)", () => {
      const result = resolveBookingUpdatePermission(
        { role: "admin", userId: ALTRO },
        { user_id: ATLETA, coach_id: MAESTRO }
      );
      expect(result).toEqual({ allowed: true, moveOnly: false });
    });

    it("permette al gestore la modifica completa", () => {
      const result = resolveBookingUpdatePermission(
        { role: "gestore", userId: ALTRO },
        { user_id: ATLETA, coach_id: null }
      );
      expect(result).toEqual({ allowed: true, moveOnly: false });
    });
  });

  describe("maestro", () => {
    it("permette lo spostamento se è il coach assegnato (moveOnly: true)", () => {
      const result = resolveBookingUpdatePermission(
        { role: "maestro", userId: MAESTRO },
        { user_id: ATLETA, coach_id: MAESTRO }
      );
      expect(result).toEqual({ allowed: true, moveOnly: true });
    });

    it("permette lo spostamento se è l'atleta prenotante", () => {
      const result = resolveBookingUpdatePermission(
        { role: "maestro", userId: MAESTRO },
        { user_id: MAESTRO, coach_id: null }
      );
      expect(result).toEqual({ allowed: true, moveOnly: true });
    });

    it("nega se la prenotazione non è sua", () => {
      const result = resolveBookingUpdatePermission(
        { role: "maestro", userId: MAESTRO },
        { user_id: ATLETA, coach_id: ALTRO }
      );
      expect(result).toEqual({ allowed: false });
    });
  });

  describe("altri ruoli", () => {
    it("nega all'atleta anche sulla propria prenotazione", () => {
      const result = resolveBookingUpdatePermission(
        { role: "atleta", userId: ATLETA },
        { user_id: ATLETA, coach_id: null }
      );
      expect(result).toEqual({ allowed: false });
    });

    it("nega se il ruolo è assente", () => {
      const result = resolveBookingUpdatePermission(
        { role: null, userId: ATLETA },
        { user_id: ATLETA, coach_id: null }
      );
      expect(result).toEqual({ allowed: false });
    });
  });
});

describe("pickBookingMoveFields", () => {
  it("tiene solo court/start_time/end_time", () => {
    const result = pickBookingMoveFields({
      court: "Campo 2",
      start_time: "2026-07-20T10:00:00Z",
      end_time: "2026-07-20T11:00:00Z",
      type: "campo",
      user_id: "hacker",
      coach_id: "hacker",
      status: "confirmed",
      notes: "iniezione",
    });
    expect(result).toEqual({
      court: "Campo 2",
      start_time: "2026-07-20T10:00:00Z",
      end_time: "2026-07-20T11:00:00Z",
    });
  });

  it("scarta i campi non presenti senza introdurre undefined", () => {
    const result = pickBookingMoveFields({ start_time: "2026-07-20T10:00:00Z" });
    expect(result).toEqual({ start_time: "2026-07-20T10:00:00Z" });
    expect(Object.prototype.hasOwnProperty.call(result, "court")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, "end_time")).toBe(false);
  });
});
