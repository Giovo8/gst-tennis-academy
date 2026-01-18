-- Create chat_groups table for group chats
CREATE TABLE IF NOT EXISTS chat_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_group_members table for group membership
CREATE TABLE IF NOT EXISTS chat_group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Add group_id column to internal_messages (nullable for backwards compatibility)
ALTER TABLE internal_messages
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE;

-- Remove the constraint that sender != recipient for group messages (if exists)
ALTER TABLE internal_messages DROP CONSTRAINT IF EXISTS different_sender_recipient;

-- Make recipient_id nullable for group messages
ALTER TABLE internal_messages ALTER COLUMN recipient_id DROP NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_groups_created_by ON chat_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user ON chat_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_group ON chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_group ON internal_messages(group_id, created_at DESC);

-- Function to update updated_at timestamp for chat_groups
CREATE OR REPLACE FUNCTION update_chat_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_chat_groups_timestamp ON chat_groups;
CREATE TRIGGER update_chat_groups_timestamp
BEFORE UPDATE ON chat_groups
FOR EACH ROW
EXECUTE FUNCTION update_chat_groups_updated_at();

-- Note: Security is handled at the API layer using supabaseServer (service role)
-- No RLS policies needed - access control is enforced in the API routes
