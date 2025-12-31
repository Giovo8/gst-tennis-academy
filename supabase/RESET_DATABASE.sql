-- ==========================================
-- RESET COMPLETO DATABASE GST TENNIS ACADEMY
-- ==========================================
-- ATTENZIONE: Questo script cancella TUTTI i dati esistenti!
-- Eseguire solo se si vuole ripartire da zero.
-- Data: 2025-12-28

-- ==========================================
-- STEP 1: DISABILITA RLS SU TUTTE LE TABELLE
-- ==========================================

ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recruitment_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.news DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcement_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_unsubscribes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hero_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hero_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.homepage_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gallery_items DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 2: DROP TUTTE LE TABELLE
-- ==========================================

DROP TABLE IF EXISTS public.announcement_views CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.tournament_matches CASCADE;
DROP TABLE IF EXISTS public.tournament_participants CASCADE;
DROP TABLE IF EXISTS public.tournament_groups CASCADE;
DROP TABLE IF EXISTS public.tournaments CASCADE;
DROP TABLE IF EXISTS public.email_unsubscribes CASCADE;
DROP TABLE IF EXISTS public.email_settings CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.event_registrations CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.news CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.recruitment_applications CASCADE;
DROP TABLE IF EXISTS public.subscription_credits CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.hero_content CASCADE;
DROP TABLE IF EXISTS public.hero_images CASCADE;
DROP TABLE IF EXISTS public.homepage_sections CASCADE;
DROP TABLE IF EXISTS public.gallery_items CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ==========================================
-- STEP 3: DROP ENUMS E FUNZIONI
-- ==========================================

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.reset_weekly_credits() CASCADE;
DROP FUNCTION IF EXISTS public.consume_group_credit(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.increment_announcement_view_count() CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.booking_type CASCADE;
DROP TYPE IF EXISTS public.recruitment_role CASCADE;

-- ==========================================
-- STEP 4: CREA TIPI ENUM
-- ==========================================

CREATE TYPE public.user_role AS ENUM ('atleta', 'maestro', 'gestore', 'admin');
CREATE TYPE public.booking_type AS ENUM ('campo', 'lezione_privata', 'lezione_gruppo');

-- ==========================================
-- STEP 5: CREA FUNZIONI HELPER
-- ==========================================

-- Funzione per aggiornare il campo updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ==========================================
-- STEP 6: CREA TABELLE ESSENZIALI
-- ==========================================

-- TABELLA PROFILES (Utenti)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  date_of_birth DATE,
  role user_role NOT NULL DEFAULT 'atleta',
  subscription_type TEXT,
  bio TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX profiles_role_idx ON public.profiles (role);
CREATE INDEX profiles_email_idx ON public.profiles (email);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- TABELLA BOOKINGS (Prenotazioni campi e lezioni)
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  coach_id UUID REFERENCES auth.users ON DELETE SET NULL,
  court TEXT NOT NULL,
  type booking_type NOT NULL DEFAULT 'campo',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  coach_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  manager_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bookings_time_check CHECK (end_time > start_time),
  CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'rejected_by_coach', 'rejected_by_manager', 'confirmed_by_coach'))
);

-- Previeni sovrapposizioni
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    court WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status != 'cancelled');

CREATE INDEX bookings_user_idx ON public.bookings (user_id);
CREATE INDEX bookings_coach_idx ON public.bookings (coach_id);
CREATE INDEX bookings_court_idx ON public.bookings (court, start_time);
CREATE INDEX bookings_type_idx ON public.bookings (type);
CREATE INDEX bookings_status_idx ON public.bookings (status);
CREATE INDEX bookings_coach_confirmed_idx ON public.bookings (coach_confirmed);
CREATE INDEX bookings_manager_confirmed_idx ON public.bookings (manager_confirmed);

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- TABELLA COURSES (Corsi)
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  coach_id UUID REFERENCES auth.users ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  schedule TEXT,
  max_participants INT NOT NULL DEFAULT 10,
  current_participants INT NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  level TEXT,
  age_group TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT courses_dates_check CHECK (end_date >= start_date),
  CONSTRAINT courses_participants_check CHECK (current_participants <= max_participants AND current_participants >= 0)
);

CREATE INDEX courses_coach_idx ON public.courses (coach_id);
CREATE INDEX courses_dates_idx ON public.courses (start_date, end_date);
CREATE INDEX courses_active_idx ON public.courses (is_active);
CREATE INDEX courses_level_idx ON public.courses (level);

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- TABELLA ENROLLMENTS (Iscrizioni ai corsi)
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, course_id),
  CONSTRAINT enrollments_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  CONSTRAINT enrollments_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'refunded'))
);

