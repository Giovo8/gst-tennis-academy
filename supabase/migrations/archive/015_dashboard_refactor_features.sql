-- Migration 015: New Features for Dashboard Refactor
-- This migration adds tables for: Invite Codes, Court Blocks, Video Lessons, System Settings
-- Run this script in Supabase SQL Editor

-- =============================================
-- 0. PREREQUISITI - Assicurati che i tipi esistano
-- =============================================

-- Crea il tipo user_role se non esiste (dovrebbe già esistere dallo schema base)
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

-- =============================================
-- 1. INVITE CODES SYSTEM
-- =============================================

-- Table for invite codes (private registration links)
create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  role text not null default 'atleta', -- Usando text invece di user_role per compatibilità
  max_uses int,
  uses_remaining int,
  expires_at timestamptz,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table to track who used each invite code
create table if not exists public.invite_code_uses (
  id uuid primary key default gen_random_uuid(),
  invite_code_id uuid not null references public.invite_codes on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  used_at timestamptz not null default now(),
  unique(invite_code_id, user_id)
);

-- RLS for invite_codes
alter table public.invite_codes enable row level security;

create policy "Admin/Gestore can view invite codes"
  on public.invite_codes
  for select
  using (public.get_my_role() in ('admin', 'gestore'));

create policy "Admin/Gestore can create invite codes"
  on public.invite_codes
  for insert
  with check (public.get_my_role() in ('admin', 'gestore'));

create policy "Admin/Gestore can update invite codes"
  on public.invite_codes
  for update
  using (public.get_my_role() in ('admin', 'gestore'));

create policy "Admin/Gestore can delete invite codes"
  on public.invite_codes
  for delete
  using (public.get_my_role() in ('admin', 'gestore'));

-- Public can validate codes (but not see all)
create policy "Anyone can validate a specific code"
  on public.invite_codes
  for select
  using (true);  -- Will be filtered by code in query

-- RLS for invite_code_uses
alter table public.invite_code_uses enable row level security;

create policy "Admin/Gestore can view invite code uses"
  on public.invite_code_uses
  for select
  using (public.get_my_role() in ('admin', 'gestore'));

create policy "System can record invite code use"
  on public.invite_code_uses
  for insert
  with check (true);

-- Indexes
create index invite_codes_code_idx on public.invite_codes (code);
create index invite_codes_expires_idx on public.invite_codes (expires_at);
create index invite_code_uses_code_idx on public.invite_code_uses (invite_code_id);
create index invite_code_uses_user_idx on public.invite_code_uses (user_id);

-- Trigger for updated_at
create trigger update_invite_codes_updated_at
  before update on public.invite_codes
  for each row execute procedure public.update_updated_at_column();

-- =============================================
-- 2. COURT BLOCKS SYSTEM
-- =============================================

-- Table for blocking courts (maintenance, events, weather, etc.)
create table if not exists public.court_blocks (
  id uuid primary key default gen_random_uuid(),
  court_id text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text not null default 'Manutenzione',
  is_recurring boolean not null default false,
  recurrence_pattern text, -- 'daily', 'weekly', 'monthly'
  recurrence_end_date date,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint court_blocks_time_check check (end_time > start_time)
);

-- RLS for court_blocks
alter table public.court_blocks enable row level security;

create policy "Anyone can view court blocks"
  on public.court_blocks
  for select
  using (true);

create policy "Admin/Gestore can create court blocks"
  on public.court_blocks
  for insert
  with check (public.get_my_role() in ('admin', 'gestore'));

create policy "Admin/Gestore can update court blocks"
  on public.court_blocks
  for update
  using (public.get_my_role() in ('admin', 'gestore'));

create policy "Admin/Gestore can delete court blocks"
  on public.court_blocks
  for delete
  using (public.get_my_role() in ('admin', 'gestore'));

-- Indexes
create index court_blocks_court_idx on public.court_blocks (court_id);
create index court_blocks_times_idx on public.court_blocks (start_time, end_time);

-- Trigger for updated_at
create trigger update_court_blocks_updated_at
  before update on public.court_blocks
  for each row execute procedure public.update_updated_at_column();

-- =============================================
-- 3. VIDEO LESSONS SYSTEM (Enhanced)
-- =============================================

-- Table for video lessons (coach video library)
create table if not exists public.video_lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_url text not null,
  thumbnail_url text,
  duration_seconds int,
  category text not null default 'generale', -- 'tecnica', 'tattica', 'fisico', 'mentale', 'generale'
  difficulty_level text default 'intermedio', -- 'principiante', 'intermedio', 'avanzato'
  coach_id uuid not null references auth.users on delete cascade,
  is_public boolean not null default false,
  tags text[], -- Array of tags for filtering
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table for assigning videos to specific athletes
create table if not exists public.video_assignments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.video_lessons on delete cascade,
  athlete_id uuid not null references auth.users on delete cascade,
  assigned_by uuid not null references auth.users on delete cascade,
  notes text,
  is_viewed boolean not null default false,
  viewed_at timestamptz,
  assigned_at timestamptz not null default now(),
  unique(video_id, athlete_id)
);

