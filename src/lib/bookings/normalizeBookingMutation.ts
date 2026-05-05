import { BOOKING_STATUS } from "@/lib/constants/app";

type BookingMutationFlags = {
  status: string;
  coach_confirmed: true;
  manager_confirmed: true;
};

export type NormalizedBookingMutation<T extends Record<string, unknown>> = Omit<
  T,
  keyof BookingMutationFlags
> &
  BookingMutationFlags;

export function normalizeBookingMutation<
  T extends Record<string, unknown> & { status?: string | null }
>(bookingData: T): NormalizedBookingMutation<T> {
  const normalizedStatus =
    bookingData.status === BOOKING_STATUS.CANCELLED || bookingData.status === BOOKING_STATUS.CANCELLATION_REQUESTED
      ? bookingData.status
      : BOOKING_STATUS.CONFIRMED;

  return {
    ...bookingData,
    status: normalizedStatus,
    coach_confirmed: true,
    manager_confirmed: true,
  } as NormalizedBookingMutation<T>;
}