-- ============================================
-- FIX: Add confirmation columns to bookings
-- ============================================
-- Run this query in your Supabase SQL Editor

-- Step 1: Add the missing columns
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS coach_confirmed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS manager_confirmed BOOLEAN DEFAULT FALSE;

-- Step 2: Update existing bookings
-- Set defaults based on current status
UPDATE public.bookings 
SET 
  coach_confirmed = CASE 
    WHEN status = 'confirmed' AND type != 'campo' THEN TRUE 
    WHEN type = 'campo' THEN TRUE  -- Campo bookings don't need coach confirmation
    ELSE FALSE 
  END,
  manager_confirmed = CASE 
    WHEN status = 'confirmed' THEN TRUE 
    WHEN status = 'pending' THEN FALSE
    ELSE FALSE 
  END;

-- Step 3: Set NOT NULL constraint after populating data
ALTER TABLE public.bookings 
  ALTER COLUMN coach_confirmed SET NOT NULL,
  ALTER COLUMN manager_confirmed SET NOT NULL;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS bookings_coach_confirmed_idx ON public.bookings (coach_confirmed);
CREATE INDEX IF NOT EXISTS bookings_manager_confirmed_idx ON public.bookings (manager_confirmed);

-- Step 5: Update status constraints to include new statuses
ALTER TABLE public.bookings 
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings 
  ADD CONSTRAINT bookings_status_check 
  CHECK (status IN (
    'pending', 
    'confirmed', 
    'cancelled', 
    'completed', 
    'rejected_by_coach', 
    'rejected_by_manager', 
    'confirmed_by_coach'
  ));

-- Step 6: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'bookings' 
  AND column_name IN ('coach_confirmed', 'manager_confirmed')
ORDER BY ordinal_position;

-- Success message
SELECT 'Bookings table updated successfully! Added coach_confirmed and manager_confirmed columns.' AS result;
