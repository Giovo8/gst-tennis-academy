-- Add created_by column to bookings table to track who created each booking
-- This is particularly useful when staff (admin/gestore) creates bookings on behalf of athletes

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users ON DELETE SET NULL;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS bookings_created_by_idx ON public.bookings (created_by);

-- Backfill: for existing bookings, assume creator = user_id (the athlete who owns it)
UPDATE public.bookings SET created_by = user_id WHERE created_by IS NULL;
