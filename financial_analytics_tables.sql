-- Financial Analytics Database Tables
-- This script creates all necessary tables for the salon financial analytics system

-- 1. Financial Metrics Table - Stores overall financial performance data
CREATE TABLE IF NOT EXISTS financial_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL CHECK (period IN ('current_month', 'last_month', 'last_3_months', 'last_6_months', 'current_year')),
    year INTEGER NOT NULL,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    total_expenses DECIMAL(12,2) DEFAULT 0.00,
    net_profit DECIMAL(12,2) DEFAULT 0.00,
    profit_margin DECIMAL(5,2) DEFAULT 0.00,
    monthly_growth DECIMAL(5,2) DEFAULT 0.00,
    average_order_value DECIMAL(8,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, period, year)
);

-- 2. Expense Categories Table - Stores categorized expense data
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL CHECK (period IN ('current_month', 'last_month', 'last_3_months', 'last_6_months', 'current_year')),
    year INTEGER NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2) DEFAULT 0.00,
    trend VARCHAR(20) DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Product Performance Table - Stores product sales and performance metrics
CREATE TABLE IF NOT EXISTS product_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL CHECK (period IN ('current_month', 'last_month', 'last_3_months', 'last_6_months', 'current_year')),
    year INTEGER NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    quantity_sold INTEGER DEFAULT 0,
    revenue_generated DECIMAL(10,2) DEFAULT 0.00,
    profit_margin DECIMAL(5,2) DEFAULT 0.00,
    stock_level INTEGER DEFAULT 0,
    trend VARCHAR(20) DEFAULT 'stable' CHECK (trend IN ('increasing', 'decreasing', 'stable')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Monthly Data Table - Stores monthly financial trends
CREATE TABLE IF NOT EXISTS monthly_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL CHECK (period IN ('current_month', 'last_month', 'last_3_months', 'last_6_months', 'current_year')),
    year INTEGER NOT NULL,
    month VARCHAR(10) NOT NULL,
    revenue DECIMAL(12,2) DEFAULT 0.00,
    expenses DECIMAL(12,2) DEFAULT 0.00,
    profit DECIMAL(12,2) DEFAULT 0.00,
    services_count INTEGER DEFAULT 0,
    customer_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Business Insights Table - Stores AI-generated business recommendations
CREATE TABLE IF NOT EXISTS business_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL CHECK (period IN ('current_month', 'last_month', 'last_3_months', 'last_6_months', 'current_year')),
    year INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('warning', 'opportunity', 'trend', 'recommendation')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'low' CHECK (priority IN ('high', 'medium', 'low')),
    action_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Expenses Table - Stores individual expense records
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50),
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Financial Reports Table - Stores generated financial reports
CREATE TABLE IF NOT EXISTS financial_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL,
    year INTEGER NOT NULL,
    report_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_metrics_user_period_year ON financial_metrics(user_id, period, year);
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_period_year ON expense_categories(user_id, period, year);
CREATE INDEX IF NOT EXISTS idx_product_performance_user_period_year ON product_performance(user_id, period, year);
CREATE INDEX IF NOT EXISTS idx_monthly_data_user_period_year ON monthly_data(user_id, period, year);
CREATE INDEX IF NOT EXISTS idx_business_insights_user_period_year ON business_insights(user_id, period, year);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_financial_reports_user_period_year ON financial_reports(user_id, period, year);

-- Create RLS (Row Level Security) policies
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for financial_metrics
CREATE POLICY "Users can view their own financial metrics" ON financial_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial metrics" ON financial_metrics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial metrics" ON financial_metrics
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial metrics" ON financial_metrics
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for expense_categories
CREATE POLICY "Users can view their own expense categories" ON expense_categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense categories" ON expense_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense categories" ON expense_categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense categories" ON expense_categories
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for product_performance
CREATE POLICY "Users can view their own product performance" ON product_performance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product performance" ON product_performance
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product performance" ON product_performance
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product performance" ON product_performance
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for monthly_data
CREATE POLICY "Users can view their own monthly data" ON monthly_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly data" ON monthly_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly data" ON monthly_data
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly data" ON monthly_data
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for business_insights
CREATE POLICY "Users can view their own business insights" ON business_insights
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business insights" ON business_insights
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business insights" ON business_insights
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business insights" ON business_insights
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for expenses
CREATE POLICY "Users can view their own expenses" ON expenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses" ON expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" ON expenses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" ON expenses
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for financial_reports
CREATE POLICY "Users can view their own financial reports" ON financial_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial reports" ON financial_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial reports" ON financial_reports
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial reports" ON financial_reports
    FOR DELETE USING (auth.uid() = user_id);

-- Create functions for automatic data updates
CREATE OR REPLACE FUNCTION update_financial_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_financial_metrics_updated_at
    BEFORE UPDATE ON financial_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_metrics();

CREATE TRIGGER update_expense_categories_updated_at
    BEFORE UPDATE ON expense_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_metrics();

CREATE TRIGGER update_product_performance_updated_at
    BEFORE UPDATE ON product_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_metrics();

CREATE TRIGGER update_monthly_data_updated_at
    BEFORE UPDATE ON monthly_data
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_metrics();

CREATE TRIGGER update_business_insights_updated_at
    BEFORE UPDATE ON business_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_metrics();

CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_metrics();

CREATE TRIGGER update_financial_reports_updated_at
    BEFORE UPDATE ON financial_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_metrics();

-- Insert sample data for testing (optional - remove in production)
-- INSERT INTO financial_metrics (user_id, period, year, total_revenue, total_expenses, net_profit, profit_margin, monthly_growth, average_order_value)
-- VALUES ('your-user-id-here', 'current_month', 2025, 12500, 8200, 4300, 34.4, 12.5, 85.50);

-- Add comments for documentation
COMMENT ON TABLE financial_metrics IS 'Stores overall financial performance metrics for different time periods';
COMMENT ON TABLE expense_categories IS 'Stores categorized expense breakdown for financial analysis';
COMMENT ON TABLE product_performance IS 'Stores product sales performance and analytics data';
COMMENT ON TABLE monthly_data IS 'Stores monthly financial trends and performance data';
COMMENT ON TABLE business_insights IS 'Stores AI-generated business recommendations and insights';
COMMENT ON TABLE expenses IS 'Stores individual expense records for detailed tracking';
COMMENT ON TABLE financial_reports IS 'Stores generated financial reports for download and sharing';

-- Verify tables were created successfully
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'financial_metrics',
    'expense_categories', 
    'product_performance',
    'monthly_data',
    'business_insights',
    'expenses',
    'financial_reports'
)
ORDER BY table_name;
