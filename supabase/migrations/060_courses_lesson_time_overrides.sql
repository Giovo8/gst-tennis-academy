ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS lesson_time_overrides jsonb DEFAULT '{}'::jsonb;
