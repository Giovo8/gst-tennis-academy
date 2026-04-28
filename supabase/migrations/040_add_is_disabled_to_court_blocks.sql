-- Add is_disabled column to court_blocks for soft disable/reactivate functionality
ALTER TABLE public.court_blocks
  ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT FALSE;
