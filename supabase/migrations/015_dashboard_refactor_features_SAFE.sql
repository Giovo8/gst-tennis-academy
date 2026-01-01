-- Migration 015: New Features for Dashboard Refactor (SAFE VERSION)
-- This migration adds tables for: Invite Codes, Court Blocks, Video Lessons, System Settings
-- Run this script in Supabase SQL Editor
-- This version handles all potential conflicts gracefully

-- =============================================
-- 0. PREREQUISITI
-- =============================================

-- Crea il tipo user_role se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('atleta', 'maestro', 'gestore', 'admin');
  END IF;
END $$;

-- Assicurati che la funzione update_updated_at_column esista
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea la funzione get_my_role se non esiste
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'atleta'
  )::text;
$$;

-- =============================================
-- 1. INVITE CODES SYSTEM
-- =============================================

-- Tabella invite_codes
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'atleta',
  max_uses int,
  uses_remaining int,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabella per tracciare uso codici
CREATE TABLE IF NOT EXISTS public.invite_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id uuid NOT NULL REFERENCES public.invite_codes ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invite_code_id, user_id)
);

-- RLS per invite_codes
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/Gestore can view invite codes" ON public.invite_codes;
CREATE POLICY "Admin/Gestore can view invite codes"
  ON public.invite_codes FOR SELECT
  USING (public.get_my_role() IN ('admin', 'gestore'));

DROP POLICY IF EXISTS "Admin/Gestore can create invite codes" ON public.invite_codes;
CREATE POLICY "Admin/Gestore can create invite codes"
  ON public.invite_codes FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'gestore'));

DROP POLICY IF EXISTS "Admin/Gestore can update invite codes" ON public.invite_codes;
CREATE POLICY "Admin/Gestore can update invite codes"
  ON public.invite_codes FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'gestore'));

DROP POLICY IF EXISTS "Admin/Gestore can delete invite codes" ON public.invite_codes;
CREATE POLICY "Admin/Gestore can delete invite codes"
  ON public.invite_codes FOR DELETE
  USING (public.get_my_role() IN ('admin', 'gestore'));

DROP POLICY IF EXISTS "Anyone can validate a specific code" ON public.invite_codes;
CREATE POLICY "Anyone can validate a specific code"
  ON public.invite_codes FOR SELECT
  USING (true);

-- RLS per invite_code_uses
ALTER TABLE public.invite_code_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/Gestore can view invite code uses" ON public.invite_code_uses;
CREATE POLICY "Admin/Gestore can view invite code uses"
  ON public.invite_code_uses FOR SELECT
  USING (public.get_my_role() IN ('admin', 'gestore'));

DROP POLICY IF EXISTS "System can record invite code use" ON public.invite_code_uses;
CREATE POLICY "System can record invite code use"
  ON public.invite_code_uses FOR INSERT
  WITH CHECK (true);

-- Indici (ignora errori se esistono)
CREATE INDEX IF NOT EXISTS invite_codes_code_idx ON public.invite_codes (code);
CREATE INDEX IF NOT EXISTS invite_codes_expires_idx ON public.invite_codes (expires_at);
CREATE INDEX IF NOT EXISTS invite_code_uses_code_idx ON public.invite_code_uses (invite_code_id);
CREATE INDEX IF NOT EXISTS invite_code_uses_user_idx ON public.invite_code_uses (user_id);

-- Trigger
DROP TRIGGER IF EXISTS update_invite_codes_updated_at ON public.invite_codes;
CREATE TRIGGER update_invite_codes_updated_at
  BEFORE UPDATE ON public.invite_codes
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- =============================================
-- 2. COURT BLOCKS SYSTEM
-- =============================================

CREATE TABLE IF NOT EXISTS public.court_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reason text NOT NULL DEFAULT 'Manutenzione',
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_pattern text,
  recurrence_end_date date,
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT court_blocks_time_check CHECK (end_time > start_time)
);

