-- Add coach_notes table for instructors to keep notes about students
CREATE TABLE IF NOT EXISTS public.coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.coach_notes ENABLE ROW LEVEL SECURITY;

-- Coaches can view and manage their own notes
CREATE POLICY "Coaches can view their own notes"
  ON public.coach_notes
  FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert their own notes"
  ON public.coach_notes
  FOR INSERT
  WITH CHECK (auth.uid() = coach_id AND public.get_my_role() = 'maestro');

CREATE POLICY "Coaches can update their own notes"
  ON public.coach_notes
  FOR UPDATE
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own notes"
  ON public.coach_notes
  FOR DELETE
  USING (auth.uid() = coach_id);

-- Admins can view all notes
CREATE POLICY "Admins can view all notes"
  ON public.coach_notes
  FOR SELECT
  USING (public.get_my_role() IN ('admin', 'gestore'));

-- Create indexes
CREATE INDEX coach_notes_coach_id_idx ON public.coach_notes(coach_id);
CREATE INDEX coach_notes_student_id_idx ON public.coach_notes(student_id);
CREATE INDEX coach_notes_created_at_idx ON public.coach_notes(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_coach_notes_updated_at
  BEFORE UPDATE ON public.coach_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.coach_notes IS 'Notes that coaches write about their students progress and observations';
