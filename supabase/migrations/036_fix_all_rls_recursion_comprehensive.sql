-- ==========================================================================
-- Migration 036: COMPREHENSIVE FIX - Replace all recursive RLS policies
-- ==========================================================================
-- Problem: Many policies query `profiles` table directly in subqueries,
-- causing infinite recursion when profiles table has RLS enabled.
--
-- Solution: Replace all `EXISTS (SELECT 1 FROM profiles WHERE ...)` patterns
-- with the safe `public.get_my_role()` SECURITY DEFINER function that
-- bypasses RLS on the profiles table.
--
-- Tables affected:
--   - tournaments (from 002)
--   - tournament_participants (from 002)
--   - conversations (from 005)
--   - conversation_participants (from 005)
--   - messages (from 005) - update/delete only
--   - email_logs (from 007b)
--   - email_templates (from 007b)
--   - email_settings (from 007b)
--   - email_unsubscribes (from 007b)
--   - tournament_groups (from 010)
--   - tournament_matches (from 010)
--   - profiles (from 015 - self-referencing)
--   - promo_banner_settings (from 021)
--   - email_campaigns (from 023)
--   - activity_log (from 024)
--   - email_log (from 025)
--   - courts_settings (from 026)
--   - video_assignments (from 027)
--   - staff (from FIX_STAFF_RLS script)
--   - course_sections (from FIX_COURSES_POLICY script)
-- ==========================================================================

-- Ensure get_my_role() exists and is up to date
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()),
    'atleta'
  );
$$;

-- ==========================================================================
-- 1. TOURNAMENTS (from migration 002)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournaments') THEN
    DROP POLICY IF EXISTS "select_public_owner_manager" ON public.tournaments;
    DROP POLICY IF EXISTS "manage_tournaments_by_owner_or_role" ON public.tournaments;

    CREATE POLICY "select_public_owner_manager" ON public.tournaments
      FOR SELECT USING (
        status = 'Aperto'
        OR auth.uid() = created_by
        OR public.get_my_role() IN ('gestore', 'admin')
      );

    CREATE POLICY "manage_tournaments_by_owner_or_role" ON public.tournaments
      FOR ALL USING (
        auth.uid() = created_by
        OR public.get_my_role() IN ('gestore', 'admin')
      )
      WITH CHECK (
        auth.uid() = created_by
        OR public.get_my_role() IN ('gestore', 'admin')
      );
  END IF;
END $$;

-- ==========================================================================
-- 2. TOURNAMENT_PARTICIPANTS (from migration 002)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_participants') THEN
    DROP POLICY IF EXISTS "select_own_participations" ON public.tournament_participants;
    DROP POLICY IF EXISTS "delete_participation_owner_or_role" ON public.tournament_participants;

    CREATE POLICY "select_own_participations" ON public.tournament_participants
      FOR SELECT USING (
        auth.uid() = user_id
        OR public.get_my_role() IN ('gestore', 'admin')
      );

    CREATE POLICY "delete_participation_owner_or_role" ON public.tournament_participants
      FOR DELETE USING (
        auth.uid() = user_id
        OR public.get_my_role() IN ('gestore', 'admin')
      );
  END IF;
END $$;

