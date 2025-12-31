-- Supabase schema for GST Tennis Academy
-- Run inside Supabase SQL editor or via CLI

create type public.user_role as enum ('atleta', 'maestro', 'gestore', 'admin');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  full_name text,
  role user_role not null default 'atleta',
  subscription_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  enable row level security;

create policy "Users can view their profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update their profile"
  on public.profiles
  for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'gestore')
    )
  );

create policy "Admins can update all profiles"
  on public.profiles
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'gestore')
    )
  );

create policy "Admins can insert profiles"
  on public.profiles
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'gestore')
    )
  );

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute procedure public.update_updated_at_column();

-- Optional helper index for role-based queries
create index profiles_role_idx on public.profiles (role);

-- Bookings for courts and private lessons
create type public.booking_type as enum ('campo', 'lezione_privata', 'lezione_gruppo');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  coach_id uuid references auth.users on delete set null,
  court text not null,
  type booking_type not null default 'campo',
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'pending',
  coach_confirmed boolean not null default false,
  manager_confirmed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  constraint bookings_time_check check (end_time > start_time)
);

-- Prevent overlapping bookings on the same court
create extension if not exists btree_gist;
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    court with =,
    tstzrange(start_time, end_time) with &&
  );

-- RLS
alter table public.bookings enable row level security;

create policy "Users can view their bookings"
  on public.bookings
  for select
  using (auth.uid() = user_id or auth.uid() = coach_id);

create policy "Users can insert their bookings"
  on public.bookings
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their bookings"
  on public.bookings
  for update
  using (auth.uid() = user_id or auth.uid() = coach_id);

create policy "Users can delete their bookings"
  on public.bookings
  for delete
  using (auth.uid() = user_id);

create index bookings_user_idx on public.bookings (user_id);
create index bookings_court_idx on public.bookings (court, start_time);
create index bookings_type_idx on public.bookings (type);
create index bookings_coach_confirmed_idx on public.bookings (coach_confirmed);
create index bookings_manager_confirmed_idx on public.bookings (manager_confirmed);

-- Subscription credits (weekly)
create table public.subscription_credits (
  user_id uuid primary key references auth.users on delete cascade,
  plan text not null default 'Monosettimanale',
  weekly_credits int not null default 1,
  credits_available int not null default 1,
  last_reset timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscription_credits enable row level security;

create policy "Users can view their credits"
  on public.subscription_credits
  for select
  using (auth.uid() = user_id);

create policy "Users can update their credits"
  on public.subscription_credits
  for update
  using (auth.uid() = user_id);

create or replace function public.reset_weekly_credits()
returns void
language plpgsql
as $$
begin
  update public.subscription_credits
  set credits_available = weekly_credits,
      last_reset = now(),
      updated_at = now()
  where date_part('isodow', now()) = 1; -- Monday
end;
$$;

-- Call this function via Supabase scheduled job every Monday 00:05 UTC
-- e.g. in Dashboard > Edge Functions > Scheduled: "reset-weekly-credits"

create or replace function public.consume_group_credit(p_user_id uuid)
returns boolean
language plpgsql
as $$
declare
  ok boolean := false;
begin
  update public.subscription_credits
  set credits_available = credits_available - 1,
      updated_at = now()
  where user_id = p_user_id
    and credits_available > 0
  returning true into ok;

  return ok;
end;
$$;

create index subscription_credits_user_idx on public.subscription_credits (user_id);

-- Recruitment applications
create type public.recruitment_role as enum ('maestro', 'personale');

create table public.recruitment_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  role recruitment_role not null,
  message text,
  cv_url text,
  created_at timestamptz not null default now()
);

alter table public.recruitment_applications enable row level security;

create policy "Gestore/Admin can view applications"
  on public.recruitment_applications
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('gestore', 'admin')
    )
  );

create policy "Users can insert application"
  on public.recruitment_applications
  for insert
  with check (true);

create index recruitment_applications_email_idx on public.recruitment_applications (email);

