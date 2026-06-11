ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS lesson_instructor_overrides jsonb DEFAULT '{}'::jsonb;
