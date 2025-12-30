-- Check if announcements exist in the database
SELECT 
  id,
  title,
  announcement_type,
  priority,
  visibility,
  is_published,
  is_pinned,
  created_at,
  author_id,
  expiry_date
FROM announcements
ORDER BY created_at DESC
LIMIT 10;

-- Check RLS policies on announcements
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'announcements';

-- Check if your user has admin role
SELECT id, email, full_name, role 
FROM profiles 
WHERE role IN ('admin', 'gestore')
ORDER BY created_at DESC;