-- Orders table for shop purchases (created by webhook)
create table public.orders (
  id text primary key,
  customer_email text,
  amount_total bigint,
  currency text,
  payment_status text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Public can read orders"
  on public.orders
  for select
  using (true);

-- Services table (tennis lessons, courses, etc.)
create table public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null, -- 'lezione_privata', 'lezione_gruppo', 'corso', 'campo'
  price decimal(10,2),
  duration_minutes int,
  max_participants int,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;

create policy "Anyone can view active services"
  on public.services
  for select
  using (is_active = true or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create policy "Admin can manage services"
  on public.services
  for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create index services_type_idx on public.services (type);
create index services_active_idx on public.services (is_active);

-- Products table for shop
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price decimal(10,2) not null,
  category text,
  stock int not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Anyone can view active products"
  on public.products
  for select
  using (is_active = true or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create policy "Admin can manage products"
  on public.products
  for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create index products_category_idx on public.products (category);
create index products_active_idx on public.products (is_active);

-- Courses table (group courses with schedules)
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  coach_id uuid references auth.users on delete set null,
  start_date date not null,
  end_date date not null,
  schedule text, -- JSON or text describing weekly schedule
  max_participants int not null default 10,
  current_participants int not null default 0,
  price decimal(10,2) not null,
  level text, -- 'principiante', 'intermedio', 'avanzato'
  age_group text, -- 'bambini', 'junior', 'adulti', 'senior'
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create policy "Anyone can view active courses"
  on public.courses
  for select
  using (is_active = true or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin', 'maestro')
  ));

create policy "Admin and coaches can manage courses"
  on public.courses
  for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.role in ('gestore', 'admin') or (p.role = 'maestro' and p.id = coach_id))
  ));

create index courses_coach_idx on public.courses (coach_id);
create index courses_dates_idx on public.courses (start_date, end_date);
create index courses_active_idx on public.courses (is_active);

-- Enrollments table (course registrations)
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid not null references public.courses on delete cascade,
  status text not null default 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
  payment_status text not null default 'pending', -- 'pending', 'paid', 'refunded'
  enrolled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, course_id)
);

alter table public.enrollments enable row level security;

create policy "Users can view their enrollments"
  on public.enrollments
  for select
  using (auth.uid() = user_id or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin', 'maestro')
  ));

create policy "Users can create their enrollments"
  on public.enrollments
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their enrollments"
  on public.enrollments
  for update
  using (auth.uid() = user_id or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create index enrollments_user_idx on public.enrollments (user_id);
create index enrollments_course_idx on public.enrollments (course_id);
create index enrollments_status_idx on public.enrollments (status);

-- Events/Tournaments table
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text not null, -- 'torneo', 'evento_sociale', 'workshop', 'camp'
  start_date timestamptz not null,
  end_date timestamptz not null,
  location text,
  max_participants int,
  current_participants int not null default 0,
  registration_deadline timestamptz,
  price decimal(10,2),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "Anyone can view active events"
  on public.events
  for select
  using (is_active = true or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create policy "Admin can manage events"
  on public.events
  for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create index events_type_idx on public.events (event_type);
create index events_dates_idx on public.events (start_date, end_date);
create index events_active_idx on public.events (is_active);

-- Event registrations
create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  event_id uuid not null references public.events on delete cascade,
  status text not null default 'pending', -- 'pending', 'confirmed', 'cancelled'
  payment_status text not null default 'pending',
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, event_id)
);

alter table public.event_registrations enable row level security;

