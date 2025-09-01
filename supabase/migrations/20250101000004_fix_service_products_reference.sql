-- Migration: Fix service_products table reference to use inventory_items
-- Date: 2025-01-01
-- Description: Update service_products table to reference inventory_items instead of products

-- First, drop the existing foreign key constraint
ALTER TABLE public.service_products DROP CONSTRAINT IF EXISTS service_products_product_id_fkey;

-- Update the column name and reference to use inventory_items
ALTER TABLE public.service_products RENAME COLUMN product_id TO inventory_item_id;

-- Add the new foreign key constraint to inventory_items
ALTER TABLE public.service_products 
ADD CONSTRAINT service_products_inventory_item_id_fkey 
FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;

-- Update the RLS policies to use the new column name
DROP POLICY IF EXISTS "Users can view service products for their services" ON public.service_products;
DROP POLICY IF EXISTS "Users can create service products for their services" ON public.service_products;
DROP POLICY IF EXISTS "Users can update service products for their services" ON public.service_products;
DROP POLICY IF EXISTS "Users can delete service products for their services" ON public.service_products;

-- Recreate the RLS policies with the new column name
CREATE POLICY "Users can view service products for their services" ON public.service_products
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.services 
    WHERE services.id = service_products.service_id 
    AND (services.created_by = auth.uid() OR get_user_role(auth.uid()) = 'admin'::app_role)
  )
);

CREATE POLICY "Users can create service products for their services" ON public.service_products
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.services 
    WHERE services.id = service_products.service_id 
    AND (services.created_by = auth.uid() OR get_user_role(auth.uid()) = 'admin'::app_role)
  )
);

CREATE POLICY "Users can update service products for their services" ON public.service_products
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.services 
    WHERE services.id = service_products.service_id 
    AND (services.created_by = auth.uid() OR get_user_role(auth.uid()) = 'admin'::app_role)
  )
);

CREATE POLICY "Users can delete service products for their services" ON public.service_products
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.services 
    WHERE services.id = service_products.service_id 
    AND (services.created_by = auth.uid() OR get_user_role(auth.uid()) = 'admin'::app_role)
  )
);

-- Add comment to document the change
COMMENT ON COLUMN public.service_products.inventory_item_id IS 'References inventory_items.id instead of products.id for better integration with inventory system';