-- RLS for video_lessons
alter table public.video_lessons enable row level security;

create policy "Coaches can view their videos"
  on public.video_lessons
  for select
  using (
    coach_id = auth.uid() 
    or is_public = true 
    or public.get_my_role() in ('admin', 'gestore')
  );

create policy "Athletes can view assigned videos"
  on public.video_lessons
  for select
  using (
    exists (
      select 1 from public.video_assignments va
      where va.video_id = id
      and va.athlete_id = auth.uid()
    )
  );

create policy "Coaches can create videos"
  on public.video_lessons
  for insert
  with check (
    auth.uid() = coach_id 
    and public.get_my_role() in ('maestro', 'admin', 'gestore')
  );

create policy "Coaches can update their videos"
  on public.video_lessons
  for update
  using (
    coach_id = auth.uid() 
    or public.get_my_role() in ('admin', 'gestore')
  );

create policy "Coaches can delete their videos"
  on public.video_lessons
  for delete
  using (
    coach_id = auth.uid() 
    or public.get_my_role() in ('admin', 'gestore')
  );

-- RLS for video_assignments
alter table public.video_assignments enable row level security;

create policy "Coaches can view assignments they made"
  on public.video_assignments
  for select
  using (
    assigned_by = auth.uid()
    or athlete_id = auth.uid()
    or public.get_my_role() in ('admin', 'gestore')
  );

create policy "Coaches can create assignments"
  on public.video_assignments
  for insert
  with check (
    public.get_my_role() in ('maestro', 'admin', 'gestore')
  );

create policy "Athletes can update their assignment status"
  on public.video_assignments
  for update
  using (athlete_id = auth.uid());

create policy "Coaches can delete assignments"
  on public.video_assignments
  for delete
  using (
    assigned_by = auth.uid()
    or public.get_my_role() in ('admin', 'gestore')
  );

-- Indexes
create index video_lessons_coach_idx on public.video_lessons (coach_id);
create index video_lessons_category_idx on public.video_lessons (category);
create index video_lessons_public_idx on public.video_lessons (is_public);
create index video_assignments_video_idx on public.video_assignments (video_id);
create index video_assignments_athlete_idx on public.video_assignments (athlete_id);
create index video_assignments_coach_idx on public.video_assignments (assigned_by);

-- Triggers
create trigger update_video_lessons_updated_at
  before update on public.video_lessons
  for each row execute procedure public.update_updated_at_column();

-- =============================================
-- 4. SYSTEM SETTINGS
-- =============================================

-- Key-value store for system configuration
create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);

-- RLS for system_settings
alter table public.system_settings enable row level security;

create policy "Anyone can read system settings"
  on public.system_settings
  for select
  using (true);

create policy "Admin can manage system settings"
  on public.system_settings
  for all
  using (public.get_my_role() in ('admin', 'gestore'));

-- Insert default settings
insert into public.system_settings (key, value, description) values
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
on conflict (key) do nothing;

-- =============================================
-- 5. CHAT / MESSAGING ENHANCEMENTS
-- =============================================

-- Chat rooms for group conversations
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text,
  type text not null default 'direct', -- 'direct', 'group', 'course', 'tournament'
  reference_id uuid, -- ID of course/tournament if applicable
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chat room members
create table if not exists public.chat_room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member', -- 'admin', 'member'
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  unique(room_id, user_id)
);

-- Chat messages
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms on delete cascade,
  sender_id uuid not null references auth.users on delete cascade,
  content text not null,
  message_type text not null default 'text', -- 'text', 'image', 'video', 'file', 'system'
  attachment_url text,
  is_edited boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for chat_rooms
alter table public.chat_rooms enable row level security;

create policy "Members can view their rooms"
  on public.chat_rooms
  for select
  using (
    exists (
      select 1 from public.chat_room_members crm
      where crm.room_id = id
      and crm.user_id = auth.uid()
    )
    or public.get_my_role() in ('admin', 'gestore')
  );

create policy "Users can create rooms"
  on public.chat_rooms
  for insert
  with check (auth.uid() = created_by);

create policy "Room admins can update rooms"
  on public.chat_rooms
  for update
  using (
    exists (
      select 1 from public.chat_room_members crm
      where crm.room_id = id
      and crm.user_id = auth.uid()
      and crm.role = 'admin'
    )
    or public.get_my_role() in ('admin', 'gestore')
  );

