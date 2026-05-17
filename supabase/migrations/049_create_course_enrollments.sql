-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE (course_id, user_id)
);

-- Enable RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Admins/gestori/maestri can do everything
CREATE POLICY "Staff full access on course_enrollments"
  ON public.course_enrollments
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'gestore', 'maestro'))
  WITH CHECK (public.get_my_role() IN ('admin', 'gestore', 'maestro'));

-- Users can view their own enrollments
CREATE POLICY "Users can view their own enrollments"
  ON public.course_enrollments
  FOR SELECT
  USING (auth.uid() = user_id);
