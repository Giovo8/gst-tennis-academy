/**
 * @jest-environment node
 */

import { normalizeBookingMutation } from "@/lib/bookings/normalizeBookingMutation";

describe("normalizeBookingMutation", () => {
  it("forces active bookings to confirmed for the Vercel production path", () => {
    const normalized = normalizeBookingMutation({
      user_id: "user-123",
      court: "Campo 1",
      status: "pending",
      notes: "Test deploy",
    });

    expect(normalized).toMatchObject({
      user_id: "user-123",
      court: "Campo 1",
      status: "confirmed",
      coach_confirmed: true,
      manager_confirmed: true,
      notes: "Test deploy",
    });
  });

  it("preserves cancellation_requested while keeping confirmation flags aligned", () => {
    const normalized = normalizeBookingMutation({
      user_id: "user-123",
      status: "cancellation_requested",
    });

    expect(normalized.status).toBe("cancellation_requested");
    expect(normalized.coach_confirmed).toBe(true);
    expect(normalized.manager_confirmed).toBe(true);
  });

  it("preserves cancelled bookings", () => {
    const normalized = normalizeBookingMutation({
      user_id: "user-123",
      status: "cancelled",
    });

    expect(normalized.status).toBe("cancelled");
    expect(normalized.coach_confirmed).toBe(true);
    expect(normalized.manager_confirmed).toBe(true);
  });
});