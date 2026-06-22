-- Migration: allow pending bookings to co-exist on the same slot without conflict.
--
-- The original `bookings_no_overlap` constraint applied to ALL rows regardless of status,
-- which prevented inserting a pending booking if any other booking existed in that slot.
-- We replace it with a partial constraint that only enforces uniqueness for
-- "active" statuses (confirmed, cancellation_requested).
-- Pending, cancelled, and rejected bookings are intentionally excluded.

-- Drop the old unconditional constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;

-- Re-create as a partial constraint, ignoring pending / cancelled / rejected rows
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    court WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (status NOT IN ('pending', 'cancelled', 'rejected'));
