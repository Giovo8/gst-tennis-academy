-- Migration: Add missing columns to courses table
-- Date: 2026-05-17
-- Description: Aggiunge le colonne necessarie alla tabella courses:
--   name, price_per_month, schedule_days, schedule_time,
--   instructor_name, court_name (usate dall'interfaccia admin)

-- Rinomina title -> name se la colonna si chiama ancora 'title'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'title'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.courses RENAME COLUMN title TO name;
  END IF;
END $$;

-- Aggiunge 'name' se non esiste ancora (es. tabella ricreata senza title)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS name text;

-- price_per_month (la colonna originale potrebbe chiamarsi 'price')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'price'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'price_per_month'
  ) THEN
    ALTER TABLE public.courses RENAME COLUMN price TO price_per_month;
  END IF;
END $$;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS price_per_month numeric(10,2) NOT NULL DEFAULT 0;

-- schedule_days: array di giorni (es. ['lun','mer','ven'])
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS schedule_days text[] NOT NULL DEFAULT '{}';

-- schedule_time: fascia oraria testuale (es. '09:00 – 10:30')
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS schedule_time text;

-- instructor_name: nome/i maestro/i separati da virgola
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS instructor_name text;

-- court_name: campo dove si svolge il corso
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS court_name text;

-- Rendi start_date e end_date opzionali se non lo sono già
ALTER TABLE public.courses
  ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE public.courses
  ALTER COLUMN end_date DROP NOT NULL;
