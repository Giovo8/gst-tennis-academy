-- COMPREHENSIVE FIX: Replace all recursive RLS policies with safe get_my_role() function
-- This fixes infinite recursion causing login errors and permission issues

-- The get_my_role() function should already exist from migration 016
-- If not, create it:
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================
-- BOOKINGS: Add admin/gestore view policy
-- ============================================
CREATE POLICY "Admins can view all bookings"
  ON public.bookings
  FOR SELECT
  USING (public.get_my_role() IN ('admin', 'gestore', 'maestro'));

CREATE POLICY "Admins can update all bookings"
  ON public.bookings
  FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'gestore'));

-- ============================================
-- RECRUITMENT_APPLICATIONS: Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Gestore/Admin can view applications" ON public.recruitment_applications;

CREATE POLICY "Gestore/Admin can view applications"
  ON public.recruitment_applications
  FOR SELECT
  USING (public.get_my_role() IN ('gestore', 'admin'));

-- ============================================
-- SERVICES: Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admin can manage services" ON public.services;

CREATE POLICY "Admin can manage services"
  ON public.services
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'gestore'));

-- ============================================
-- PRODUCTS: Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admin can manage products" ON public.products;

CREATE POLICY "Admin can manage products"
  ON public.products
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'gestore'));

-- ============================================
-- COURSES: Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admin and coaches can manage courses" ON public.courses;

CREATE POLICY "Admin and coaches can manage courses"
  ON public.courses
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'gestore', 'maestro'));

-- ============================================
-- ENROLLMENTS: Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Users can view their enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Users can update their enrollments" ON public.course_enrollments;

CREATE POLICY "Users can view their enrollments"
  ON public.course_enrollments
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR public.get_my_role() IN ('admin', 'gestore', 'maestro')
  );

CREATE POLICY "Users can update their enrollments"
  ON public.course_enrollments
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR public.get_my_role() IN ('admin', 'gestore', 'maestro')
  );

-- ============================================
-- EVENTS: Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admin can manage events" ON public.events;

CREATE POLICY "Admin can manage events"
  ON public.events
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'gestore'));

-- ============================================
-- EVENT_REGISTRATIONS: Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Users can view their registrations" ON public.event_registrations;

CREATE POLICY "Users can view their registrations"
  ON public.event_registrations
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR public.get_my_role() IN ('admin', 'gestore')
  );

-- ============================================
-- NEWS: Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admin can manage news" ON public.news;

CREATE POLICY "Admin can manage news"
  ON public.news
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'gestore'));

-- ============================================
-- TOURNAMENTS: Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admin and gestore can manage tournaments" ON public.tournaments;

CREATE POLICY "Admin and gestore can manage tournaments"
  ON public.tournaments
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'gestore', 'maestro'));

-- ============================================
-- TOURNAMENT_PARTICIPANTS: Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admin can manage participants" ON public.tournament_participants;

CREATE POLICY "Admin can manage participants"
  ON public.tournament_participants
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'gestore', 'maestro'));

-- ============================================
-- PAYMENTS: Fix recursion
-- ============================================
DROP POLICY IF EXISTS "System can create payments" ON public.payments;
DROP POLICY IF EXISTS "System can update payments" ON public.payments;

CREATE POLICY "Admins can view all payments"
  ON public.payments
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR public.get_my_role() IN ('admin', 'gestore')
  );

CREATE POLICY "System can create payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update payments"
  ON public.payments
  FOR UPDATE
  USING (true);

SELECT 'All RLS policies fixed - infinite recursion removed' AS result;