-- ==========================================================================
-- 3. CONVERSATIONS (from migration 005)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    DROP POLICY IF EXISTS "conversations_select_admin" ON public.conversations;
    DROP POLICY IF EXISTS "conversations_update_participants" ON public.conversations;
    DROP POLICY IF EXISTS "conversations_delete_creator_admin" ON public.conversations;

    -- Admin/gestore can view all conversations
    CREATE POLICY "conversations_select_admin" ON public.conversations
      FOR SELECT USING (
        public.get_my_role() IN ('admin', 'gestore')
      );

    -- Participants and admin can update conversations
    CREATE POLICY "conversations_update_participants" ON public.conversations
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM conversation_participants
          WHERE conversation_participants.conversation_id = conversations.id
          AND conversation_participants.user_id = auth.uid()
        )
        OR public.get_my_role() IN ('admin', 'gestore')
      );

    -- Only creator or admin can delete conversations
    CREATE POLICY "conversations_delete_creator_admin" ON public.conversations
      FOR DELETE USING (
        conversations.created_by = auth.uid()
        OR public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 4. CONVERSATION_PARTICIPANTS (from migration 005)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_participants') THEN
    DROP POLICY IF EXISTS "conversation_participants_select" ON public.conversation_participants;
    DROP POLICY IF EXISTS "conversation_participants_update_own" ON public.conversation_participants;
    DROP POLICY IF EXISTS "conversation_participants_delete_own" ON public.conversation_participants;

    -- Users can view participants of conversations they're in, or admin
    CREATE POLICY "conversation_participants_select" ON public.conversation_participants
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM conversation_participants cp
          WHERE cp.conversation_id = conversation_participants.conversation_id
          AND cp.user_id = auth.uid()
        )
        OR public.get_my_role() IN ('admin', 'gestore')
      );

    -- Users can update their own participant record, or admin
    CREATE POLICY "conversation_participants_update_own" ON public.conversation_participants
      FOR UPDATE USING (
        conversation_participants.user_id = auth.uid()
        OR public.get_my_role() IN ('admin', 'gestore')
      );

    -- Users can leave conversations, or admin can remove
    CREATE POLICY "conversation_participants_delete_own" ON public.conversation_participants
      FOR DELETE USING (
        conversation_participants.user_id = auth.uid()
        OR public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 5. MESSAGES - update/delete only (from migration 005)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
    DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;

    CREATE POLICY "messages_update_own" ON public.messages
      FOR UPDATE USING (
        messages.sender_id = auth.uid()
        OR public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "messages_delete_own" ON public.messages
      FOR DELETE USING (
        messages.sender_id = auth.uid()
        OR public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 6. EMAIL_LOGS (from migration 007b)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_logs') THEN
    DROP POLICY IF EXISTS "email_logs_select_admin" ON public.email_logs;
    DROP POLICY IF EXISTS "email_logs_insert_admin" ON public.email_logs;
    DROP POLICY IF EXISTS "email_logs_update_admin" ON public.email_logs;

    CREATE POLICY "email_logs_select_admin" ON public.email_logs
      FOR SELECT USING (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "email_logs_insert_admin" ON public.email_logs
      FOR INSERT WITH CHECK (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "email_logs_update_admin" ON public.email_logs
      FOR UPDATE USING (
        public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 7. EMAIL_TEMPLATES (from migration 007b)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_templates') THEN
    DROP POLICY IF EXISTS "email_templates_select_admin" ON public.email_templates;
    DROP POLICY IF EXISTS "email_templates_insert_admin" ON public.email_templates;
    DROP POLICY IF EXISTS "email_templates_update_admin" ON public.email_templates;
    DROP POLICY IF EXISTS "email_templates_delete_admin" ON public.email_templates;

    CREATE POLICY "email_templates_select_admin" ON public.email_templates
      FOR SELECT USING (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "email_templates_insert_admin" ON public.email_templates
      FOR INSERT WITH CHECK (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "email_templates_update_admin" ON public.email_templates
      FOR UPDATE USING (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "email_templates_delete_admin" ON public.email_templates
      FOR DELETE USING (
        public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 8. EMAIL_SETTINGS (from migration 007b)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_settings') THEN
    DROP POLICY IF EXISTS "email_settings_select_admin" ON public.email_settings;
    DROP POLICY IF EXISTS "email_settings_all_admin" ON public.email_settings;

    CREATE POLICY "email_settings_select_admin" ON public.email_settings
      FOR SELECT USING (
        public.get_my_role() = 'admin'
      );

    CREATE POLICY "email_settings_all_admin" ON public.email_settings
      FOR ALL USING (
        public.get_my_role() = 'admin'
      );
  END IF;
END $$;

-- ==========================================================================
-- 9. EMAIL_UNSUBSCRIBES (from migration 007b)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_unsubscribes') THEN
    DROP POLICY IF EXISTS "email_unsubscribes_select_admin" ON public.email_unsubscribes;

    CREATE POLICY "email_unsubscribes_select_admin" ON public.email_unsubscribes
      FOR SELECT USING (
        public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 10. TOURNAMENT_GROUPS (from migration 010)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_groups') THEN
    DROP POLICY IF EXISTS "tournament_groups_insert" ON public.tournament_groups;
    DROP POLICY IF EXISTS "tournament_groups_update" ON public.tournament_groups;

    CREATE POLICY "tournament_groups_insert" ON public.tournament_groups
      FOR INSERT WITH CHECK (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "tournament_groups_update" ON public.tournament_groups
      FOR UPDATE USING (
        public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 11. TOURNAMENT_MATCHES (from migration 010)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_matches') THEN
    DROP POLICY IF EXISTS "tournament_matches_insert" ON public.tournament_matches;
    DROP POLICY IF EXISTS "tournament_matches_update" ON public.tournament_matches;

    CREATE POLICY "tournament_matches_insert" ON public.tournament_matches
      FOR INSERT WITH CHECK (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "tournament_matches_update" ON public.tournament_matches
      FOR UPDATE USING (
        public.get_my_role() IN ('admin', 'gestore', 'maestro')
      );
  END IF;
END $$;

-- ==========================================================================
-- 12. PROFILES - self-referencing fix (from migration 015)
-- The "Coaches can view athlete profiles" policy from 015 queries profiles
-- inside a policy ON profiles — classic self-referencing loop.
-- Migration 016 already fixed this, but 015 may have re-created it.
-- ==========================================================================
DO $$
BEGIN
  -- Drop the unsafe version (from 015)
  DROP POLICY IF EXISTS "Coaches can view athlete profiles" ON public.profiles;

  -- Recreate with safe function (idempotent with 016)
  CREATE POLICY "Coaches can view athlete profiles" ON public.profiles
    FOR SELECT USING (
      auth.uid() IS NOT NULL
      AND public.get_my_role() IN ('maestro', 'admin', 'gestore')
      AND role = 'atleta'
    );
END $$;

-- ==========================================================================
-- 13. PROMO_BANNER_SETTINGS (from migration 021)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'promo_banner_settings') THEN
    DROP POLICY IF EXISTS "promo_banner_settings_update_admin" ON public.promo_banner_settings;

    CREATE POLICY "promo_banner_settings_update_admin" ON public.promo_banner_settings
      FOR UPDATE USING (
        public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 14. EMAIL_CAMPAIGNS (from migration 023)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_campaigns') THEN
    DROP POLICY IF EXISTS "email_campaigns_select_admin" ON public.email_campaigns;
    DROP POLICY IF EXISTS "email_campaigns_insert_admin" ON public.email_campaigns;
    DROP POLICY IF EXISTS "email_campaigns_update_admin" ON public.email_campaigns;
    DROP POLICY IF EXISTS "email_campaigns_delete_admin" ON public.email_campaigns;

    CREATE POLICY "email_campaigns_select_admin" ON public.email_campaigns
      FOR SELECT USING (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "email_campaigns_insert_admin" ON public.email_campaigns
      FOR INSERT WITH CHECK (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "email_campaigns_update_admin" ON public.email_campaigns
      FOR UPDATE USING (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "email_campaigns_delete_admin" ON public.email_campaigns
      FOR DELETE USING (
        public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 15. ACTIVITY_LOG (from migration 024)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_log') THEN
    DROP POLICY IF EXISTS "activity_log_select_admin" ON public.activity_log;

    CREATE POLICY "activity_log_select_admin" ON public.activity_log
      FOR SELECT USING (
        public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 16. EMAIL_LOG (from migration 025)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_log') THEN
    DROP POLICY IF EXISTS "email_log_select_admin" ON public.email_log;

    CREATE POLICY "email_log_select_admin" ON public.email_log
      FOR SELECT USING (
        public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 17. COURTS_SETTINGS (from migration 026)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'courts_settings') THEN
    DROP POLICY IF EXISTS "courts_settings_insert_admin" ON public.courts_settings;
    DROP POLICY IF EXISTS "courts_settings_update_admin" ON public.courts_settings;
    DROP POLICY IF EXISTS "courts_settings_delete_admin" ON public.courts_settings;

    CREATE POLICY "courts_settings_insert_admin" ON public.courts_settings
      FOR INSERT WITH CHECK (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "courts_settings_update_admin" ON public.courts_settings
      FOR UPDATE USING (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "courts_settings_delete_admin" ON public.courts_settings
      FOR DELETE USING (
        public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 18. VIDEO_ASSIGNMENTS (from migration 027)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'video_assignments') THEN
    DROP POLICY IF EXISTS "Admins and gestori can view all video assignments" ON public.video_assignments;
    DROP POLICY IF EXISTS "Admins and gestori can insert video assignments" ON public.video_assignments;
    DROP POLICY IF EXISTS "Admins and gestori can delete video assignments" ON public.video_assignments;

    CREATE POLICY "Admins and gestori can view all video assignments" ON public.video_assignments
      FOR SELECT USING (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "Admins and gestori can insert video assignments" ON public.video_assignments
      FOR INSERT WITH CHECK (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "Admins and gestori can delete video assignments" ON public.video_assignments
      FOR DELETE USING (
        public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 19. STAFF (from FIX_STAFF_RLS script, if applied)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff') THEN
    DROP POLICY IF EXISTS "Admin can view all staff" ON public.staff;
    DROP POLICY IF EXISTS "Admin can insert staff" ON public.staff;
    DROP POLICY IF EXISTS "Admin can update staff" ON public.staff;
    DROP POLICY IF EXISTS "Admin can delete staff" ON public.staff;

    CREATE POLICY "Admin can view all staff" ON public.staff
      FOR SELECT USING (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "Admin can insert staff" ON public.staff
      FOR INSERT WITH CHECK (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "Admin can update staff" ON public.staff
      FOR UPDATE USING (
        public.get_my_role() IN ('admin', 'gestore')
      );

    CREATE POLICY "Admin can delete staff" ON public.staff
      FOR DELETE USING (
        public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- 20. COURSE_SECTIONS (from FIX_COURSES_POLICY script, if applied)
-- ==========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_sections') THEN
    DROP POLICY IF EXISTS "Allow admin/gestore full access" ON public.course_sections;

    CREATE POLICY "Allow admin/gestore full access" ON public.course_sections
      FOR ALL USING (
        public.get_my_role() IN ('admin', 'gestore')
      );
  END IF;
END $$;

-- ==========================================================================
-- NOTE: chat_groups and chat_group_members have RLS DISABLED (migration 029)
-- Security is enforced at the API layer via service role client.
-- No changes needed for those tables.
-- ==========================================================================

SELECT 'Migration 036: All RLS recursion policies fixed comprehensively' AS status;
