-- Migration: Add total_price column to service_products table
-- Date: 2025-01-01
-- Description: Add total_price column that is referenced by the inventory deduction function

-- Add total_price column to service_products table
ALTER TABLE public.service_products 
ADD COLUMN IF NOT EXISTS total_price NUMERIC NOT NULL DEFAULT 0;

-- Update existing records to calculate total_price if it's 0
UPDATE public.service_products 
SET total_price = quantity * price_per_unit 
WHERE total_price = 0 OR total_price IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.service_products.total_price IS 'Total price for this product in the service (quantity * price_per_unit)';