ALTER TABLE public.court_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view court blocks" ON public.court_blocks;
CREATE POLICY "Anyone can view court blocks"
  ON public.court_blocks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin/Gestore can create court blocks" ON public.court_blocks;
CREATE POLICY "Admin/Gestore can create court blocks"
  ON public.court_blocks FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'gestore'));

DROP POLICY IF EXISTS "Admin/Gestore can update court blocks" ON public.court_blocks;
CREATE POLICY "Admin/Gestore can update court blocks"
  ON public.court_blocks FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'gestore'));

DROP POLICY IF EXISTS "Admin/Gestore can delete court blocks" ON public.court_blocks;
CREATE POLICY "Admin/Gestore can delete court blocks"
  ON public.court_blocks FOR DELETE
  USING (public.get_my_role() IN ('admin', 'gestore'));

CREATE INDEX IF NOT EXISTS court_blocks_court_idx ON public.court_blocks (court_id);
CREATE INDEX IF NOT EXISTS court_blocks_times_idx ON public.court_blocks (start_time, end_time);

DROP TRIGGER IF EXISTS update_court_blocks_updated_at ON public.court_blocks;
CREATE TRIGGER update_court_blocks_updated_at
  BEFORE UPDATE ON public.court_blocks
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- =============================================
-- 3. VIDEO LESSONS SYSTEM
-- =============================================

-- Drop tabelle se esistono con schema diverso
DROP TABLE IF EXISTS public.video_assignments CASCADE;
DROP TABLE IF EXISTS public.video_lessons CASCADE;

CREATE TABLE public.video_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  duration_seconds int,
  category text NOT NULL DEFAULT 'generale',
  difficulty_level text DEFAULT 'intermedio',
  coach_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  is_public boolean NOT NULL DEFAULT false,
  tags text[],
  view_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.video_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.video_lessons ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  notes text,
  is_viewed boolean NOT NULL DEFAULT false,
  viewed_at timestamptz,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_id, athlete_id)
);

ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can view their videos" ON public.video_lessons;
CREATE POLICY "Coaches can view their videos"
  ON public.video_lessons FOR SELECT
  USING (
    coach_id = auth.uid() 
    OR is_public = true 
    OR public.get_my_role() IN ('admin', 'gestore')
  );

DROP POLICY IF EXISTS "Athletes can view assigned videos" ON public.video_lessons;
CREATE POLICY "Athletes can view assigned videos"
  ON public.video_lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.video_assignments va
      WHERE va.video_id = id
      AND va.athlete_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can create videos" ON public.video_lessons;
CREATE POLICY "Coaches can create videos"
  ON public.video_lessons FOR INSERT
  WITH CHECK (
    auth.uid() = coach_id 
    AND public.get_my_role() IN ('maestro', 'admin', 'gestore')
  );

DROP POLICY IF EXISTS "Coaches can update their videos" ON public.video_lessons;
CREATE POLICY "Coaches can update their videos"
  ON public.video_lessons FOR UPDATE
  USING (
    coach_id = auth.uid() 
    OR public.get_my_role() IN ('admin', 'gestore')
  );

DROP POLICY IF EXISTS "Coaches can delete their videos" ON public.video_lessons;
CREATE POLICY "Coaches can delete their videos"
  ON public.video_lessons FOR DELETE
  USING (
    coach_id = auth.uid() 
    OR public.get_my_role() IN ('admin', 'gestore')
  );

ALTER TABLE public.video_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can view assignments they made" ON public.video_assignments;
CREATE POLICY "Coaches can view assignments they made"
  ON public.video_assignments FOR SELECT
  USING (
    assigned_by = auth.uid()
    OR athlete_id = auth.uid()
    OR public.get_my_role() IN ('admin', 'gestore')
  );

