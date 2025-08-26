-- Update Customer and Service RLS Policies for Hybrid Access
-- This script allows all users to see ALL customer data but restricts services to user's own services

-- ========================================
-- CUSTOMERS TABLE POLICIES
-- ========================================

-- Step 1: Drop existing restrictive customer policies
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;

-- Step 2: Create new customer policies that allow all authenticated users full access to ALL customers
CREATE POLICY "All authenticated users can view all customers"
ON public.customers FOR SELECT
TO authenticated USING (true);

CREATE POLICY "All authenticated users can update any customer"
ON public.customers FOR UPDATE
TO authenticated USING (true);

-- Note: Keep the existing admin policy for full management
-- CREATE POLICY "Admins can manage all customers" ON public.customers FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- ========================================
-- SERVICES TABLE POLICIES
-- ========================================

-- Step 3: Keep existing restrictive service policies (users can only see their own services)
-- DO NOT DROP these policies - we want to maintain service restrictions

-- Existing policies should remain:
-- CREATE POLICY "Users can view their own services" ON public.services FOR SELECT USING (created_by = auth.uid());
-- CREATE POLICY "Users can create services" ON public.services FOR INSERT WITH CHECK (created_by = auth.uid());
-- CREATE POLICY "Users can update their own services" ON public.services FOR UPDATE USING (created_by = auth.uid());
-- CREATE POLICY "Admins can manage all services" ON public.services FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- ========================================
-- SERVICE_PRODUCTS TABLE POLICIES
-- ========================================

-- Step 4: Keep existing restrictive service_products policies (users can only see products for their own services)
-- DO NOT DROP these policies - we want to maintain service product restrictions

-- Existing policies should remain:
-- CREATE POLICY "Users can view service products for their services" ON public.service_products FOR SELECT USING (
--   EXISTS (
--     SELECT 1 FROM public.services 
--     WHERE services.id = service_products.service_id 
--     AND (services.created_by = auth.uid() OR get_user_role(auth.uid()) = 'admin'::app_role)
--   )
-- );

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

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

-- Check what policies exist on the services table
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
WHERE tablename = 'services'
ORDER BY policyname;

-- Check what policies exist on the service_products table
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
WHERE tablename = 'service_products'
ORDER BY policyname;

-- ========================================
-- TEST QUERIES (uncomment to test)
-- ========================================

-- Test customer access - should now return ALL customers for any authenticated user
-- SELECT COUNT(*) FROM public.customers;

-- Test service access - should only return services created by the current user
-- SELECT COUNT(*) FROM public.services;

-- Test service_products access - should only return products for services created by the current user
-- SELECT COUNT(*) FROM public.service_products;

-- ========================================
-- SUMMARY OF CHANGES
-- ========================================

/*
CHANGES MADE:

1. CUSTOMERS TABLE:
   - ❌ Removed: "Users can view their own customers" (restrictive)
   - ❌ Removed: "Users can update their own customers" (restrictive)
   - ✅ Added: "All authenticated users can view all customers"
   - ✅ Added: "All authenticated users can update any customer"

2. SERVICES TABLE:
   - ✅ KEPT: "Users can view their own services" (restrictive - users only see their own)
   - ✅ KEPT: "Users can create services" (restrictive - users can only create for themselves)
   - ✅ KEPT: "Users can update their own services" (restrictive - users can only update their own)
   - ✅ KEPT: "Admins can manage all services" (admin policy unchanged)

3. SERVICE_PRODUCTS TABLE:
   - ✅ KEPT: "Users can view service products for their services" (restrictive - only for their own services)
   - ✅ KEPT: All other restrictive service_products policies

RESULT:
- ✅ All authenticated users can now see ALL customer data (in both Customers and Services tabs)
- ❌ Users can only see services they created (restricted access maintained)
- ❌ Users can only see service products for services they created (restricted access maintained)
- ✅ Admin policies remain unchanged for full system management
- ✅ Full customer collaboration while maintaining service privacy
*/
