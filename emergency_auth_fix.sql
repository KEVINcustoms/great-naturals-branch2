-- EMERGENCY AUTHENTICATION FIX
-- Run this script immediately in your Supabase SQL Editor to fix the authentication issues

-- Step 1: Drop all existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation for new users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Step 2: Create new policies that allow profile creation
CREATE POLICY "Allow profile creation for new users"
ON public.profiles FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.get_user_role(auth.uid()) = 'admin');

-- Step 3: Update the trigger function to handle the admin email correctly
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Create the admin user manually if it doesn't exist
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if admin user exists in auth.users
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'devzoratech@gmail.com'
  ) THEN
    -- Create admin user in auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'devzoratech@gmail.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Admin User"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;
  
  -- Get the admin user ID
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'devzoratech@gmail.com';
  
  -- Create admin profile if it doesn't exist
  IF admin_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = admin_user_id
  ) THEN
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (admin_user_id, 'devzoratech@gmail.com', 'Admin User', 'admin');
  END IF;
END $$;

-- Step 6: Verify the setup
SELECT 
  'Admin user status' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'devzoratech@gmail.com') 
    THEN 'Admin user exists in auth.users'
    ELSE 'Admin user missing from auth.users'
  END as status;

SELECT 
  'Admin profile status' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE email = 'devzoratech@gmail.com') 
    THEN 'Admin profile exists in public.profiles'
    ELSE 'Admin profile missing from public.profiles'
  END as status;

SELECT 
  'Profile policies status' as check_type,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'profiles';

SELECT 
  'Trigger status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'on_auth_user_created'
    ) 
    THEN 'Trigger exists'
    ELSE 'Trigger missing'
  END as status;




