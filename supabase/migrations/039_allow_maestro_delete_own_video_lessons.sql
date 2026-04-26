-- Allow maestro to delete only video lessons they created.
-- Admin and gestore keep full delete rights.

DROP POLICY IF EXISTS "Admin can delete videos" ON public.video_lessons;
DROP POLICY IF EXISTS "Staff can delete videos" ON public.video_lessons;
DROP POLICY IF EXISTS "Coaches can delete their videos" ON public.video_lessons;

CREATE POLICY "Staff can delete videos"
  ON public.video_lessons
  FOR DELETE
  USING (
    public.get_my_role() IN ('admin', 'gestore')
    OR (
      public.get_my_role() = 'maestro'
      AND auth.uid() = created_by
    )
  );
