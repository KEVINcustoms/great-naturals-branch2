-- Update Customer RLS Policies to Allow All Users to See All Customer Data
-- This script removes the restriction that users can only see their own customers

-- Step 1: Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;

-- Step 2: Create a new policy that allows all authenticated users to view all customers
CREATE POLICY "All authenticated users can view all customers"
ON public.customers FOR SELECT
TO authenticated USING (true);

-- Step 3: Update the update policy to allow users to update any customer (not just their own)
DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;

CREATE POLICY "Users can update any customer"
ON public.customers FOR UPDATE
TO authenticated USING (true);

-- Step 4: Verify the new policies
-- Check what policies exist on the customers table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'customers'
ORDER BY policyname;

-- Step 5: Test the new access
-- This should now return all customers for any authenticated user
-- SELECT COUNT(*) FROM public.customers;
