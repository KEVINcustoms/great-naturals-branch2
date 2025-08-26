-- Add required columns to profiles table for admin management
-- Run this script in your Supabase SQL editor

-- Add is_active column (default: true)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add access_level column (default: 'full')
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'full';

-- Add constraint to ensure access_level has valid values (drop first if exists)
DO $$ 
BEGIN
    -- Drop constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_access_level' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT check_access_level;
    END IF;
    
    -- Add the constraint
    ALTER TABLE profiles ADD CONSTRAINT check_access_level 
    CHECK (access_level IN ('full', 'restricted', 'banned'));
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists, do nothing
        NULL;
END $$;

-- Update existing profiles to have default values
UPDATE profiles SET 
  is_active = COALESCE(is_active, true),
  access_level = COALESCE(access_level, 'full')
WHERE is_active IS NULL OR access_level IS NULL;

-- Verify the changes - using actual column names from profiles table
SELECT id, email, role, is_active, access_level, created_at 
FROM profiles 
ORDER BY created_at DESC;
