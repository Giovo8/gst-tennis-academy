export const BOOKING_DELETE_SNAPSHOT_FIELDS = "user_id, coach_id, court, type, start_time, end_time, notes";

export function getBookingDeletionMode(
  bookingType?: string | null,
  participantCount: number = 0
): "singolo" | "doppio" | undefined {
  if (bookingType !== "campo") {
    return undefined;
  }

  return participantCount > 2 ? "doppio" : "singolo";
}