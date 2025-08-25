-- Complete setup script for admin user and authentication fix
-- Run this in the Supabase SQL Editor

-- Step 1: Fix the authentication issue by updating the profile insert policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

CREATE POLICY "Allow profile creation for new users"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- Step 2: Ensure the trigger function is properly configured
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    CASE 
      WHEN NEW.email = 'devzoratech@gmail.com' THEN 'admin'::app_role
      ELSE 'user'::app_role
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Verify the trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Step 4: Create admin user profile if it doesn't exist
-- (This assumes the user was created through Supabase Auth)
INSERT INTO public.profiles (user_id, email, full_name, role)
SELECT 
  id,
  email,
  'Admin User',
  'admin'::app_role
FROM auth.users 
WHERE email = 'devzoratech@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;




