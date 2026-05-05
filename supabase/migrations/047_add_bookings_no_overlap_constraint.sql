-- Migration 047: Add partial EXCLUDE constraint to prevent overlapping active bookings.
--
-- This constraint ensures no two ACTIVE bookings can occupy the same court at the
-- same time. Cancelled, rejected, and cancellation_requested bookings are excluded
-- so that slots can be re-booked after cancellation/rejection.
--
-- NOTE: If existing overlapping active bookings are found, the migration will emit a
-- WARNING but will NOT fail. Fix the overlaps manually and then re-run:
--   ALTER TABLE public.bookings VALIDATE CONSTRAINT bookings_no_overlap;

-- Ensure btree_gist extension is available (required for EXCLUDE with tstzrange)
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  -- Only add the constraint if it does not already exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_no_overlap'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    -- Check for pre-existing overlaps among active bookings
    IF EXISTS (
      SELECT 1
      FROM public.bookings b1
      JOIN public.bookings b2
        ON b1.id < b2.id
       AND b1.court = b2.court
       AND tstzrange(b1.start_time, b1.end_time) && tstzrange(b2.start_time, b2.end_time)
      WHERE b1.status NOT IN ('cancelled', 'rejected', 'cancellation_requested')
        AND b2.status NOT IN ('cancelled', 'rejected', 'cancellation_requested')
      LIMIT 1
    ) THEN
      RAISE WARNING
        'bookings_no_overlap constraint NOT added: overlapping active bookings exist. '
        'Fix the overlaps first, then re-run this migration.';
    ELSE
      ALTER TABLE public.bookings
        ADD CONSTRAINT bookings_no_overlap
        EXCLUDE USING gist (
          court WITH =,
          tstzrange(start_time, end_time) WITH &&
        )
        WHERE (status NOT IN ('cancelled', 'rejected', 'cancellation_requested'));

      RAISE NOTICE 'bookings_no_overlap constraint added successfully.';
    END IF;
  ELSE
    RAISE NOTICE 'bookings_no_overlap constraint already exists, skipping.';
  END IF;
END $$;
