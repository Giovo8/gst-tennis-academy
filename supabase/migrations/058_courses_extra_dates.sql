ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS extra_dates text[] DEFAULT '{}';
