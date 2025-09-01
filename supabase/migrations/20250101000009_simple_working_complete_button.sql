-- Migration: Simple Working Complete Button - Bulletproof Fix
-- Date: 2025-01-01
-- Description: Create a simple, working complete button system

-- ============================================================================
-- STEP 1: Complete Cleanup - Remove ALL old problematic code
-- ============================================================================

-- Drop ALL old triggers and functions to ensure clean slate
DROP TRIGGER IF EXISTS trigger_service_completion ON public.services;
DROP FUNCTION IF EXISTS public.deduct_inventory_for_service(UUID, UUID);
DROP FUNCTION IF EXISTS public.check_service_inventory_availability(UUID);
DROP FUNCTION IF EXISTS public.service_completion_trigger();

-- ============================================================================
-- STEP 2: Ensure proper table structure
-- ============================================================================

-- Add total_price column if it doesn't exist
ALTER TABLE public.service_products 
ADD COLUMN IF NOT EXISTS total_price NUMERIC NOT NULL DEFAULT 0;

-- Update existing records to calculate total_price
UPDATE public.service_products 
SET total_price = quantity * price_per_unit 
WHERE total_price = 0 OR total_price IS NULL;

-- ============================================================================
-- STEP 3: Create Simple Working Inventory Check Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_service_inventory_availability(
  p_service_id UUID
)
RETURNS TABLE(
  item_id UUID,
  item_name TEXT,
  required_quantity INTEGER,
  available_stock INTEGER,
  is_available BOOLEAN,
  shortage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.inventory_item_id as item_id,
    COALESCE(ii.name, 'Unknown Item') as item_name,
    sp.quantity as required_quantity,
    COALESCE(ii.current_stock, 0) as available_stock,
    (COALESCE(ii.current_stock, 0) >= sp.quantity) as is_available,
    GREATEST(0, sp.quantity - COALESCE(ii.current_stock, 0)) as shortage
  FROM public.service_products sp
  LEFT JOIN public.inventory_items ii ON sp.inventory_item_id = ii.id
  WHERE sp.service_id = p_service_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Create Simple Working Inventory Deduction Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deduct_inventory_for_service(
  p_service_id UUID,
  p_created_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_product_record RECORD;
  v_current_stock INTEGER;
  v_new_stock INTEGER;
BEGIN
  -- Process each product used in the service
  FOR v_product_record IN 
    SELECT 
      sp.inventory_item_id,
      sp.quantity,
      sp.price_per_unit,
      COALESCE(sp.total_price, sp.quantity * sp.price_per_unit) as total_price,
      ii.name as item_name,
      ii.current_stock
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
      'Service completion',
      'SERVICE-' || p_service_id,
      p_created_by
    );
    
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
      (SELECT customer_id FROM public.services WHERE id = p_service_id),
      p_service_id,
      v_product_record.inventory_item_id,
      v_product_record.quantity,
      v_product_record.price_per_unit,
      v_product_record.total_price,
      p_created_by
    );
  END LOOP;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in deduct_inventory_for_service: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Create Simple Working Service Completion Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.service_completion_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_has_products BOOLEAN;
  v_deduction_success BOOLEAN;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Check if service has products that need inventory deduction
    SELECT EXISTS (
      SELECT 1 FROM public.service_products WHERE service_id = NEW.id
    ) INTO v_has_products;
    
    IF v_has_products THEN
      -- Attempt to deduct inventory
      v_deduction_success := public.deduct_inventory_for_service(NEW.id, NEW.created_by);
      
      -- If deduction fails, revert the status change
      IF NOT v_deduction_success THEN
        RAISE EXCEPTION 'Failed to deduct inventory for service. Please check stock levels.';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER trigger_service_completion
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.service_completion_trigger();

-- ============================================================================
-- STEP 6: Grant necessary permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.deduct_inventory_for_service(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_service_inventory_availability(UUID) TO authenticated;

-- ============================================================================
-- STEP 7: Verify the setup
-- ============================================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SIMPLE WORKING COMPLETE BUTTON READY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ All old functions cleaned up';
  RAISE NOTICE '✅ Simple inventory check function created';
  RAISE NOTICE '✅ Simple inventory deduction function created';
  RAISE NOTICE '✅ Simple service completion trigger created';
  RAISE NOTICE '✅ Column added: service_products.total_price';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'The complete button should now work!';
  RAISE NOTICE '========================================';
END $$;
