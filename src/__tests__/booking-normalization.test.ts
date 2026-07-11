/**
 * @jest-environment node
 */

import { normalizeBookingMutation } from "@/lib/bookings/normalizeBookingMutation";

describe("normalizeBookingMutation", () => {
  it("preserves pending status so unapproved private-lesson slots are not auto-confirmed", () => {
    const normalized = normalizeBookingMutation({
      user_id: "user-123",
      court: "Campo 1",
      status: "pending",
      notes: "Test deploy",
    });

    expect(normalized).toMatchObject({
      user_id: "user-123",
      court: "Campo 1",
      status: "pending",
      coach_confirmed: true,
      manager_confirmed: true,
      notes: "Test deploy",
    });
  });

  it("normalizes unknown/missing status to confirmed", () => {
    const normalized = normalizeBookingMutation({
      user_id: "user-123",
      court: "Campo 1",
    });

    expect(normalized.status).toBe("confirmed");
    expect(normalized.coach_confirmed).toBe(true);
    expect(normalized.manager_confirmed).toBe(true);
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