CREATE INDEX enrollments_user_idx ON public.enrollments (user_id);
CREATE INDEX enrollments_course_idx ON public.enrollments (course_id);
CREATE INDEX enrollments_status_idx ON public.enrollments (status);

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- TABELLA TOURNAMENTS (Tornei)
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ,
  max_participants INT NOT NULL DEFAULT 16,
  current_participants INT NOT NULL DEFAULT 0,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  prize_pool DECIMAL(10,2),
  category TEXT,
  level TEXT,
  surface_type TEXT DEFAULT 'terra',
  match_format TEXT DEFAULT 'best_of_3',
  current_stage TEXT DEFAULT 'registration',
  has_groups BOOLEAN DEFAULT false,
  image_url TEXT,
  rules TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tournaments_dates_check CHECK (end_date >= start_date),
  CONSTRAINT tournaments_participants_check CHECK (current_participants <= max_participants AND current_participants >= 0),
  CONSTRAINT tournaments_stage_check CHECK (current_stage IN ('registration', 'groups', 'knockout', 'completed', 'cancelled')),
  CONSTRAINT tournaments_format_check CHECK (match_format IN ('best_of_1', 'best_of_3', 'best_of_5')),
  CONSTRAINT tournaments_surface_check CHECK (surface_type IN ('terra', 'erba', 'cemento', 'sintetico', 'indoor'))
);

CREATE INDEX tournaments_dates_idx ON public.tournaments (start_date, end_date);
CREATE INDEX tournaments_active_idx ON public.tournaments (is_active);
CREATE INDEX tournaments_stage_idx ON public.tournaments (current_stage);
CREATE INDEX tournaments_category_idx ON public.tournaments (category);

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- TABELLA TOURNAMENT_PARTICIPANTS (Partecipanti ai tornei)
CREATE TABLE public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  seeding INT,
  ranking_points INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, user_id),
  CONSTRAINT tournament_participants_status_check CHECK (status IN ('registered', 'confirmed', 'withdrawn', 'eliminated', 'winner')),
  CONSTRAINT tournament_participants_payment_check CHECK (payment_status IN ('pending', 'paid', 'refunded'))
);

CREATE INDEX tournament_participants_tournament_idx ON public.tournament_participants (tournament_id);
CREATE INDEX tournament_participants_user_idx ON public.tournament_participants (user_id);
CREATE INDEX tournament_participants_status_idx ON public.tournament_participants (status);

CREATE TRIGGER update_tournament_participants_updated_at
  BEFORE UPDATE ON public.tournament_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- TABELLA NEWS (Notizie e Annunci)
CREATE TABLE public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id UUID REFERENCES auth.users ON DELETE SET NULL,
  category TEXT DEFAULT 'generale',
  image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  views INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT news_category_check CHECK (category IN ('notizie', 'risultati', 'eventi', 'generale', 'tornei'))
);

CREATE INDEX news_published_idx ON public.news (is_published, published_at DESC);
CREATE INDEX news_category_idx ON public.news (category);
CREATE INDEX news_author_idx ON public.news (author_id);

CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- TABELLA ANNOUNCEMENTS (Bacheca Annunci)
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  announcement_type TEXT NOT NULL DEFAULT 'announcement',
  author_id UUID REFERENCES auth.users ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium',
  expiry_date TIMESTAMPTZ,
  visibility TEXT DEFAULT 'all',
  is_published BOOLEAN DEFAULT true,
  is_pinned BOOLEAN DEFAULT false,
  view_count INT DEFAULT 0,
  image_url TEXT,
  link_url TEXT,
  link_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT announcements_type_check CHECK (announcement_type IN ('announcement', 'partner', 'event', 'news', 'tournament', 'lesson', 'promotion')),
  CONSTRAINT announcements_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT announcements_visibility_check CHECK (visibility IN ('all', 'atleti', 'maestri', 'admin', 'gestore', 'public'))
);

CREATE INDEX announcements_type_idx ON public.announcements (announcement_type);
CREATE INDEX announcements_priority_idx ON public.announcements (priority DESC);
CREATE INDEX announcements_published_idx ON public.announcements (is_published, created_at DESC);
CREATE INDEX announcements_expiry_idx ON public.announcements (expiry_date) WHERE expiry_date IS NOT NULL;

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- TABELLA CONVERSATIONS (Chat - Conversazioni)
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  is_group BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT
);

CREATE INDEX conversations_created_by_idx ON public.conversations (created_by);
CREATE INDEX conversations_last_message_idx ON public.conversations (last_message_at DESC);

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- TABELLA CONVERSATION_PARTICIPANTS (Partecipanti alle conversazioni)
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INT DEFAULT 0,
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX conversation_participants_conversation_idx ON public.conversation_participants (conversation_id);
CREATE INDEX conversation_participants_user_idx ON public.conversation_participants (user_id);

