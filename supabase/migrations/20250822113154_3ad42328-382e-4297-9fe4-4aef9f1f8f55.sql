-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  hair_type TEXT,
  style_preference TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workers table
CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  phone TEXT,
  email TEXT,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create worker attendance table
CREATE TABLE public.worker_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIME,
  check_out_time TIME,
  status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'half_day')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(worker_id, date)
);

-- Create worker schedules table
CREATE TABLE public.worker_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_working_day BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(worker_id, day_of_week)
);

-- Create inventory categories table
CREATE TABLE public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory items table
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER NOT NULL DEFAULT 10,
  max_stock_level INTEGER NOT NULL DEFAULT 100,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  expiry_date DATE,
  supplier TEXT,
  barcode TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory transactions table
CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('stock_in', 'stock_out', 'adjustment')),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  reason TEXT,
  reference_number TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('low_stock', 'out_of_stock', 'expiring_soon', 'salary_due', 'shift_reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  entity_id UUID,
  entity_type TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role AS $$
  SELECT role FROM public.profiles WHERE user_id = _user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.get_user_role(auth.uid()) = 'admin');

-- Allow profile creation for new users (needed for the trigger function)
CREATE POLICY "Allow profile creation for new users"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- Create policies for customers (admins see all, users see their own)
CREATE POLICY "Admins can manage all customers"
ON public.customers FOR ALL
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view their own customers"
ON public.customers FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can create customers"
ON public.customers FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own customers"
ON public.customers FOR UPDATE
USING (created_by = auth.uid());

-- Create policies for workers
CREATE POLICY "Admins can manage all workers"
ON public.workers FOR ALL
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view workers"
ON public.workers FOR SELECT
TO authenticated USING (true);

-- Create policies for worker_attendance
CREATE POLICY "Admins can manage all attendance"
ON public.worker_attendance FOR ALL
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can manage their own attendance entries"
ON public.worker_attendance FOR ALL
USING (created_by = auth.uid());

-- Create policies for worker_schedules
CREATE POLICY "Admins can manage all schedules"
ON public.worker_schedules FOR ALL
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view schedules"
ON public.worker_schedules FOR SELECT
TO authenticated USING (true);

-- Create policies for inventory_categories
CREATE POLICY "Authenticated users can view categories"
ON public.inventory_categories FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Admins can manage categories"
ON public.inventory_categories FOR ALL
USING (public.get_user_role(auth.uid()) = 'admin');

-- Create policies for inventory_items
CREATE POLICY "Authenticated users can view inventory"
ON public.inventory_items FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Admins can manage inventory"
ON public.inventory_items FOR ALL
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can create inventory items"
ON public.inventory_items FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update inventory items they created"
ON public.inventory_items FOR UPDATE
USING (created_by = auth.uid());

-- Create policies for inventory_transactions
CREATE POLICY "Authenticated users can view transactions"
ON public.inventory_transactions FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Users can create transactions"
ON public.inventory_transactions FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all transactions"
ON public.inventory_transactions FOR ALL
USING (public.get_user_role(auth.uid()) = 'admin');

-- Create policies for alerts
CREATE POLICY "All authenticated users can view alerts"
ON public.alerts FOR SELECT
TO authenticated USING (true);

CREATE POLICY "System can create alerts"
ON public.alerts FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Users can mark alerts as read"
ON public.alerts FOR UPDATE
TO authenticated USING (true);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worker_schedules_updated_at
  BEFORE UPDATE ON public.worker_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    CASE 
      WHEN NEW.email = 'devzoratech@gmail.com' THEN 'admin'::app_role
      ELSE 'user'::app_role
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- Set replica identity for realtime updates
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.workers REPLICA IDENTITY FULL;
ALTER TABLE public.worker_attendance REPLICA IDENTITY FULL;
ALTER TABLE public.worker_schedules REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_categories REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;