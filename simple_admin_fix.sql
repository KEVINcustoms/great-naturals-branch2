-- SIMPLE ADMIN USER FIX
-- This script creates the admin user directly without relying on triggers

-- Step 1: Fix the profile insert policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation for new users" ON public.profiles;

CREATE POLICY "Allow profile creation for new users"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- Step 2: Create admin user directly in auth.users (if not exists)
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if admin user already exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'devzoratech@gmail.com'
  ) THEN
    -- Create admin user
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
  
  -- Create admin profile directly (if not exists)
  IF admin_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = admin_user_id
  ) THEN
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (admin_user_id, 'devzoratech@gmail.com', 'Admin User', 'admin');
  END IF;
END $$;

-- Step 3: Test the admin user
SELECT 
  'Admin user created successfully' as message,
  email,
  role
FROM public.profiles 
WHERE email = 'devzoratech@gmail.com';
