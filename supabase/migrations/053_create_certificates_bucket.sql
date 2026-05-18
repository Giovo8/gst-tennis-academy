-- Create certificates storage bucket for medical certificates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: only admins/gestori can upload
CREATE POLICY "Admin gestori upload certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificates'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'gestore')
  )
);

-- RLS: public read (signed URL not needed since bucket is public)
CREATE POLICY "Public read certificates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certificates');

-- RLS: admins/gestori can delete
CREATE POLICY "Admin gestori delete certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'certificates'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'gestore')
  )
);