DROP POLICY IF EXISTS "Coaches can create assignments" ON public.video_assignments;
CREATE POLICY "Coaches can create assignments"
  ON public.video_assignments FOR INSERT
  WITH CHECK (public.get_my_role() IN ('maestro', 'admin', 'gestore'));

DROP POLICY IF EXISTS "Athletes can update their assignment status" ON public.video_assignments;
CREATE POLICY "Athletes can update their assignment status"
  ON public.video_assignments FOR UPDATE
  USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can delete assignments" ON public.video_assignments;
CREATE POLICY "Coaches can delete assignments"
  ON public.video_assignments FOR DELETE
  USING (
    assigned_by = auth.uid()
    OR public.get_my_role() IN ('admin', 'gestore')
  );

CREATE INDEX IF NOT EXISTS video_lessons_coach_idx ON public.video_lessons (coach_id);
CREATE INDEX IF NOT EXISTS video_lessons_category_idx ON public.video_lessons (category);
CREATE INDEX IF NOT EXISTS video_lessons_public_idx ON public.video_lessons (is_public);
CREATE INDEX IF NOT EXISTS video_assignments_video_idx ON public.video_assignments (video_id);
CREATE INDEX IF NOT EXISTS video_assignments_athlete_idx ON public.video_assignments (athlete_id);
CREATE INDEX IF NOT EXISTS video_assignments_coach_idx ON public.video_assignments (assigned_by);

DROP TRIGGER IF EXISTS update_video_lessons_updated_at ON public.video_lessons;
CREATE TRIGGER update_video_lessons_updated_at
  BEFORE UPDATE ON public.video_lessons
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- =============================================
-- 4. SYSTEM SETTINGS
-- =============================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users ON DELETE SET NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
CREATE POLICY "Anyone can read system settings"
  ON public.system_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can manage system settings" ON public.system_settings;
CREATE POLICY "Admin can manage system settings"
  ON public.system_settings FOR ALL
  USING (public.get_my_role() IN ('admin', 'gestore'));

INSERT INTO public.system_settings (key, value, description) VALUES
  ('booking_advance_days', '7', 'Giorni massimi di prenotazione anticipata'),
  ('booking_min_hours_before', '2', 'Ore minime di preavviso per prenotare'),
  ('booking_max_duration_hours', '2', 'Durata massima prenotazione in ore'),
  ('booking_price_per_hour', '20', 'Prezzo base per ora di campo'),
  ('opening_hour', '8', 'Ora di apertura'),
  ('closing_hour', '22', 'Ora di chiusura'),
  ('notifications_email_enabled', 'true', 'Abilitare notifiche email'),
  ('notifications_push_enabled', 'false', 'Abilitare notifiche push'),
  ('maintenance_mode', 'false', 'Modalità manutenzione'),
  ('maintenance_message', '', 'Messaggio manutenzione'),
  ('contact_email', 'info@gst-tennis.it', 'Email di contatto'),
  ('contact_phone', '+39 02 1234567', 'Telefono di contatto'),
  ('address', 'Via dello Sport 123, Milano', 'Indirizzo')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 5. CHAT / MESSAGING ENHANCEMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  type text NOT NULL DEFAULT 'direct',
  reference_id uuid,
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  attachment_url text,
  is_edited boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their rooms" ON public.chat_rooms;
CREATE POLICY "Members can view their rooms"
  ON public.chat_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_members crm
      WHERE crm.room_id = id
      AND crm.user_id = auth.uid()
    )
    OR public.get_my_role() IN ('admin', 'gestore')
  );

DROP POLICY IF EXISTS "Users can create rooms" ON public.chat_rooms;
CREATE POLICY "Users can create rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Room admins can update rooms" ON public.chat_rooms;
CREATE POLICY "Room admins can update rooms"
  ON public.chat_rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_members crm
      WHERE crm.room_id = id
      AND crm.user_id = auth.uid()
      AND crm.role = 'admin'
    )
    OR public.get_my_role() IN ('admin', 'gestore')
  );

ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view room members" ON public.chat_room_members;
CREATE POLICY "Members can view room members"
  ON public.chat_room_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_members crm
      WHERE crm.room_id = room_id
      AND crm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Room admins can manage members" ON public.chat_room_members;
