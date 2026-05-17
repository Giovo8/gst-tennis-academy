-- Migration 051: Add fee column to course_enrollments
-- Stores the individual fee agreed for this student in this course

ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS fee numeric(10,2);
