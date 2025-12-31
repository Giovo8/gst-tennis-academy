-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for chat attachments
CREATE POLICY "Authenticated users can upload chat attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Authenticated users can view chat attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete their own chat attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[2]
  );
