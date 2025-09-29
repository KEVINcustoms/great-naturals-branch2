-- Add missing columns to profiles table
-- This will fix the "column does not exist" errors

-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing profiles to have proper values
UPDATE public.profiles 
SET 
  access_level = CASE 
    WHEN role = 'admin' THEN 'full'
    ELSE 'basic'
  END,
  is_active = true
WHERE access_level IS NULL OR is_active IS NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_profiles_access_level ON public.profiles(access_level);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Test the fix
SELECT 'Missing columns added successfully!' as status;