create policy "Users can view their registrations"
  on public.event_registrations
  for select
  using (auth.uid() = user_id or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create policy "Users can create their registrations"
  on public.event_registrations
  for insert
  with check (auth.uid() = user_id);

create index event_registrations_user_idx on public.event_registrations (user_id);
create index event_registrations_event_idx on public.event_registrations (event_id);

-- News/Announcements table
create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  excerpt text,
  author_id uuid references auth.users on delete set null,
  category text, -- 'notizie', 'risultati', 'eventi', 'generale'
  image_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news enable row level security;

create policy "Anyone can view published news"
  on public.news
  for select
  using (is_published = true or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create policy "Admin can manage news"
  on public.news
  for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create index news_published_idx on public.news (is_published, published_at);
create index news_category_idx on public.news (category);

-- Notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  message text not null,
  type text not null, -- 'info', 'success', 'warning', 'error'
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

create policy "System can create notifications"
  on public.notifications
  for insert
  with check (true);

create policy "Users can update their notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id);

create index notifications_user_idx on public.notifications (user_id, is_read);
create index notifications_created_idx on public.notifications (created_at);

-- Messages table (internal messaging system)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users on delete cascade,
  recipient_id uuid not null references auth.users on delete cascade,
  subject text,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Users can view their messages"
  on public.messages
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users can send messages"
  on public.messages
  for insert
  with check (auth.uid() = sender_id);

create policy "Recipients can update messages"
  on public.messages
  for update
  using (auth.uid() = recipient_id);

create index messages_sender_idx on public.messages (sender_id);
create index messages_recipient_idx on public.messages (recipient_id, is_read);
create index messages_created_idx on public.messages (created_at);

-- Tournaments system with competition types
-- Create ENUM types for competition
create type public.competition_type as enum ('torneo', 'campionato');
create type public.competition_format as enum (
  'eliminazione_diretta',  -- Single/Double elimination
  'round_robin',            -- Round-robin (all-play-all)
  'girone_eliminazione'     -- Group stage + elimination brackets
);

-- Tournaments table
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  category text,
  level text,
  max_participants int not null default 0,
  status text not null default 'Aperto', -- 'Aperto', 'In Corso', 'Concluso', 'Annullato'
  
  -- Competition type and format
  competition_type competition_type default 'torneo' not null,
  format competition_format default 'eliminazione_diretta' not null,
  
  -- Tennis specific fields
  match_format text default 'best_of_3', -- 'best_of_1', 'best_of_3', 'best_of_5'
  surface_type text default 'terra', -- 'terra', 'erba', 'cemento', 'sintetico', 'indoor', 'carpet'
  
  -- Structure data (JSON)
  rounds_data jsonb default '[]'::jsonb,
  groups_data jsonb default '[]'::jsonb,
  standings jsonb default '[]'::jsonb,
  
  -- Stage management
  has_groups boolean default false,
  current_stage text default 'registration', -- 'registration', 'groups', 'knockout', 'completed', 'cancelled'
  
  -- Financial
  entry_fee decimal(10,2),
  prize_money decimal(10,2),
  
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tournaments enable row level security;

create policy "Anyone can view active tournaments"
  on public.tournaments
  for select
  using (true);

create policy "Admin and gestore can manage tournaments"
  on public.tournaments
  for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create index tournaments_starts_at_idx on public.tournaments (starts_at);
create index tournaments_status_idx on public.tournaments (status);
create index tournaments_competition_type_idx on public.tournaments (competition_type);
create index tournaments_format_idx on public.tournaments (format);

-- Tournament participants
create table public.tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text,
  seed int,
  group_name text,
  created_at timestamptz not null default now(),
  unique(tournament_id, user_id)
);

alter table public.tournament_participants enable row level security;

create policy "Anyone can view tournament participants"
  on public.tournament_participants
  for select
  using (true);

create policy "Users can register themselves"
  on public.tournament_participants
  for insert
  with check (auth.uid() = user_id);

create policy "Admin can manage participants"
  on public.tournament_participants
  for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create index tournament_participants_tournament_idx on public.tournament_participants (tournament_id);
create index tournament_participants_user_idx on public.tournament_participants (user_id);

-- Trigger for tournaments updated_at
create trigger update_tournaments_updated_at
  before update on public.tournaments
  for each row execute procedure public.update_updated_at_column();

-- Payments table (track all payments)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  amount decimal(10,2) not null,
  currency text not null default 'EUR',
  payment_type text not null, -- 'subscription', 'booking', 'course', 'event', 'product'
  reference_id uuid, -- ID of related booking/course/event/product
  payment_method text, -- 'stripe', 'cash', 'bank_transfer'
  status text not null default 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  stripe_payment_id text,
  metadata jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Users can view their payments"
  on public.payments
  for select
  using (auth.uid() = user_id or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create policy "System can create payments"
  on public.payments
  for insert
  with check (true);

create policy "System can update payments"
  on public.payments
  for update
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gestore', 'admin')
  ));

create index payments_user_idx on public.payments (user_id);
create index payments_status_idx on public.payments (status);
create index payments_type_idx on public.payments (payment_type);
create index payments_created_idx on public.payments (created_at);

-- Helper function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply update triggers
create trigger update_services_updated_at
  before update on public.services
  for each row execute procedure public.update_updated_at_column();

create trigger update_products_updated_at
  before update on public.products
  for each row execute procedure public.update_updated_at_column();

create trigger update_courses_updated_at
  before update on public.courses
  for each row execute procedure public.update_updated_at_column();

create trigger update_enrollments_updated_at
  before update on public.enrollments
  for each row execute procedure public.update_updated_at_column();

create trigger update_events_updated_at
  before update on public.events
  for each row execute procedure public.update_updated_at_column();

create trigger update_event_registrations_updated_at
  before update on public.event_registrations
  for each row execute procedure public.update_updated_at_column();

create trigger update_news_updated_at
  before update on public.news
  for each row execute procedure public.update_updated_at_column();

create trigger update_payments_updated_at
  before update on public.payments
  for each row execute procedure public.update_updated_at_column();
