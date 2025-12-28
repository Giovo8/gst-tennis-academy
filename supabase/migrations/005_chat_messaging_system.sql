-- Migration: Chat/Messaging System
-- Description: Sistema di messaggistica per comunicazione tra utenti (atleti, maestri, admin)
-- Date: 2025-12-28

-- Step 1: Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255), -- Optional: per conversazioni di gruppo
  is_group BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  metadata JSONB DEFAULT '{}'::jsonb -- Per dati aggiuntivi (es: topic, related_booking_id, etc.)
);

-- Step 2: Create conversation_participants table (many-to-many)
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INT DEFAULT 0,
  is_admin BOOLEAN DEFAULT false, -- Per conversazioni di gruppo
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Step 3: Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- text, image, file, system
  attachment_url TEXT,
  attachment_metadata JSONB, -- {filename, size, mime_type}
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT messages_type_check CHECK (message_type IN ('text', 'image', 'file', 'system', 'booking', 'lesson'))
);

-- Step 4: Create message_reads table (per tracciare letture individuali)
CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_unread ON conversation_participants(user_id, unread_count) WHERE unread_count > 0;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id);

-- Step 6: RLS Policies for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can view conversations they participate in
CREATE POLICY "conversations_select_participants" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Admin/gestore can view all conversations
CREATE POLICY "conversations_select_admin" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Users can create conversations
CREATE POLICY "conversations_insert_authenticated" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Participants and admins can update conversations
CREATE POLICY "conversations_update_participants" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Only creator or admin can delete conversations
CREATE POLICY "conversations_delete_creator_admin" ON conversations
  FOR DELETE USING (
    conversations.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Step 7: RLS Policies for conversation_participants
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Users can view participants of conversations they're in
CREATE POLICY "conversation_participants_select" ON conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Conversation admins can add participants
CREATE POLICY "conversation_participants_insert" ON conversation_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND conversations.created_by = auth.uid()
    )
    OR conversation_participants.user_id = auth.uid()
  );

-- Users can update their own participant record
CREATE POLICY "conversation_participants_update_own" ON conversation_participants
  FOR UPDATE USING (
    conversation_participants.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Users can leave conversations (delete their participant record)
CREATE POLICY "conversation_participants_delete_own" ON conversation_participants
  FOR DELETE USING (
    conversation_participants.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Step 8: RLS Policies for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages from conversations they participate in
CREATE POLICY "messages_select_participants" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Users can insert messages in conversations they participate in
CREATE POLICY "messages_insert_participants" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
    AND messages.sender_id = auth.uid()
  );

-- Users can update only their own messages
CREATE POLICY "messages_update_own" ON messages
  FOR UPDATE USING (
    messages.sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Users can delete only their own messages
CREATE POLICY "messages_delete_own" ON messages
  FOR DELETE USING (
    messages.sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role IN ('admin', 'gestore')
    )
  );

-- Step 9: RLS Policies for message_reads
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Users can view read receipts for their conversations
CREATE POLICY "message_reads_select" ON message_reads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE m.id = message_reads.message_id
      AND cp.user_id = auth.uid()
    )
  );

-- Users can mark messages as read
CREATE POLICY "message_reads_insert_own" ON message_reads
  FOR INSERT WITH CHECK (
    message_reads.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE m.id = message_reads.message_id
      AND cp.user_id = auth.uid()
    )
  );

-- Step 10: Create function to update conversation last_message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create trigger for conversation last_message update
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Step 12: Create function to update unread counts
CREATE OR REPLACE FUNCTION update_unread_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment unread count for all participants except sender
  UPDATE conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
  AND user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Create trigger for unread counts
DROP TRIGGER IF EXISTS trigger_update_unread_counts ON messages;
CREATE TRIGGER trigger_update_unread_counts
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_counts();

-- Step 14: Create function to reset unread count on read
CREATE OR REPLACE FUNCTION reset_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversation_participants
  SET 
    unread_count = 0,
    last_read_at = NEW.read_at
  WHERE conversation_id = (
    SELECT conversation_id FROM messages WHERE id = NEW.message_id
  )
  AND user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 15: Create trigger for reset unread count
DROP TRIGGER IF EXISTS trigger_reset_unread_count ON message_reads;
CREATE TRIGGER trigger_reset_unread_count
  AFTER INSERT ON message_reads
  FOR EACH ROW
  EXECUTE FUNCTION reset_unread_count();

-- Step 16: Create helper function to get or create 1-on-1 conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_uuid UUID;
BEGIN
  -- Check if conversation already exists between these two users
  SELECT c.id INTO conversation_uuid
  FROM conversations c
  WHERE c.is_group = false
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id
  )
  AND (
    SELECT COUNT(*) FROM conversation_participants cp
    WHERE cp.conversation_id = c.id
  ) = 2
  LIMIT 1;
  
  -- If not found, create new conversation
  IF conversation_uuid IS NULL THEN
    INSERT INTO conversations (is_group, created_by)
    VALUES (false, user1_id)
    RETURNING id INTO conversation_uuid;
    
    -- Add both users as participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conversation_uuid, user1_id), (conversation_uuid, user2_id);
  END IF;
  
  RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql;

-- Step 17: Add comments for documentation
COMMENT ON TABLE conversations IS 'Conversazioni chat tra utenti (1-on-1 o gruppi)';
COMMENT ON TABLE conversation_participants IS 'Partecipanti delle conversazioni con stato lettura/archiviazione';
COMMENT ON TABLE messages IS 'Messaggi delle conversazioni con supporto allegati e reply';
COMMENT ON TABLE message_reads IS 'Tracciamento lettura messaggi per read receipts';

COMMENT ON COLUMN conversations.is_group IS 'true per conversazioni di gruppo, false per 1-on-1';
COMMENT ON COLUMN conversation_participants.unread_count IS 'Numero messaggi non letti per questo utente';
COMMENT ON COLUMN messages.message_type IS 'Tipo: text, image, file, system, booking, lesson';
COMMENT ON COLUMN messages.reply_to_message_id IS 'ID del messaggio a cui si risponde (per thread)';

-- Migration completed successfully!
-- Next steps: Create API endpoints for chat functionality
