-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  service_category TEXT NOT NULL,
  service_price NUMERIC NOT NULL DEFAULT 0,
  staff_member_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  date_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table (different from inventory - these are products used in services)
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_products junction table (products used in a service)
CREATE TABLE public.service_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for services
CREATE POLICY "Users can view their own services" ON public.services
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create services" ON public.services
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own services" ON public.services
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all services" ON public.services
FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Create RLS policies for products
CREATE POLICY "Authenticated users can view products" ON public.products
FOR SELECT USING (true);

CREATE POLICY "Users can create products" ON public.products
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own products" ON public.products
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all products" ON public.products
FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Create RLS policies for service_products
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

-- Create triggers for updated_at
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();