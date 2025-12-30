-- Fix RLS policies for announcements table
-- Drop ALL old policies with CASCADE
DROP POLICY IF EXISTS "announcements_select_public" ON announcements CASCADE;
DROP POLICY IF EXISTS "announcements_select_admin" ON announcements CASCADE;
DROP POLICY IF EXISTS "announcements_insert_admin" ON announcements CASCADE;
DROP POLICY IF EXISTS "announcements_update_admin" ON announcements CASCADE;
DROP POLICY IF EXISTS "announcements_delete_admin" ON announcements CASCADE;
DROP POLICY IF EXISTS "Users can view published announcements" ON announcements CASCADE;
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements CASCADE;
DROP POLICY IF EXISTS "announcements_view_policy" ON announcements CASCADE;
DROP POLICY IF EXISTS "announcements_admin_policy" ON announcements CASCADE;

-- Try also with public schema prefix
DROP POLICY IF EXISTS "Users can view published announcements" ON public.announcements CASCADE;
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements CASCADE;
DROP POLICY IF EXISTS "announcements_view_policy" ON public.announcements CASCADE;
DROP POLICY IF EXISTS "announcements_admin_policy" ON public.announcements CASCADE;

-- Create corrected policies using 'role' instead of 'user_role'

-- Users can view published announcements
CREATE POLICY "announcements_view_policy"
  ON announcements FOR SELECT
  USING (
    is_published = true OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'gestore')
    )
  );

-- Admins can manage announcements (INSERT, UPDATE, DELETE)
CREATE POLICY "announcements_admin_policy"
  ON announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'gestore')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'gestore')
    )
  );
