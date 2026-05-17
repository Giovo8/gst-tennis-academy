-- Migration 050: Create lesson_attendance table
-- Stores per-lesson attendance records for course participants

CREATE TABLE IF NOT EXISTS public.lesson_attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_date date NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  present boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (course_id, lesson_date, user_id)
);

ALTER TABLE public.lesson_attendance ENABLE ROW LEVEL SECURITY;

-- Staff (admin, gestore, maestro) can read and write all attendance records
CREATE POLICY "Staff full access on lesson_attendance"
  ON public.lesson_attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'gestore', 'maestro')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'gestore', 'maestro')
    )
  );

-- Athletes can view their own attendance
CREATE POLICY "Athletes can view own attendance"
  ON public.lesson_attendance
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
