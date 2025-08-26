-- Update service_products table to reference inventory_items instead of products
-- This script fixes the foreign key constraint issue when adding services with inventory items

-- Step 1: Check current foreign key constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='service_products';

-- Step 2: Drop the existing foreign key constraint
ALTER TABLE service_products DROP CONSTRAINT IF EXISTS service_products_product_id_fkey;

-- Step 3: Add new foreign key constraint to inventory_items
ALTER TABLE service_products ADD CONSTRAINT service_products_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES inventory_items(id) ON DELETE CASCADE;

-- Step 4: Verify the new constraint
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='service_products';

-- Step 5: Test the relationship (optional - only if you have existing data)
-- SELECT sp.*, ii.name as inventory_item_name 
-- FROM service_products sp 
-- JOIN inventory_items ii ON sp.product_id = ii.id 
-- LIMIT 5;
