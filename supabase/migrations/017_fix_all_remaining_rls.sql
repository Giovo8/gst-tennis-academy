-- Migration 017: Fix all remaining RLS recursion and add missing admin policies
-- This ensures admins/gestores can view and manage all resources

-- Add admin/gestore/maestro policies for bookings
CREATE POLICY "Admins can view all bookings"
  ON public.bookings
  FOR SELECT
  USING (public.get_my_role() IN ('admin', 'gestore', 'maestro'));

CREATE POLICY "Admins can update all bookings"
  ON public.bookings
  FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'gestore'));

-- Fix enrollments (not course_enrollments)
DROP POLICY IF EXISTS "Users can view their enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update their enrollments" ON public.enrollments;

CREATE POLICY "Users can view their enrollments"
  ON public.enrollments
  FOR SELECT
  USING (auth.uid() = user_id OR public.get_my_role() IN ('gestore', 'admin', 'maestro'));

CREATE POLICY "Users can update their enrollments"
  ON public.enrollments
  FOR UPDATE
  USING (auth.uid() = user_id OR public.get_my_role() IN ('gestore', 'admin'));

-- Fix payments system update
DROP POLICY IF EXISTS "System can update payments" ON public.payments;

CREATE POLICY "System can update payments"
  ON public.payments
  FOR UPDATE
  USING (public.get_my_role() IN ('gestore', 'admin'));

SELECT 'Migration 017: All RLS policies fixed and admin access enabled' AS status;
