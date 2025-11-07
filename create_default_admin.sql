-- Create default admin user profile
-- This script should be run AFTER creating the user through Supabase Auth

-- Create the profile for the admin user (assuming user already exists in auth.users)
INSERT INTO public.profiles (user_id, email, full_name, role)
SELECT 
  id,
  email,
  'Admin User',
  'admin'::app_role
FROM auth.users 
WHERE email = 'kevouganda7@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;
