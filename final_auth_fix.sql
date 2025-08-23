-- Complete Authentication Fix and Admin User Setup
-- Run this script in the Supabase SQL Editor to fix all authentication issues

-- Step 1: Fix the profile insert policy to allow new user registration
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation for new users" ON public.profiles;

CREATE POLICY "Allow profile creation for new users"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- Step 2: Update the trigger function to use the correct admin email
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

-- Step 3: Create the admin user if it doesn't exist
-- First, check if the admin user already exists in auth.users
DO $$
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
END $$;

-- Step 4: Create admin profile if it doesn't exist
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
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

-- Step 5: Ensure all necessary policies are in place
-- Profiles policies
CREATE POLICY IF NOT EXISTS "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Customers policies
CREATE POLICY IF NOT EXISTS "Admins can view all customers"
ON public.customers FOR SELECT
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY IF NOT EXISTS "Users can view own customers"
ON public.customers FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Admins can insert customers"
ON public.customers FOR INSERT
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY IF NOT EXISTS "Admins can update customers"
ON public.customers FOR UPDATE
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY IF NOT EXISTS "Admins can delete customers"
ON public.customers FOR DELETE
USING (public.get_user_role(auth.uid()) = 'admin');

-- Services policies
CREATE POLICY IF NOT EXISTS "Admins can view all services"
ON public.services FOR SELECT
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY IF NOT EXISTS "Users can view all services"
ON public.services FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Admins can insert services"
ON public.services FOR INSERT
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY IF NOT EXISTS "Admins can update services"
ON public.services FOR UPDATE
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY IF NOT EXISTS "Admins can delete services"
ON public.services FOR DELETE
USING (public.get_user_role(auth.uid()) = 'admin');

-- Appointments policies
CREATE POLICY IF NOT EXISTS "Admins can view all appointments"
ON public.appointments FOR SELECT
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY IF NOT EXISTS "Users can view own appointments"
ON public.appointments FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Admins can insert appointments"
ON public.appointments FOR INSERT
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY IF NOT EXISTS "Admins can update appointments"
ON public.appointments FOR UPDATE
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY IF NOT EXISTS "Admins can delete appointments"
ON public.appointments FOR DELETE
USING (public.get_user_role(auth.uid()) = 'admin');

-- Verify the setup
SELECT 
  'Admin user created successfully' as status,
  email,
  role
FROM public.profiles 
WHERE email = 'devzoratech@gmail.com';
