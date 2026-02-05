-- Add booking_participants table for multiple participants per booking

create table public.booking_participants (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings on delete cascade,
  user_id uuid references auth.users on delete set null,
  full_name text not null,
  email text,
  is_registered boolean default false,
  participant_type text default 'atleta', -- 'atleta', 'ospite'
  order_index int not null default 0, -- For ordering (0, 1, 2, 3)
  created_at timestamptz not null default now(),
  
  constraint order_index_range check (order_index >= 0 and order_index < 4),
  constraint max_four_participants check (order_index < 4),
  unique(booking_id, order_index)
);

alter table public.booking_participants enable row level security;

-- RLS: Users can view participants of their bookings
create policy "Users can view participants"
  on public.booking_participants
  for select
  using (
    auth.uid() = user_id
    or auth.uid() = (
      select user_id from public.bookings where id = booking_id
    )
    or auth.uid() = (
      select coach_id from public.bookings where id = booking_id
    )
    or public.get_my_role() in ('admin', 'gestore')
  );

-- RLS: Only booking owner or admin can manage participants
create policy "Booking owners can manage participants"
  on public.booking_participants
  for all
  using (
    auth.uid() = (
      select user_id from public.bookings where id = booking_id
    )
    or public.get_my_role() in ('admin', 'gestore')
  );

-- Indexes for performance
create index booking_participants_booking_idx on public.booking_participants (booking_id);
create index booking_participants_user_idx on public.booking_participants (user_id);
create index booking_participants_registered_idx on public.booking_participants (is_registered);

-- Trigger to prevent more than 4 participants per booking
create or replace function public.check_booking_participants_limit()
returns trigger
language plpgsql
as $$
declare
  participant_count int;
begin
  select count(*) into participant_count
  from public.booking_participants
  where booking_id = new.booking_id;
  
  if participant_count > 4 then
    raise exception 'Massimo 4 partecipanti per prenotazione';
  end if;
  
  return new;
end;
$$;

create trigger check_booking_participants_limit_trigger
  before insert on public.booking_participants
  for each row
  execute procedure public.check_booking_participants_limit();
