-- Fix infinite recursion in chat_group_members RLS policies
-- The error occurs because RLS policies reference each other in a circular way

-- Option 1: Disable RLS on chat tables (security handled at API layer)
ALTER TABLE chat_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view groups they are members of" ON chat_groups;
DROP POLICY IF EXISTS "Users can view their own memberships" ON chat_group_members;
DROP POLICY IF EXISTS "chat_groups_select_policy" ON chat_groups;
DROP POLICY IF EXISTS "chat_group_members_select_policy" ON chat_group_members;
DROP POLICY IF EXISTS "Enable read access for group members" ON chat_groups;
DROP POLICY IF EXISTS "Enable read access for own memberships" ON chat_group_members;

-- Note: Security is enforced at the API layer using supabaseServer (service role)
-- All chat group operations go through /api/chat-groups/* endpoints
