-- Debug and Fix Authentication Setup
-- Run this in your Supabase SQL Editor to diagnose and fix auth issues

-- Step 1: Check if admin user exists in auth.users
SELECT 
  'Admin user in auth.users' as check_type,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'devzoratech@gmail.com';

-- Step 2: Check if admin profile exists in public.profiles
SELECT 
  'Admin profile in public.profiles' as check_type,
  id,
  user_id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles 
WHERE email = 'devzoratech@gmail.com';

-- Step 3: Check if the trigger function exists and is working
SELECT 
  'Trigger function status' as check_type,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Step 4: Check if the trigger exists
SELECT 
  'Trigger status' as check_type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Step 5: Check RLS policies on profiles table
SELECT 
  'RLS Policies' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 6: If admin user doesn't exist, create it
DO $
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if admin user exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'devzoratech@gmail.com';
  
  IF admin_user_id IS NULL THEN
    -- Create admin user in auth.users (this should trigger profile creation)
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
    
    RAISE NOTICE 'Admin user created in auth.users';
  ELSE
    RAISE NOTICE 'Admin user already exists with ID: %', admin_user_id;
  END IF;
  
  -- Get the admin user ID (might be newly created)
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
    
    RAISE NOTICE 'Admin profile created in public.profiles';
  ELSE
    RAISE NOTICE 'Admin profile already exists or user ID is null';
  END IF;
END $;

-- Step 7: Verify the setup worked
SELECT 
  'Final verification' as check_type,
  u.email as auth_email,
  p.email as profile_email,
  p.role as profile_role,
  u.id as user_id,
  p.user_id as profile_user_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.email = 'devzoratech@gmail.com';