-- Test Script: Verify Hybrid Data Access (All Customers + Own Services Only)
-- Run this after applying the policy updates

-- ========================================
-- TEST 1: Verify Customer Access Policies
-- ========================================

-- Check current customer policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'customers'
ORDER BY policyname;

-- Expected result should show:
-- - "Admins can manage all customers" (FOR ALL)
-- - "All authenticated users can view all customers" (FOR SELECT)
-- - "All authenticated users can update any customer" (FOR UPDATE)

-- ========================================
-- TEST 2: Verify Service Access Policies
-- ========================================

-- Check current service policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'services'
ORDER BY policyname;

-- Expected result should show:
-- - "Admins can manage all services" (FOR ALL)
-- - "Users can view their own services" (FOR SELECT - restricted to created_by = auth.uid())
-- - "Users can create services" (FOR INSERT - restricted to created_by = auth.uid())
-- - "Users can update their own services" (FOR UPDATE - restricted to created_by = auth.uid())

-- ========================================
-- TEST 3: Verify Service Products Access Policies
-- ========================================

-- Check current service_products policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'service_products'
ORDER BY policyname;

-- Expected result should show:
-- - "Users can view service products for their services" (FOR SELECT - restricted to own services)
-- - "Users can create service products for their services" (FOR INSERT - restricted to own services)
-- - "Users can update service products for their services" (FOR UPDATE - restricted to own services)
-- - "Users can delete service products for their services" (FOR DELETE - restricted to own services)

-- ========================================
-- TEST 4: Verify Data Access (Run as different users)
-- ========================================

-- Test customer access - should return ALL customers for any authenticated user
-- SELECT COUNT(*) FROM public.customers;

-- Test service access - should only return services created by the current user
-- SELECT COUNT(*) FROM public.services;

-- Test service_products access - should only return products for services created by the current user
-- SELECT COUNT(*) FROM public.service_products;

-- ========================================
-- TEST 5: Sample Queries to Verify Hybrid Access
-- ========================================

-- Test viewing all customers with their details (should work for all users)
-- SELECT 
--     c.id,
--     c.name,
--     c.email,
--     c.phone,
--     c.created_at,
--     c.created_by,
--     p.full_name as created_by_name
-- FROM public.customers c
-- LEFT JOIN public.profiles p ON c.created_by = p.id
-- ORDER BY c.created_at DESC
-- LIMIT 10;

-- Test viewing own services only (should only show user's own services)
-- SELECT 
--     s.id,
--     s.service_name,
--     s.service_category,
--     s.service_price,
--     s.status,
--     s.date_time,
--     c.name as customer_name,
--     s.created_by,
--     p.full_name as created_by_name
-- FROM public.services s
-- LEFT JOIN public.customers c ON s.customer_id = c.id
-- LEFT JOIN public.profiles p ON s.created_by = p.id
-- ORDER BY s.date_time DESC
-- LIMIT 10;

-- ========================================
-- SUMMARY OF EXPECTED RESULTS
-- ========================================

/*
AFTER APPLYING THE POLICY UPDATES:

✅ CUSTOMERS TABLE:
   - All authenticated users can SELECT all customers
   - All authenticated users can UPDATE any customer
   - Admins retain full management access
   - Full customer collaboration enabled

❌ SERVICES TABLE:
   - Users can only SELECT their own services (created_by = auth.uid())
   - Users can only UPDATE their own services
   - Users can only INSERT services for themselves
   - Service privacy maintained
   - Admins can see and manage all services

❌ SERVICE_PRODUCTS TABLE:
   - Users can only SELECT products for their own services
   - Users can only UPDATE products for their own services
   - Users can only INSERT products for their own services
   - Users can only DELETE products for their own services
   - Service product privacy maintained

✅ DATA ACCESS:
   - ✅ All users can see ALL customer data (in both Customers and Services tabs)
   - ❌ Users can only see their own services (restricted access)
   - ❌ Users can only see service products for their own services (restricted access)
   - Full customer collaboration across all salon staff
   - Service privacy maintained for individual accountability
   - Admin oversight for all data

✅ SECURITY MAINTAINED:
   - Only authenticated users can access data
   - Admin policies remain unchanged
   - Row Level Security still active
   - No unauthorized external access
   - Hybrid approach: collaboration + privacy
*/
