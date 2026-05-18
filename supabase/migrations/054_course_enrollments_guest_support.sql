-- Migration 054: Support guest participants in course_enrollments
-- Make user_id nullable so guests (without a profile) can be enrolled

ALTER TABLE public.course_enrollments
  ALTER COLUMN user_id DROP NOT NULL;

-- Add guest_name column for non-registered participants
ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS guest_name text;

-- Add a check: either user_id or guest_name must be set
ALTER TABLE public.course_enrollments
  ADD CONSTRAINT check_enrollment_identity
  CHECK (user_id IS NOT NULL OR guest_name IS NOT NULL);
