-- Migration 007: Add policy for users to search other profiles for messaging

-- Allow all authenticated users to view basic profile info of other users
CREATE POLICY "Users can view other users for messaging"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Note: This policy allows all authenticated users to search and view other user profiles
-- This is necessary for the internal messaging/chat system
