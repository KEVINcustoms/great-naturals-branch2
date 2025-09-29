-- Update user access level to 'basic' for proper sidebar display
-- This will make the sidebar show menu items for regular users

UPDATE public.profiles 
SET access_level = 'basic'
WHERE email = 'hammyckluz@gmail.com';

-- Verify the update
SELECT email, role, access_level, is_active 
FROM public.profiles 
WHERE email = 'hammyckluz@gmail.com';
