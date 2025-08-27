# Authentication Test Guide

## Prerequisites
1. Run the `final_auth_fix.sql` script in your Supabase SQL Editor
2. Make sure your Supabase project is properly configured

## Test Steps

### 1. Test Admin Login
- **Email:** devzoratech@gmail.com
- **Password:** admin123
- **Expected Result:** Should log in successfully and redirect to dashboard with admin privileges

### 2. Test New User Registration
- Try creating a new account with a different email
- **Expected Result:** Should create account successfully and create profile automatically

### 3. Test User Login
- Log out and try logging in with the newly created account
- **Expected Result:** Should log in successfully with user privileges

### 4. Test Profile Creation
- Check if profiles are created automatically for new users
- **Expected Result:** Profile should be created with correct role assignment

## Troubleshooting

### If Admin Login Fails:
1. Check if the admin user was created in `auth.users` table
2. Check if the admin profile was created in `public.profiles` table
3. Verify the trigger function is working correctly

### If New User Registration Fails:
1. Check RLS policies on the `profiles` table
2. Verify the `handle_new_user()` trigger function
3. Check browser console for specific error messages

### If Profile Fetching Fails:
1. Check the `useAuth` hook retry logic
2. Verify the profile exists in the database
3. Check RLS policies for profile access

## Database Verification Queries

Run these in Supabase SQL Editor to verify setup:

```sql
-- Check if admin user exists
SELECT * FROM auth.users WHERE email = 'devzoratech@gmail.com';

-- Check if admin profile exists
SELECT * FROM public.profiles WHERE email = 'devzoratech@gmail.com';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check trigger function
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```







