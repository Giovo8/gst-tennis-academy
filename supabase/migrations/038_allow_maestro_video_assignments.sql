-- Allow maestros to manage video assignments they create
-- Keeps admin/gestore full access and user self-visibility

ALTER TABLE public.video_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and gestori can view all video assignments" ON public.video_assignments;
DROP POLICY IF EXISTS "Admins and gestori can insert video assignments" ON public.video_assignments;
DROP POLICY IF EXISTS "Admins and gestori can delete video assignments" ON public.video_assignments;
DROP POLICY IF EXISTS "Users can view their own video assignments" ON public.video_assignments;

CREATE POLICY "video_assignments_select_policy"
  ON public.video_assignments
  FOR SELECT
  USING (
    public.get_my_role() IN ('admin', 'gestore')
    OR user_id = auth.uid()
    OR assigned_by = auth.uid()
  );

CREATE POLICY "video_assignments_insert_policy"
  ON public.video_assignments
  FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('admin', 'gestore', 'maestro')
    AND assigned_by = auth.uid()
  );

CREATE POLICY "video_assignments_delete_policy"
  ON public.video_assignments
  FOR DELETE
  USING (
    public.get_my_role() IN ('admin', 'gestore')
    OR assigned_by = auth.uid()
  );