-- TABELLA MESSAGES (Messaggi Chat)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  attachment_url TEXT,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT messages_type_check CHECK (message_type IN ('text', 'image', 'file', 'system'))
);

CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at DESC);
CREATE INDEX messages_sender_idx ON public.messages (sender_id);

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- TABELLA HERO_CONTENT (Contenuti Homepage)
CREATE TABLE public.hero_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_text TEXT NOT NULL DEFAULT 'Cresci nel tuo tennis',
  title TEXT NOT NULL,
  title_highlight TEXT,
  subtitle TEXT,
  primary_button_text TEXT DEFAULT 'Prenota una prova',
  primary_button_link TEXT DEFAULT '/bookings',
  secondary_button_text TEXT DEFAULT 'Scopri i programmi',
  secondary_button_link TEXT DEFAULT '#programmi',
  stat1_value TEXT DEFAULT '250+',
  stat1_label TEXT DEFAULT 'Atleti attivi',
  stat2_value TEXT DEFAULT '180',
  stat2_label TEXT DEFAULT 'Tornei vinti',
  stat3_value TEXT DEFAULT '8',
  stat3_label TEXT DEFAULT 'Campi disponibili',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX hero_content_active_idx ON public.hero_content (active);

CREATE TRIGGER update_hero_content_updated_at
  BEFORE UPDATE ON public.hero_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- STEP 7: ABILITA ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_content ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 8: CREA RLS POLICIES
-- ==========================================

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore')
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore')
    )
  );

-- BOOKINGS POLICIES
CREATE POLICY "Users can view their bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = coach_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore', 'maestro'))
  );

CREATE POLICY "Users can create their bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore'))
  );

CREATE POLICY "Users can delete their bookings"
  ON public.bookings FOR DELETE
  USING (auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore'))
  );

-- COURSES POLICIES
CREATE POLICY "Anyone can view active courses"
  ON public.courses FOR SELECT
  USING (is_active = true OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore', 'maestro'))
  );

CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore'))
  );

-- ENROLLMENTS POLICIES
CREATE POLICY "Users can view their enrollments"
  ON public.enrollments FOR SELECT
  USING (auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore', 'maestro'))
  );

CREATE POLICY "Users can create their enrollments"
  ON public.enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- TOURNAMENTS POLICIES
CREATE POLICY "Anyone can view active tournaments"
  ON public.tournaments FOR SELECT
  USING (is_active = true OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore'))
  );

CREATE POLICY "Admins can manage tournaments"
  ON public.tournaments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore'))
  );

-- TOURNAMENT_PARTICIPANTS POLICIES
CREATE POLICY "Users can view tournament participants"
  ON public.tournament_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can register for tournaments"
  ON public.tournament_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation"
  ON public.tournament_participants FOR UPDATE
  USING (auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore'))
  );

-- NEWS POLICIES
CREATE POLICY "Anyone can view published news"
  ON public.news FOR SELECT
  USING (is_published = true OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore'))
  );

CREATE POLICY "Admins can manage news"
  ON public.news FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore'))
  );

-- ANNOUNCEMENTS POLICIES
CREATE POLICY "Users can view published announcements"
  ON public.announcements FOR SELECT
  USING (is_published = true OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore'))
  );

CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore'))
  );

-- CONVERSATIONS POLICIES
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- CONVERSATION_PARTICIPANTS POLICIES
CREATE POLICY "Users can view conversation participants"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- MESSAGES POLICIES
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
    )
  );

-- HERO_CONTENT POLICIES
CREATE POLICY "Anyone can view active hero content"
  ON public.hero_content FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage hero content"
  ON public.hero_content FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'gestore'))
  );

-- ==========================================
-- STEP 9: INSERISCI DATI DI DEFAULT
-- ==========================================

-- Contenuto Hero di default
INSERT INTO public.hero_content (
  badge_text, title, title_highlight, subtitle,
  primary_button_text, primary_button_link,
  secondary_button_text, secondary_button_link,
  stat1_value, stat1_label, stat2_value, stat2_label, stat3_value, stat3_label,
  active
) VALUES (
  'Cresci nel tuo tennis',
  'Allenamento di alto livello, metodo scientifico e una community che spinge al massimo.',
  'metodo scientifico',
  'Programmi personalizzati per junior, agonisti e adulti. Video analysis, preparazione atletica, match play e coaching mentale curati da maestri certificati FITP.',
  'Prenota una prova',
  '/bookings',
  'Scopri i programmi',
  '#programmi',
  '250+', 'Atleti attivi',
  '180', 'Tornei vinti',
  '8', 'Campi disponibili',
  true
);

-- ==========================================
-- FINE RESET DATABASE
-- ==========================================

-- Per verificare che tutto sia stato creato correttamente:
SELECT 
  schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