CREATE POLICY "Room admins can manage members"
  ON public.chat_room_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_members crm
      WHERE crm.room_id = room_id
      AND crm.user_id = auth.uid()
      AND crm.role = 'admin'
    )
    OR public.get_my_role() IN ('admin', 'gestore')
  );

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view messages in their rooms" ON public.chat_messages;
CREATE POLICY "Members can view messages in their rooms"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_members crm
      WHERE crm.room_id = room_id
      AND crm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can send messages" ON public.chat_messages;
CREATE POLICY "Members can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_room_members crm
      WHERE crm.room_id = room_id
      AND crm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Senders can edit their messages" ON public.chat_messages;
CREATE POLICY "Senders can edit their messages"
  ON public.chat_messages FOR UPDATE
  USING (sender_id = auth.uid());

CREATE INDEX IF NOT EXISTS chat_rooms_type_idx ON public.chat_rooms (type);
CREATE INDEX IF NOT EXISTS chat_rooms_reference_idx ON public.chat_rooms (reference_id);
CREATE INDEX IF NOT EXISTS chat_room_members_room_idx ON public.chat_room_members (room_id);
CREATE INDEX IF NOT EXISTS chat_room_members_user_idx ON public.chat_room_members (user_id);
CREATE INDEX IF NOT EXISTS chat_messages_room_idx ON public.chat_messages (room_id, created_at);
CREATE INDEX IF NOT EXISTS chat_messages_sender_idx ON public.chat_messages (sender_id);

DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON public.chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- =============================================
-- 6. ACTIVITY LOG
-- =============================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view activity log" ON public.activity_log;
CREATE POLICY "Admin can view activity log"
  ON public.activity_log FOR SELECT
  USING (public.get_my_role() IN ('admin', 'gestore'));

DROP POLICY IF EXISTS "System can create activity log" ON public.activity_log;
CREATE POLICY "System can create activity log"
  ON public.activity_log FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS activity_log_user_idx ON public.activity_log (user_id);
CREATE INDEX IF NOT EXISTS activity_log_action_idx ON public.activity_log (action);
CREATE INDEX IF NOT EXISTS activity_log_entity_idx ON public.activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS activity_log_created_idx ON public.activity_log (created_at);

-- =============================================
-- 7. HELPER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.is_court_blocked(
  p_court_id text,
  p_start_time timestamptz,
  p_end_time timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.court_blocks
    WHERE court_id = p_court_id
    AND start_time < p_end_time
    AND end_time > p_start_time
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code text)
RETURNS TABLE (
  valid boolean,
  role text,
  error_message text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite record;
BEGIN
  SELECT * INTO v_invite
  FROM public.invite_codes
  WHERE code = upper(p_code);
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::text, 'Codice non valido';
    RETURN;
  END IF;
  
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN QUERY SELECT false, null::text, 'Codice scaduto';
    RETURN;
  END IF;
  
  IF v_invite.uses_remaining IS NOT NULL AND v_invite.uses_remaining <= 0 THEN
    RETURN QUERY SELECT false, null::text, 'Codice esaurito';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, v_invite.role, null::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id uuid,
  p_action text,
  p_entity_type text DEFAULT null,
  p_entity_id uuid DEFAULT null,
  p_metadata jsonb DEFAULT null
)
RETURNS uuid
LANGUAGE sql
AS $$
  INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, metadata)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_metadata)
  RETURNING id;
$$;

-- =============================================
-- 8. REALTIME SUBSCRIPTIONS
-- =============================================

DO $$ 
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.court_blocks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Done!
-- Run this script in Supabase SQL Editor
-- All commands use IF EXISTS/IF NOT EXISTS for safe re-running