-- RLS for chat_room_members
alter table public.chat_room_members enable row level security;

create policy "Members can view room members"
  on public.chat_room_members
  for select
  using (
    exists (
      select 1 from public.chat_room_members crm
      where crm.room_id = room_id
      and crm.user_id = auth.uid()
    )
  );

create policy "Room admins can manage members"
  on public.chat_room_members
  for all
  using (
    exists (
      select 1 from public.chat_room_members crm
      where crm.room_id = room_id
      and crm.user_id = auth.uid()
      and crm.role = 'admin'
    )
    or public.get_my_role() in ('admin', 'gestore')
  );

-- RLS for chat_messages
alter table public.chat_messages enable row level security;

create policy "Members can view messages in their rooms"
  on public.chat_messages
  for select
  using (
    exists (
      select 1 from public.chat_room_members crm
      where crm.room_id = room_id
      and crm.user_id = auth.uid()
    )
  );

create policy "Members can send messages"
  on public.chat_messages
  for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.chat_room_members crm
      where crm.room_id = room_id
      and crm.user_id = auth.uid()
    )
  );

create policy "Senders can edit their messages"
  on public.chat_messages
  for update
  using (sender_id = auth.uid());

-- Indexes
create index chat_rooms_type_idx on public.chat_rooms (type);
create index chat_rooms_reference_idx on public.chat_rooms (reference_id);
create index chat_room_members_room_idx on public.chat_room_members (room_id);
create index chat_room_members_user_idx on public.chat_room_members (user_id);
create index chat_messages_room_idx on public.chat_messages (room_id, created_at);
create index chat_messages_sender_idx on public.chat_messages (sender_id);

-- Triggers
create trigger update_chat_rooms_updated_at
  before update on public.chat_rooms
  for each row execute procedure public.update_updated_at_column();

create trigger update_chat_messages_updated_at
  before update on public.chat_messages
  for each row execute procedure public.update_updated_at_column();

-- =============================================
-- 6. ACTIVITY LOG (for Admin Dashboard)
-- =============================================

-- Activity log for admin monitoring
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  action text not null, -- 'booking_created', 'user_registered', 'tournament_started', etc.
  entity_type text, -- 'booking', 'user', 'tournament', 'course', etc.
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- RLS for activity_log
alter table public.activity_log enable row level security;

create policy "Admin can view activity log"
  on public.activity_log
  for select
  using (public.get_my_role() in ('admin', 'gestore'));

create policy "System can create activity log"
  on public.activity_log
  for insert
  with check (true);

-- Indexes
create index activity_log_user_idx on public.activity_log (user_id);
create index activity_log_action_idx on public.activity_log (action);
create index activity_log_entity_idx on public.activity_log (entity_type, entity_id);
create index activity_log_created_idx on public.activity_log (created_at);

-- =============================================
-- 7. HELPER FUNCTIONS
-- =============================================

-- Function to check if a court is blocked at a given time
create or replace function public.is_court_blocked(
  p_court_id text,
  p_start_time timestamptz,
  p_end_time timestamptz
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.court_blocks
    where court_id = p_court_id
    and start_time < p_end_time
    and end_time > p_start_time
  );
$$;

-- Function to validate invite code
create or replace function public.validate_invite_code(p_code text)
returns table (
  valid boolean,
  role text,
  error_message text
)
language plpgsql
as $$
declare
  v_invite record;
begin
  select * into v_invite
  from public.invite_codes
  where code = upper(p_code);
  
  if not found then
    return query select false, null::text, 'Codice non valido';
    return;
  end if;
  
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    return query select false, null::text, 'Codice scaduto';
    return;
  end if;
  
  if v_invite.uses_remaining is not null and v_invite.uses_remaining <= 0 then
    return query select false, null::text, 'Codice esaurito';
    return;
  end if;
  
  return query select true, v_invite.role, null::text;
end;
$$;

-- Function to log activity
create or replace function public.log_activity(
  p_user_id uuid,
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_metadata jsonb default null
)
returns uuid
language sql
as $$
  insert into public.activity_log (user_id, action, entity_type, entity_id, metadata)
  values (p_user_id, p_action, p_entity_type, p_entity_id, p_metadata)
  returning id;
$$;

-- =============================================
-- 8. REALTIME SUBSCRIPTIONS
-- =============================================

-- Enable realtime for key tables (ignora errori se già aggiunte)
DO $$ 
BEGIN
  BEGIN
    alter publication supabase_realtime add table public.bookings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    alter publication supabase_realtime add table public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    alter publication supabase_realtime add table public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    alter publication supabase_realtime add table public.court_blocks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Done!
-- Remember to:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify RLS policies are working correctly
-- 3. Test the functions with sample data
