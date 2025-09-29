-- Migration: Fix inventory deduction function and add missing columns
-- Date: 2025-01-01
-- Description: Fix all issues preventing inventory deduction from working

-- 1. Add total_price column to service_products if it doesn't exist
ALTER TABLE public.service_products 
ADD COLUMN IF NOT EXISTS total_price NUMERIC NOT NULL DEFAULT 0;

-- 2. Update existing records to calculate total_price
UPDATE public.service_products 
SET total_price = quantity * price_per_unit 
WHERE total_price = 0 OR total_price IS NULL;

-- 3. Drop and recreate the deduct_inventory_for_service function with better error handling
DROP FUNCTION IF EXISTS public.deduct_inventory_for_service(UUID, UUID);

CREATE OR REPLACE FUNCTION public.deduct_inventory_for_service(
  p_service_id UUID,
  p_created_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_service_record RECORD;
  v_product_record RECORD;
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_transaction_id UUID;
  v_usage_id UUID;
  v_product_count INTEGER;
BEGIN
  -- Get service details
  SELECT * INTO v_service_record 
  FROM public.services 
  WHERE id = p_service_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found: %', p_service_id;
  END IF;
  
  -- Check if service is completed
  IF v_service_record.status != 'completed' THEN
    RAISE EXCEPTION 'Service must be completed to deduct inventory';
  END IF;
  
  -- Count how many products this service has
  SELECT COUNT(*) INTO v_product_count
  FROM public.service_products 
  WHERE service_id = p_service_id;
  
  -- If no products, return success immediately
  IF v_product_count = 0 THEN
    RAISE NOTICE 'Service % has no products, skipping inventory deduction', p_service_id;
    RETURN TRUE;
  END IF;
  
  -- Process each product used in the service
  FOR v_product_record IN 
    SELECT 
      sp.inventory_item_id,
      sp.quantity,
      sp.price_per_unit,
      COALESCE(sp.total_price, sp.quantity * sp.price_per_unit) as total_price,
      ii.name as item_name,
      ii.current_stock,
      ii.min_stock_level
    FROM public.service_products sp
    JOIN public.inventory_items ii ON sp.inventory_item_id = ii.id
    WHERE sp.service_id = p_service_id
  LOOP
    -- Check stock availability
    IF v_product_record.current_stock < v_product_record.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for item "%". Required: %, Available: %', 
        v_product_record.item_name, 
        v_product_record.quantity, 
        v_product_record.current_stock;
    END IF;
    
    -- Calculate new stock level
    v_new_stock := v_product_record.current_stock - v_product_record.quantity;
    
    -- Create inventory transaction for stock out
    INSERT INTO public.inventory_transactions (
      item_id,
      transaction_type,
      quantity,
      unit_price,
      total_amount,
      reason,
      reference_number,
      created_by
    ) VALUES (
      v_product_record.inventory_item_id,
      'stock_out',
      v_product_record.quantity,
      v_product_record.price_per_unit,
      v_product_record.total_price,
      'Service completion: ' || COALESCE(v_service_record.service_name, 'Unknown Service'),
      'SERVICE-' || p_service_id,
      p_created_by
    ) RETURNING id INTO v_transaction_id;
    
    -- Update inventory stock
    UPDATE public.inventory_items 
    SET current_stock = v_new_stock
    WHERE id = v_product_record.inventory_item_id;
    
    -- Record customer product usage
    INSERT INTO public.customer_product_usage (
      customer_id,
      service_id,
      inventory_item_id,
      quantity_used,
      unit_price,
      total_cost,
      created_by
    ) VALUES (
      v_service_record.customer_id,
      p_service_id,
      v_product_record.inventory_item_id,
      v_product_record.quantity,
      v_product_record.price_per_unit,
      v_product_record.total_price,
      p_created_by
    ) RETURNING id INTO v_usage_id;
    
    -- Log the deduction
    RAISE NOTICE 'Deducted % units of item "%" for service %. New stock: %', 
      v_product_record.quantity, 
      v_product_record.item_name, 
      p_service_id, 
      v_new_stock;
  END LOOP;
  
  RAISE NOTICE 'Successfully processed inventory deduction for service %', p_service_id;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in deduct_inventory_for_service: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.deduct_inventory_for_service(UUID, UUID) TO authenticated;

-- 5. Add comment to document the column
COMMENT ON COLUMN public.service_products.total_price IS 'Total price for this product in the service (quantity * price_per_unit)';



