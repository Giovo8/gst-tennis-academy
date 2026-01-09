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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Admins can view all bookings'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT USING (public.get_my_role() IN (''admin'', ''gestore'', ''maestro''))';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Admins can update all bookings'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update all bookings" ON public.bookings FOR UPDATE USING (public.get_my_role() IN (''admin'', ''gestore''))';
  END IF;
END $$;

-- ============================================
-- RECRUITMENT_APPLICATIONS: Fix recursion (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recruitment_applications') THEN
    DROP POLICY IF EXISTS "Gestore/Admin can view applications" ON public.recruitment_applications;
    EXECUTE 'CREATE POLICY "Gestore/Admin can view applications" ON public.recruitment_applications FOR SELECT USING (public.get_my_role() IN (''gestore'', ''admin''))';
  END IF;
END $$;

-- ============================================
-- SERVICES: Fix recursion (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'services') THEN
    DROP POLICY IF EXISTS "Admin can manage services" ON public.services;
    EXECUTE 'CREATE POLICY "Admin can manage services" ON public.services FOR ALL USING (public.get_my_role() IN (''admin'', ''gestore''))';
  END IF;
END $$;

-- ============================================
-- PRODUCTS: Fix recursion (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    DROP POLICY IF EXISTS "Admin can manage products" ON public.products;
    EXECUTE 'CREATE POLICY "Admin can manage products" ON public.products FOR ALL USING (public.get_my_role() IN (''admin'', ''gestore''))';
  END IF;
END $$;

-- ============================================
-- COURSES: Fix recursion (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'courses') THEN
    DROP POLICY IF EXISTS "Admin and coaches can manage courses" ON public.courses;
    EXECUTE 'CREATE POLICY "Admin and coaches can manage courses" ON public.courses FOR ALL USING (public.get_my_role() IN (''admin'', ''gestore'', ''maestro''))';
  END IF;
END $$;

-- ============================================
-- COURSE_ENROLLMENTS: Fix recursion (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_enrollments') THEN
    DROP POLICY IF EXISTS "Users can view their enrollments" ON public.course_enrollments;
    DROP POLICY IF EXISTS "Users can update their enrollments" ON public.course_enrollments;
    EXECUTE 'CREATE POLICY "Users can view their enrollments" ON public.course_enrollments FOR SELECT USING (auth.uid() = user_id OR public.get_my_role() IN (''admin'', ''gestore'', ''maestro''))';
    EXECUTE 'CREATE POLICY "Users can update their enrollments" ON public.course_enrollments FOR UPDATE USING (auth.uid() = user_id OR public.get_my_role() IN (''admin'', ''gestore'', ''maestro''))';
  END IF;
END $$;

-- ============================================
-- ENROLLMENTS: Fix recursion (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'enrollments') THEN
    DROP POLICY IF EXISTS "Users can view their enrollments" ON public.enrollments;
    DROP POLICY IF EXISTS "Users can update their enrollments" ON public.enrollments;
    EXECUTE 'CREATE POLICY "Users can view their enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id OR public.get_my_role() IN (''admin'', ''gestore'', ''maestro''))';
    EXECUTE 'CREATE POLICY "Users can update their enrollments" ON public.enrollments FOR UPDATE USING (auth.uid() = user_id OR public.get_my_role() IN (''admin'', ''gestore''))';
  END IF;
END $$;

-- ============================================
-- EVENTS: Fix recursion (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
    DROP POLICY IF EXISTS "Admin can manage events" ON public.events;
    EXECUTE 'CREATE POLICY "Admin can manage events" ON public.events FOR ALL USING (public.get_my_role() IN (''admin'', ''gestore''))';
  END IF;
END $$;

-- ============================================
-- EVENT_REGISTRATIONS: Fix recursion (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_registrations') THEN
    DROP POLICY IF EXISTS "Users can view their registrations" ON public.event_registrations;
    EXECUTE 'CREATE POLICY "Users can view their registrations" ON public.event_registrations FOR SELECT USING (auth.uid() = user_id OR public.get_my_role() IN (''admin'', ''gestore''))';
  END IF;
END $$;

-- ============================================
-- NEWS: Fix recursion (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'news') THEN
    DROP POLICY IF EXISTS "Admin can manage news" ON public.news;
    EXECUTE 'CREATE POLICY "Admin can manage news" ON public.news FOR ALL USING (public.get_my_role() IN (''admin'', ''gestore''))';
  END IF;
END $$;

-- ============================================
-- TOURNAMENTS: Fix recursion (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournaments') THEN
    DROP POLICY IF EXISTS "Admin and gestore can manage tournaments" ON public.tournaments;
    EXECUTE 'CREATE POLICY "Admin and gestore can manage tournaments" ON public.tournaments FOR ALL USING (public.get_my_role() IN (''admin'', ''gestore'', ''maestro''))';
  END IF;
END $$;

-- ============================================
-- TOURNAMENT_PARTICIPANTS: Fix recursion (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_participants') THEN
    DROP POLICY IF EXISTS "Admin can manage participants" ON public.tournament_participants;
    EXECUTE 'CREATE POLICY "Admin can manage participants" ON public.tournament_participants FOR ALL USING (public.get_my_role() IN (''admin'', ''gestore'', ''maestro''))';
  END IF;
END $$;

-- ============================================
-- PAYMENTS: Fix recursion (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    DROP POLICY IF EXISTS "System can create payments" ON public.payments;
    DROP POLICY IF EXISTS "System can update payments" ON public.payments;
    DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
    EXECUTE 'CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (auth.uid() = user_id OR public.get_my_role() IN (''admin'', ''gestore''))';
    EXECUTE 'CREATE POLICY "System can create payments" ON public.payments FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "System can update payments" ON public.payments FOR UPDATE USING (true)';
  END IF;
END $$;

SELECT 'All RLS policies fixed - infinite recursion removed' AS result;
