-- Migration 055: Support guest participants in lesson_attendance

-- Make user_id nullable
ALTER TABLE public.lesson_attendance
  ALTER COLUMN user_id DROP NOT NULL;

-- Add guest_name column
ALTER TABLE public.lesson_attendance
  ADD COLUMN IF NOT EXISTS guest_name text;

-- Drop old unique constraint and recreate as two partial unique indexes
ALTER TABLE public.lesson_attendance
  DROP CONSTRAINT IF EXISTS lesson_attendance_course_id_lesson_date_user_id_key;

-- Unique for registered users
CREATE UNIQUE INDEX IF NOT EXISTS lesson_attendance_registered_unique
  ON public.lesson_attendance (course_id, lesson_date, user_id)
  WHERE user_id IS NOT NULL;

-- Unique for guests
CREATE UNIQUE INDEX IF NOT EXISTS lesson_attendance_guest_unique
  ON public.lesson_attendance (course_id, lesson_date, guest_name)
  WHERE user_id IS NULL AND guest_name IS NOT NULL;

-- Add check: either user_id or guest_name must be set
ALTER TABLE public.lesson_attendance
  ADD CONSTRAINT check_attendance_identity
  CHECK (user_id IS NOT NULL OR guest_name IS NOT NULL);
