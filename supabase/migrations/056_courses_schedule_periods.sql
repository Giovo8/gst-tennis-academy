-- Migration 056: Add schedule_periods column to courses
-- This allows courses to have different time slots on different days
-- e.g. Tuesday 11:00-12:00 and Saturday 13:00-14:00
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS schedule_periods jsonb;

COMMENT ON COLUMN public.courses.schedule_periods IS
  'Array of {days: string[], time: string} objects for multi-period schedules. Null for single-period courses (use schedule_days + schedule_time).';
