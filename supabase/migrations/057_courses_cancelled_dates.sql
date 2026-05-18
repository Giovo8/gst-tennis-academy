-- Migration 057: Add cancelled_dates column to courses
-- Stores individual lesson dates that have been cancelled/deleted
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS cancelled_dates text[] DEFAULT '{}';
