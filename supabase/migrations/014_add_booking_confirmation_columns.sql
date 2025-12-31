-- Add confirmation columns to bookings table
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS coach_confirmed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS manager_confirmed BOOLEAN DEFAULT FALSE;

-- Update existing bookings based on their status
-- Confirmed bookings should have both confirmations
UPDATE public.bookings 
SET 
  coach_confirmed = CASE 
    WHEN status = 'confirmed' AND type != 'campo' THEN TRUE 
    WHEN type = 'campo' THEN TRUE  -- Campo bookings don't need coach confirmation
    ELSE FALSE 
  END,
  manager_confirmed = CASE 
    WHEN status = 'confirmed' THEN TRUE 
    ELSE FALSE 
  END
WHERE coach_confirmed IS NULL OR manager_confirmed IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS bookings_coach_confirmed_idx ON public.bookings (coach_confirmed);
CREATE INDEX IF NOT EXISTS bookings_manager_confirmed_idx ON public.bookings (manager_confirmed);

-- Update status constraints to include new statuses used in the app
ALTER TABLE public.bookings 
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings 
  ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'rejected_by_coach', 'rejected_by_manager', 'confirmed_by_coach'));

SELECT 'Migration 014: Added coach_confirmed and manager_confirmed columns to bookings table' AS status;
