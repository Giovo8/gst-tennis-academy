-- Fix announcement_views table and policies
-- Run this script to add the missing table without resetting the entire database

-- Drop existing if exists (in case of partial creation)
DROP TABLE IF EXISTS public.announcement_views CASCADE;

-- Create announcement_views table
CREATE TABLE public.announcement_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- Create indexes
CREATE INDEX announcement_views_announcement_idx ON public.announcement_views (announcement_id);
CREATE INDEX announcement_views_user_idx ON public.announcement_views (user_id);

-- Enable RLS
ALTER TABLE public.announcement_views ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own announcement views" ON public.announcement_views;
DROP POLICY IF EXISTS "Users can insert their own announcement views" ON public.announcement_views;

-- Create RLS policies
CREATE POLICY "Users can view their own announcement views"
  ON public.announcement_views FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own announcement views"
  ON public.announcement_views FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT ON public.announcement_views TO authenticated;
GRANT SELECT, INSERT ON public.announcement_views TO anon;
