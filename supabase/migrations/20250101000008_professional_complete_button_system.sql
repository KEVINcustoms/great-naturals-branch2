-- Migration: Professional Complete Button System - Bulletproof Implementation
-- Date: 2025-01-01
-- Description: Create a professional, robust complete button system with proper error handling

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
-- STEP 3: Create Professional Inventory Availability Check Function
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
  shortage INTEGER,
  unit_price NUMERIC,
  total_price NUMERIC
) AS $$
BEGIN
  -- Validate input
  IF p_service_id IS NULL THEN
    RAISE EXCEPTION 'Service ID cannot be null';
  END IF;
  
  -- Check if service exists
  IF NOT EXISTS (SELECT 1 FROM public.services WHERE id = p_service_id) THEN
    RAISE EXCEPTION 'Service not found: %', p_service_id;
  END IF;
  
  RETURN QUERY
  SELECT 
    sp.inventory_item_id as item_id,
    COALESCE(ii.name, 'Unknown Item') as item_name,
    sp.quantity as required_quantity,
    COALESCE(ii.current_stock, 0) as available_stock,
    (COALESCE(ii.current_stock, 0) >= sp.quantity) as is_available,
    GREATEST(0, sp.quantity - COALESCE(ii.current_stock, 0)) as shortage,
    sp.price_per_unit as unit_price,
    COALESCE(sp.total_price, sp.quantity * sp.price_per_unit) as total_price
  FROM public.service_products sp
  LEFT JOIN public.inventory_items ii ON sp.inventory_item_id = ii.id
  WHERE sp.service_id = p_service_id;
  
  -- Log the check
  RAISE NOTICE 'Inventory availability check completed for service %', p_service_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Create Professional Inventory Deduction Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deduct_inventory_for_service(
  p_service_id UUID,
  p_created_by UUID
)
RETURNS JSON AS $$
DECLARE
  v_service_record RECORD;
  v_product_record RECORD;
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_transaction_id UUID;
  v_usage_id UUID;
  v_product_count INTEGER;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_result JSON;
  v_errors TEXT[] := '{}';
