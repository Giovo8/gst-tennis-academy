-- Check current profiles and their roles
SELECT id, email, full_name, role, user_role 
FROM profiles 
LIMIT 10;

-- If you need to update YOUR user to be admin, replace YOUR_USER_ID with your actual user ID
-- You can find it by looking at auth.users table or checking in Supabase Auth dashboard

-- Update a specific user to admin (uncomment and replace YOUR_USER_ID)
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE id = 'YOUR_USER_ID';

-- Or update by email (uncomment and replace YOUR_EMAIL)
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE email = 'YOUR_EMAIL';

-- Verify the update
-- SELECT id, email, full_name, role 
-- FROM profiles 
-- WHERE id = 'YOUR_USER_ID' OR email = 'YOUR_EMAIL';
