-- Migration: Miglioramento sistema ruoli e permessi admin
-- Data: 2025-12-26
-- Esegui questo file nel SQL Editor di Supabase

-- Step 1: Aggiungi nuove policy per gli admin

-- Policy per permettere agli admin di vedere tutti i profili
create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'gestore')
    )
  );

-- Policy per permettere agli admin di aggiornare tutti i profili
create policy "Admins can update all profiles"
  on public.profiles
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'gestore')
    )
  );

-- Policy per permettere agli admin di inserire nuovi profili
create policy "Admins can insert profiles"
  on public.profiles
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'gestore')
    )
  );

-- Step 2: Aggiorna policy per le prenotazioni (coach possono vedere tutte le prenotazioni)

drop policy if exists "Maestro can view all bookings" on public.bookings;

create policy "Maestro can view all bookings"
  on public.bookings
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('maestro', 'gestore', 'admin')
    )
  );

-- Step 3: Funzione helper per verificare il ruolo
create or replace function public.user_has_role(required_role user_role)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = required_role
  );
end;
$$;

create or replace function public.user_is_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'gestore')
  );
end;
$$;

create or replace function public.user_is_coach()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('maestro', 'admin', 'gestore')
  );
end;
$$;

-- Step 4: Aggiorna trigger per creare automaticamente il profilo quando un utente si registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'atleta')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Step 5: Verifica policy esistenti
-- Se ci sono conflitti, rimuovi le vecchie policy e ricrea quelle nuove

-- Lista tutte le policy sulla tabella profiles per verifica
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles';

-- Fine migrazione
-- Nota: Dopo aver eseguito questa migrazione, gli admin potranno:
-- 1. Vedere tutti i profili utente
-- 2. Modificare ruoli e informazioni di qualsiasi utente
-- 3. Creare nuovi utenti tramite l'API /api/admin/users
