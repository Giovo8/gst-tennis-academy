-- Migration: User Presence System for Online/Offline Status
-- Description: Sistema per tracciare lo stato online/offline degli utenti
-- Date: 2026-01-01

-- Step 1: Create user_presence table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'offline', -- online, offline, away, busy
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT user_presence_status_check CHECK (status IN ('online', 'offline', 'away', 'busy'))
);

-- Step 2: Create typing_indicators table
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(conversation_id, user_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_user ON typing_indicators(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_is_typing ON typing_indicators(conversation_id, is_typing) WHERE is_typing = true;

-- Step 4: Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies for user_presence
-- Everyone can view presence (for online indicators)
CREATE POLICY "user_presence_select_all" ON user_presence
  FOR SELECT USING (true);

-- Users can update their own presence
CREATE POLICY "user_presence_update_own" ON user_presence
  FOR UPDATE USING (user_id = auth.uid());

-- Users can insert their own presence
CREATE POLICY "user_presence_insert_own" ON user_presence
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Step 6: RLS Policies for typing_indicators
-- Users can view typing indicators in conversations they participate in
CREATE POLICY "typing_indicators_select_participants" ON typing_indicators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = typing_indicators.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Users can insert/update their own typing indicators
CREATE POLICY "typing_indicators_insert_own" ON typing_indicators
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "typing_indicators_update_own" ON typing_indicators
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "typing_indicators_delete_own" ON typing_indicators
  FOR DELETE USING (user_id = auth.uid());

-- Step 7: Function to automatically update last_seen on presence update
CREATE OR REPLACE FUNCTION update_user_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'online' OR NEW.status = 'away' OR NEW.status = 'busy' THEN
    NEW.last_seen = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_presence_timestamp
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_user_presence_timestamp();

-- Step 8: Function to automatically clean up old typing indicators
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  -- Remove typing indicators older than 10 seconds
  DELETE FROM typing_indicators
  WHERE is_typing = true 
  AND updated_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Optional: Setup periodic cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-typing-indicators', '*/30 * * * *', 'SELECT cleanup_old_typing_indicators()');

COMMENT ON TABLE user_presence IS 'Tracks real-time online/offline status of users';
COMMENT ON TABLE typing_indicators IS 'Tracks typing indicators in conversations';
COMMENT ON COLUMN user_presence.status IS 'User current status: online, offline, away, busy';
COMMENT ON COLUMN user_presence.last_seen IS 'Timestamp when user was last active (online/away/busy)';
