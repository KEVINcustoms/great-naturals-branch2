-- Drop and recreate expenses table for financial tracking
-- This migration will clean up any existing table and create a fresh one

-- Drop existing table if it exists (this will also drop any related objects)
DROP TABLE IF EXISTS public.expenses CASCADE;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create expenses table for financial tracking
CREATE TABLE public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_expenses_category ON public.expenses(category);

-- Enable Row Level Security (RLS)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own expenses" ON public.expenses
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own expenses" ON public.expenses
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own expenses" ON public.expenses
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own expenses" ON public.expenses
    FOR DELETE USING (auth.uid() = created_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_expenses_updated_at 
    BEFORE UPDATE ON public.expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.expenses TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Insert some sample data for testing (optional)
-- INSERT INTO public.expenses (name, category, amount, date, created_by) VALUES
--     ('Office Supplies', 'other', 15000, CURRENT_DATE, '00000000-0000-0000-0000-000000000000'),
--     ('Internet Bill', 'utilities', 25000, CURRENT_DATE, '00000000-0000-0000-0000-000000000000'),
--     ('Cleaning Service', 'maintenance', 35000, CURRENT_DATE, '00000000-0000-0000-0000-000000000000');
