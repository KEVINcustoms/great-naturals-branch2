-- Migration: Create customer product tracking and automatic inventory deduction
-- Date: 2025-01-01
-- Description: Add tables and functions for tracking products used by customers and automatic stock deduction

-- Create customer_product_usage table to track products used per customer
CREATE TABLE public.customer_product_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  quantity_used INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient customer product history queries
CREATE INDEX idx_customer_product_usage_customer_id ON public.customer_product_usage(customer_id);
CREATE INDEX idx_customer_product_usage_service_id ON public.customer_product_usage(service_id);
CREATE INDEX idx_customer_product_usage_inventory_item_id ON public.customer_product_usage(inventory_item_id);

-- Enable RLS on customer_product_usage table
ALTER TABLE public.customer_product_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer_product_usage
CREATE POLICY "Users can view customer product usage for their services" ON public.customer_product_usage
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.services 
    WHERE services.id = customer_product_usage.service_id 
    AND (services.created_by = auth.uid() OR get_user_role(auth.uid()) = 'admin'::app_role)
  )
);

CREATE POLICY "Users can create customer product usage for their services" ON public.customer_product_usage
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.services 
    WHERE services.id = customer_product_usage.service_id 
    AND (services.created_by = auth.uid() OR get_user_role(auth.uid()) = 'admin'::app_role)
  )
);

CREATE POLICY "Admins can manage all customer product usage" ON public.customer_product_usage
FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Create function to automatically deduct inventory when service is completed
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
  
  -- Process each product used in the service
  FOR v_product_record IN 
    SELECT 
      sp.inventory_item_id,
      sp.quantity,
      sp.price_per_unit,
      sp.total_price,
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
      'Service completion: ' || v_service_record.service_name,
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
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in deduct_inventory_for_service: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if service has sufficient inventory
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
    ii.name as item_name,
    sp.quantity as required_quantity,
    ii.current_stock as available_stock,
    (ii.current_stock >= sp.quantity) as is_available,
    GREATEST(0, sp.quantity - ii.current_stock) as shortage
  FROM public.service_products sp
  JOIN public.inventory_items ii ON sp.inventory_item_id = ii.id
  WHERE sp.service_id = p_service_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.deduct_inventory_for_service(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_service_inventory_availability(UUID) TO authenticated;

-- Create trigger to automatically check inventory when service status changes to completed
CREATE OR REPLACE FUNCTION public.service_completion_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Check if service has products that need inventory deduction
    IF EXISTS (SELECT 1 FROM public.service_products WHERE service_id = NEW.id) THEN
      -- Attempt to deduct inventory
      IF NOT public.deduct_inventory_for_service(NEW.id, NEW.created_by) THEN
        -- If deduction fails, revert the status change
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

-- Add comment to the migration
COMMENT ON TABLE public.customer_product_usage IS 'Tracks products used by customers during services for inventory management and customer history';
COMMENT ON FUNCTION public.deduct_inventory_for_service IS 'Automatically deducts inventory when a service is completed';
COMMENT ON FUNCTION public.check_service_inventory_availability IS 'Checks if a service has sufficient inventory before completion';
