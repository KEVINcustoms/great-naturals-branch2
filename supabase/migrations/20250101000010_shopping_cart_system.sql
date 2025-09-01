-- ============================================================================
-- SHOPPING CART SYSTEM MIGRATION
-- ============================================================================
-- This migration adds support for the shopping cart and sales system
-- Date: January 2025
-- Version: 1.0.0
-- ============================================================================

-- ============================================================================
-- STEP 1: Create sales transactions table for cart purchases
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'mobile_money', 'bank_transfer')),
  reference_number TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  items_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- STEP 2: Create sales items table to track individual items sold
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales_transactions(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  item_name TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- STEP 3: Create cart sessions table for guest users (optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- STEP 4: Create cart items table for session-based carts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_session_id UUID REFERENCES public.cart_sessions(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- STEP 5: Create indexes for better performance
-- ============================================================================

-- Index for sales transactions
CREATE INDEX IF NOT EXISTS idx_sales_transactions_created_by ON public.sales_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_created_at ON public.sales_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_customer_name ON public.sales_transactions(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_status ON public.sales_transactions(status);

-- Index for sales items
CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON public.sales_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_inventory_item_id ON public.sales_items(inventory_item_id);

-- Index for cart sessions
CREATE INDEX IF NOT EXISTS idx_cart_sessions_session_id ON public.cart_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_expires_at ON public.cart_sessions(expires_at);

-- Index for cart items
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_session_id ON public.cart_items(cart_session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_inventory_item_id ON public.cart_items(inventory_item_id);

-- ============================================================================
-- STEP 6: Create function to process cart checkout
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_cart_checkout(
  p_customer_name TEXT,
  p_customer_phone TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cash',
  p_reference_number TEXT DEFAULT NULL,
  p_items JSONB,
  p_created_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_total_amount DECIMAL(10,2) := 0;
  v_items_count INTEGER := 0;
  v_inventory_item_id UUID;
  v_quantity INTEGER;
  v_unit_price DECIMAL(10,2);
  v_item_name TEXT;
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_transaction_id UUID;
  v_sales_item_id UUID;
BEGIN
  -- Validate input
  IF p_customer_name IS NULL OR p_customer_name = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart items cannot be empty';
  END IF;
  
  -- Calculate total and validate stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_inventory_item_id := (v_item->>'id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::DECIMAL(10,2);
    v_item_name := v_item->>'name';
    
    -- Check stock availability
    SELECT current_stock INTO v_current_stock
    FROM public.inventory_items
    WHERE id = v_inventory_item_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inventory item not found: %', v_inventory_item_id;
    END IF;
    
    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for item "%". Required: %, Available: %', 
        v_item_name, v_quantity, v_current_stock;
    END IF;
    
    v_total_amount := v_total_amount + (v_unit_price * v_quantity);
    v_items_count := v_items_count + v_quantity;
  END LOOP;
  
  -- Create sales transaction
  INSERT INTO public.sales_transactions (
    customer_name,
    customer_phone,
    payment_method,
    reference_number,
    total_amount,
    items_count,
    created_by
  ) VALUES (
    p_customer_name,
    p_customer_phone,
    p_payment_method,
    p_reference_number,
    v_total_amount,
    v_items_count
  ) RETURNING id INTO v_sale_id;
  
  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_inventory_item_id := (v_item->>'id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::DECIMAL(10,2);
    v_item_name := v_item->>'name';
    
    -- Create sales item record
    INSERT INTO public.sales_items (
      sale_id,
      inventory_item_id,
      item_name,
      unit_price,
      quantity,
      total_price
    ) VALUES (
      v_sale_id,
      v_inventory_item_id,
      v_item_name,
      v_unit_price,
      v_quantity,
      v_unit_price * v_quantity
    ) RETURNING id INTO v_sales_item_id;
    
    -- Create inventory transaction
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
      v_inventory_item_id,
      'stock_out',
      v_quantity,
      v_unit_price,
      v_unit_price * v_quantity,
      'Sale to ' || p_customer_name,
      COALESCE(p_reference_number, 'SALE-' || v_sale_id),
      p_created_by
    ) RETURNING id INTO v_transaction_id;
    
    -- Update inventory stock
    UPDATE public.inventory_items 
    SET current_stock = current_stock - v_quantity
    WHERE id = v_inventory_item_id;
    
    -- Log successful processing
    RAISE NOTICE 'Processed item: % x % = %', v_item_name, v_quantity, v_unit_price * v_quantity;
  END LOOP;
  
  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'total_amount', v_total_amount,
    'items_count', v_items_count,
    'message', 'Sale completed successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to process cart checkout'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Create function to get sales history
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_sales_history(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_customer_name TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  sale_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  payment_method TEXT,
  total_amount DECIMAL(10,2),
  items_count INTEGER,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  reference_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.id,
    st.customer_name,
    st.customer_phone,
    st.payment_method,
    st.total_amount,
    st.items_count,
    st.status,
    st.created_at,
    st.reference_number
  FROM public.sales_transactions st
  WHERE (p_customer_name IS NULL OR st.customer_name ILIKE '%' || p_customer_name || '%')
    AND (p_date_from IS NULL OR st.created_at::DATE >= p_date_from)
    AND (p_date_to IS NULL OR st.created_at::DATE <= p_date_to)
  ORDER BY st.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: Create function to get sale details
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_sale_details(p_sale_id UUID)
RETURNS TABLE (
  sale_info JSONB,
  items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Sale information
    jsonb_build_object(
      'id', st.id,
      'customer_name', st.customer_name,
      'customer_phone', st.customer_phone,
      'payment_method', st.payment_method,
      'reference_number', st.reference_number,
      'total_amount', st.total_amount,
      'items_count', st.items_count,
      'status', st.status,
      'created_at', st.created_at,
      'created_by', st.created_by
    ) as sale_info,
    
    -- Sale items
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', si.id,
          'inventory_item_id', si.inventory_item_id,
          'item_name', si.item_name,
          'unit_price', si.unit_price,
          'quantity', si.quantity,
          'total_price', si.total_price
        )
      ) FILTER (WHERE si.id IS NOT NULL),
      '[]'::jsonb
    ) as items
  FROM public.sales_transactions st
  LEFT JOIN public.sales_items si ON st.id = si.sale_id
  WHERE st.id = p_sale_id
  GROUP BY st.id, st.customer_name, st.customer_phone, st.payment_method, 
           st.reference_number, st.total_amount, st.items_count, st.status, 
           st.created_at, st.created_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 9: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 10: Create RLS policies
-- ============================================================================

-- Sales transactions policies
CREATE POLICY "Users can view their own sales" ON public.sales_transactions
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create sales" ON public.sales_transactions
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all sales" ON public.sales_transactions
FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Sales items policies
CREATE POLICY "Users can view items for their sales" ON public.sales_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sales_transactions 
    WHERE sales_transactions.id = sales_items.sale_id 
    AND sales_transactions.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create items for their sales" ON public.sales_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales_transactions 
    WHERE sales_transactions.id = sales_items.sale_id 
    AND sales_transactions.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can manage all sales items" ON public.sales_items
FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Cart sessions policies (more permissive for guest users)
CREATE POLICY "Anyone can create cart sessions" ON public.cart_sessions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their cart sessions" ON public.cart_sessions
FOR SELECT USING (true);

CREATE POLICY "Admins can manage all cart sessions" ON public.cart_sessions
FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Cart items policies
CREATE POLICY "Anyone can manage cart items" ON public.cart_items
FOR ALL USING (true);

-- ============================================================================
-- STEP 11: Create triggers for updated_at
-- ============================================================================

CREATE TRIGGER update_sales_transactions_updated_at
BEFORE UPDATE ON public.sales_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 12: Grant necessary permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.process_cart_checkout(TEXT, TEXT, TEXT, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_history(INTEGER, INTEGER, TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sale_details(UUID) TO authenticated;

-- ============================================================================
-- STEP 13: Add helpful comments and documentation
-- ============================================================================

COMMENT ON TABLE public.sales_transactions IS 'Stores completed sales transactions from the shopping cart system';
COMMENT ON TABLE public.sales_items IS 'Stores individual items sold in each sale transaction';
COMMENT ON TABLE public.cart_sessions IS 'Stores temporary cart sessions for guest users (optional)';
COMMENT ON TABLE public.cart_items IS 'Stores items in temporary cart sessions (optional)';

COMMENT ON FUNCTION public.process_cart_checkout IS 'Processes cart checkout by creating sales records and updating inventory';
COMMENT ON FUNCTION public.get_sales_history IS 'Retrieves sales history with filtering and pagination';
COMMENT ON FUNCTION public.get_sale_details IS 'Retrieves detailed information about a specific sale';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- This migration adds:
-- 1. Sales transactions table for completed purchases
-- 2. Sales items table for itemized sales records
-- 3. Cart sessions and items tables for guest users (optional)
-- 4. Functions for processing cart checkout and retrieving sales data
-- 5. Proper indexing for performance
-- 6. Row Level Security policies
-- 7. Comprehensive error handling and validation
--
-- The system now supports:
-- - Professional sales tracking
-- - Customer purchase history
-- - Inventory integration
-- - Payment method tracking
-- - Reference number support
-- - Guest user cart sessions (optional)
-- ============================================================================
