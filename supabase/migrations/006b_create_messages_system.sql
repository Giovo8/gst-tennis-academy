-- Create internal_messages table for internal messaging system
CREATE TABLE IF NOT EXISTS internal_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  parent_message_id UUID REFERENCES internal_messages(id) ON DELETE SET NULL,
  
  CONSTRAINT different_sender_recipient CHECK (sender_id != recipient_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_internal_messages_recipient ON internal_messages(recipient_id, created_at DESC);
CREATE INDEX idx_internal_messages_sender ON internal_messages(sender_id, created_at DESC);
CREATE INDEX idx_internal_messages_unread ON internal_messages(recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_internal_messages_parent ON internal_messages(parent_message_id);

-- Enable Row Level Security
ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages they sent or received
CREATE POLICY "Users can read their own messages"
ON internal_messages FOR SELECT
USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);

-- Policy: Users can send messages to any user
CREATE POLICY "Users can send messages"
ON internal_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
);

-- Policy: Users can update messages they received (mark as read)
CREATE POLICY "Recipients can mark messages as read"
ON internal_messages FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Policy: Users can delete messages they sent or received
CREATE POLICY "Users can delete their own messages"
ON internal_messages FOR DELETE
USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_internal_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_internal_messages_timestamp
BEFORE UPDATE ON internal_messages
FOR EACH ROW
EXECUTE FUNCTION update_internal_messages_updated_at();
