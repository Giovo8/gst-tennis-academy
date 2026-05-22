ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users ON DELETE SET NULL;
