import { isAdminOrGestore, type UserRole } from "@/lib/roles";

/** Campi che un maestro può modificare: solo spostamento/ridimensionamento. */
export const BOOKING_MOVE_FIELDS = ["court", "start_time", "end_time"] as const;

export type BookingUpdateActor = {
  role?: string | null;
  userId: string;
};

export type BookingOwnership = {
  user_id: string;
  coach_id: string | null;
};

export type BookingUpdatePermission =
  | { allowed: false }
  | { allowed: true; moveOnly: boolean };

/**
 * Decide se un utente può aggiornare una prenotazione via PUT /api/bookings.
 *
 * - admin/gestore → modifica completa (`moveOnly: false`)
 * - maestro → SOLO se la prenotazione è sua (atleta prenotante o coach
 *   assegnato) e limitatamente allo spostamento/resize (`moveOnly: true`)
 * - qualsiasi altro ruolo → negato
 */
export function resolveBookingUpdatePermission(
  actor: BookingUpdateActor,
  booking: BookingOwnership
): BookingUpdatePermission {
  if (isAdminOrGestore(actor.role as UserRole | null | undefined)) {
    return { allowed: true, moveOnly: false };
  }

  const isOwnBooking =
    booking.user_id === actor.userId || booking.coach_id === actor.userId;

  if (actor.role === "maestro" && isOwnBooking) {
    return { allowed: true, moveOnly: true };
  }

  return { allowed: false };
}

/**
 * Restringe un payload di update ai soli campi di spostamento/resize,
 * scartando (senza copiarli) tutti gli altri.
 */
export function pickBookingMoveFields(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const moveOnly: Record<string, unknown> = {};
  for (const key of BOOKING_MOVE_FIELDS) {
    if (payload[key] !== undefined) moveOnly[key] = payload[key];
  }
  return moveOnly;
}