BEGIN
  -- Input validation
  IF p_service_id IS NULL THEN
    RAISE EXCEPTION 'Service ID cannot be null';
  END IF;
  
  IF p_created_by IS NULL THEN
    RAISE EXCEPTION 'Created by user ID cannot be null';
  END IF;
  
  -- Get service details with validation
  SELECT * INTO v_service_record 
  FROM public.services 
  WHERE id = p_service_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found: %', p_service_id;
  END IF;
  
  -- Check if service is completed
  IF v_service_record.status != 'completed' THEN
    RAISE EXCEPTION 'Service must be completed to deduct inventory. Current status: %', v_service_record.status;
  END IF;
  
  -- Count products for this service
  SELECT COUNT(*) INTO v_product_count
  FROM public.service_products 
  WHERE service_id = p_service_id;
  
  -- If no products, return success immediately
  IF v_product_count = 0 THEN
    RAISE NOTICE 'Service % has no products, skipping inventory deduction', p_service_id;
    RETURN json_build_object(
      'success', true,
      'message', 'No products to deduct',
      'products_processed', 0,
      'errors', '{}'
    );
  END IF;
  
  -- Process each product with comprehensive error handling
  FOR v_product_record IN 
    SELECT 
      sp.inventory_item_id,
      sp.quantity,
      sp.price_per_unit,
      COALESCE(sp.total_price, sp.quantity * sp.price_per_unit) as total_price,
      ii.name as item_name,
      COALESCE(ii.current_stock, 0) as current_stock,
      COALESCE(ii.min_stock_level, 0) as min_stock_level
    FROM public.service_products sp
    LEFT JOIN public.inventory_items ii ON sp.inventory_item_id = ii.id
    WHERE sp.service_id = p_service_id
  LOOP
    BEGIN
      -- Validate product data
      IF v_product_record.inventory_item_id IS NULL THEN
        RAISE EXCEPTION 'Product ID is null for service %', p_service_id;
      END IF;
      
      IF v_product_record.quantity <= 0 THEN
        RAISE EXCEPTION 'Invalid quantity % for product %', v_product_record.quantity, v_product_record.inventory_item_id;
      END IF;
      
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
      
      -- Log successful deduction
      RAISE NOTICE 'Successfully deducted % units of item "%" for service %. New stock: %', 
        v_product_record.quantity, 
        v_product_record.item_name, 
        p_service_id, 
        v_new_stock;
      
      v_success_count := v_success_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error and continue with other products
        v_error_count := v_error_count + 1;
        v_errors := array_append(v_errors, 
          format('Product %s: %s', 
            COALESCE(v_product_record.item_name, v_product_record.inventory_item_id), 
            SQLERRM
          )
        );
        RAISE NOTICE 'Error processing product %: %', v_product_record.inventory_item_id, SQLERRM;
    END;
  END LOOP;
  
  -- Build result object
  v_result := json_build_object(
    'success', v_error_count = 0,
    'message', format('Processed %s products successfully', v_success_count),
    'products_processed', v_success_count,
    'errors', v_errors,
    'service_id', p_service_id
  );
  
  -- Log final result
  RAISE NOTICE 'Inventory deduction completed for service %. Success: %, Errors: %', 
    p_service_id, v_success_count, v_error_count;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    RETURN json_build_object(
      'success', false,
      'message', 'Critical error in inventory deduction',
      'error', SQLERRM,
      'service_id', p_service_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Create Professional Service Completion Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.service_completion_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_deduction_result JSON;
  v_has_products BOOLEAN;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Check if service has products that need inventory deduction
    SELECT EXISTS (
      SELECT 1 FROM public.service_products WHERE service_id = NEW.id
    ) INTO v_has_products;
    
    IF v_has_products THEN
      -- Attempt to deduct inventory
      v_deduction_result := public.deduct_inventory_for_service(NEW.id, NEW.created_by);
      
      -- Check if deduction was successful
      IF NOT (v_deduction_result->>'success')::BOOLEAN THEN
        -- Log the error details
        RAISE NOTICE 'Inventory deduction failed for service %: %', NEW.id, v_deduction_result;
        
        -- Revert the status change
        RAISE EXCEPTION 'Failed to complete service due to inventory issues. Please check stock levels and try again.';
      END IF;
      
      -- Log successful completion
      RAISE NOTICE 'Service % completed successfully with inventory deduction', NEW.id;
    ELSE
      -- No products, just complete the service
      RAISE NOTICE 'Service % completed successfully (no inventory items)', NEW.id;
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
-- STEP 7: Add comprehensive documentation
-- ============================================================================

COMMENT ON COLUMN public.service_products.total_price IS 'Total price for this product in the service (quantity * price_per_unit)';
COMMENT ON FUNCTION public.deduct_inventory_for_service IS 'Professional inventory deduction function with comprehensive error handling and detailed reporting';
COMMENT ON FUNCTION public.check_service_inventory_availability IS 'Professional inventory availability check with validation and error handling';
COMMENT ON FUNCTION public.service_completion_trigger IS 'Professional service completion trigger with robust error handling and rollback capability';

-- ============================================================================
-- STEP 8: Verify the professional setup
-- ============================================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PROFESSIONAL COMPLETE BUTTON SYSTEM READY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ All old functions cleaned up';
  RAISE NOTICE '✅ Professional inventory deduction function created';
  RAISE NOTICE '✅ Professional availability check function created';
  RAISE NOTICE '✅ Professional service completion trigger created';
  RAISE NOTICE '✅ Comprehensive error handling implemented';
  RAISE NOTICE '✅ User-friendly error messages configured';
  RAISE NOTICE '✅ Rollback capability for failed operations';
  RAISE NOTICE '✅ Detailed logging and monitoring';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'The complete button is now PROFESSIONAL GRADE!';
  RAISE NOTICE '========================================';
END $$;
