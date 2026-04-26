-- Add notes column to video_lessons for internal admin notes.
-- This migration is idempotent and safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'video_lessons'
      AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.video_lessons
      ADD COLUMN notes TEXT;
  END IF;
EXCEPTION
  WHEN duplicate_column THEN
    -- Safe guard for concurrent/replayed execution
    NULL;
END $$;

COMMENT ON COLUMN public.video_lessons.notes IS 'Internal notes visible only to admins/gestori';
