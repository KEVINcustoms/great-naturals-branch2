import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  AlertTriangle, 
  Lightbulb, 
  RefreshCw,
  Download,
  Plus,
  Save
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  monthlyGrowth: number;
  averageOrderValue: number;
  totalCustomers: number;
  totalServices: number;
  customerRetentionRate: number;
  averageCustomerLifetimeValue: number;
}

interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  budget: number;
  variance: number;
  lastMonthAmount: number;
}

interface ProductPerformance {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  revenue_generated: number;
  profit_margin: number;
  stock_level: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  category: string;
  supplier: string;
  reorder_point: number;
  days_of_inventory: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  services_count: number;
  customer_count: number;
  new_customers: number;
  returning_customers: number;
  average_ticket_size: number;
  profit_margin: number;
}

interface BusinessInsight {
  type: 'warning' | 'opportunity' | 'trend' | 'recommendation' | 'alert';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action_required: boolean;
  impact_score: number;
  implementation_difficulty: 'easy' | 'medium' | 'hard';
  estimated_roi: number;
  timeframe: string;
}

interface CashFlow {
  period: string;
  opening_balance: number;
  cash_in: number;
  cash_out: number;
  closing_balance: number;
  net_cash_flow: number;
}

interface KPI {
  name: string;
  value: number;
  target: number;
  unit: string;
  status: 'on_track' | 'at_risk' | 'behind' | 'exceeding';
  trend: 'up' | 'down' | 'stable';
  change_percentage: number;
}

interface ExpenseField {
  name: string;
  category: string;
  amount: string;
}

interface ExpenseRecord {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  created_by: string;
  created_at: string;
}

interface MonthlyExpensesData {
  month: string;
  totalExpenses: number;
  expenseCount: number;
}

export default function FinancialAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isLoading, setIsLoading] = useState(false);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [topProducts, setTopProducts] = useState<ProductPerformance[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [businessInsights, setBusinessInsights] = useState<BusinessInsight[]>([]);
  const [expenseFields, setExpenseFields] = useState<ExpenseField[]>([
    { name: '', category: '', amount: '' }
  ]);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseRecord[]>([]);
  const [isSubmittingExpenses, setIsSubmittingExpenses] = useState(false);
  const [monthlyExpensesData, setMonthlyExpensesData] = useState<MonthlyExpensesData[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchFinancialData();
    fetchRecentExpenses();
    fetchMonthlyExpenses();
  }, [selectedPeriod, selectedYear]);

  const fetchFinancialData = async () => {
    setIsLoading(true);
    try {
      // For now, use mock data since the database tables need to be created first
      // In production, you would fetch from actual database tables
      
      // Mock financial metrics
      const mockMetrics: FinancialMetrics = {
        totalRevenue: 12500,
        totalExpenses: 8200,
        netProfit: 4300,
        profitMargin: 34.4,
        monthlyGrowth: 12.5,
        averageOrderValue: 85.50,
        totalCustomers: 150,
        totalServices: 1200,
        customerRetentionRate: 92,
        averageCustomerLifetimeValue: 1200
      };
      
      setFinancialMetrics(mockMetrics);

      // Mock expense categories
      const mockExpenses: ExpenseCategory[] = [
        { category: "Inventory", amount: 2500, percentage: 30.5, trend: 'up', budget: 3000, variance: 500, lastMonthAmount: 2000 },
        { category: "Utilities", amount: 800, percentage: 9.8, trend: 'stable', budget: 850, variance: 50, lastMonthAmount: 750 },
        { category: "Staff Salaries", amount: 1800, percentage: 22.0, trend: 'stable', budget: 1800, variance: 0, lastMonthAmount: 1800 },
        { category: "Marketing", amount: 600, percentage: 7.3, trend: 'down', budget: 700, variance: 100, lastMonthAmount: 700 },
        { category: "Maintenance", amount: 400, percentage: 4.9, trend: 'stable', budget: 450, variance: 50, lastMonthAmount: 400 },
        { category: "Other", amount: 200, percentage: 2.4, trend: 'down', budget: 250, variance: 50, lastMonthAmount: 250 }
      ];
      
      setExpenseCategories(mockExpenses);

      // Mock top products
      const mockProducts: ProductPerformance[] = [
        { product_id: "1", product_name: "Hair Shampoo", quantity_sold: 45, revenue_generated: 1350, profit_margin: 35, stock_level: 20, trend: 'increasing', category: "Hair Care", supplier: "Supplier A", reorder_point: 10, days_of_inventory: 5 },
        { product_id: "2", product_name: "Hair Conditioner", quantity_sold: 38, revenue_generated: 1140, profit_margin: 40, stock_level: 15, trend: 'stable', category: "Hair Care", supplier: "Supplier B", reorder_point: 8, days_of_inventory: 4 },
        { product_id: "3", product_name: "Hair Gel", quantity_sold: 32, revenue_generated: 960, profit_margin: 45, stock_level: 25, trend: 'decreasing', category: "Hair Care", supplier: "Supplier A", reorder_point: 12, days_of_inventory: 6 },
        { product_id: "4", product_name: "Hair Spray", quantity_sold: 28, revenue_generated: 840, profit_margin: 50, stock_level: 18, trend: 'increasing', category: "Hair Care", supplier: "Supplier C", reorder_point: 10, days_of_inventory: 5 },
        { product_id: "5", product_name: "Hair Oil", quantity_sold: 25, revenue_generated: 750, profit_margin: 55, stock_level: 12, trend: 'stable', category: "Hair Care", supplier: "Supplier B", reorder_point: 8, days_of_inventory: 4 }
      ];
      
      setTopProducts(mockProducts);

      // Mock monthly data
      const mockMonthly: MonthlyData[] = [
        { month: "Jan", revenue: 9800, expenses: 7200, profit: 2600, services_count: 115, customer_count: 98, new_customers: 10, returning_customers: 88, average_ticket_size: 100, profit_margin: 26 },
        { month: "Feb", revenue: 10200, expenses: 7500, profit: 2700, services_count: 120, customer_count: 105, new_customers: 12, returning_customers: 93, average_ticket_size: 105, profit_margin: 27 },
        { month: "Mar", revenue: 11800, expenses: 7800, profit: 4000, services_count: 138, customer_count: 118, new_customers: 15, returning_customers: 103, average_ticket_size: 110, profit_margin: 40 },
        { month: "Apr", revenue: 11200, expenses: 8000, profit: 3200, services_count: 132, customer_count: 112, new_customers: 13, returning_customers: 99, average_ticket_size: 108, profit_margin: 32 },
        { month: "May", revenue: 12500, expenses: 8200, profit: 4300, services_count: 147, customer_count: 125, new_customers: 18, returning_customers: 107, average_ticket_size: 115, profit_margin: 43 },
        { month: "Jun", revenue: 13100, expenses: 8500, profit: 4600, services_count: 154, customer_count: 132, new_customers: 20, returning_customers: 112, average_ticket_size: 118, profit_margin: 46 }
      ];
      
      setMonthlyData(mockMonthly);

      // Mock business insights
      const mockInsights: BusinessInsight[] = [
        {
          type: 'opportunity',
          title: 'Growing Product Demand',
          description: 'Hair Shampoo and Hair Spray are showing increasing demand. Consider increasing stock levels.',
          priority: 'medium',
          action_required: false,
          impact_score: 70,
          implementation_difficulty: 'easy',
          estimated_roi: 1500,
          timeframe: '1 month'
        },
        {
          type: 'warning',
          title: 'Low Stock Alert',
          description: 'Hair Conditioner and Hair Oil are running low on stock. Reorder soon.',
          priority: 'medium',
          action_required: true,
          impact_score: 85,
          implementation_difficulty: 'medium',
          estimated_roi: 2000,
          timeframe: '2 weeks'
        },
        {
          type: 'recommendation',
          title: 'Optimize Inventory',
          description: 'Review slow-moving products and consider promotional strategies to clear excess stock.',
          priority: 'low',
          action_required: false,
          impact_score: 60,
          implementation_difficulty: 'easy',
          estimated_roi: 1000,
          timeframe: '1 month'
        },
        {
          type: 'trend',
          title: 'Strong Revenue Growth',
          description: 'Monthly revenue has grown by 12.5% compared to last period. Keep up the momentum!',
          priority: 'low',
          action_required: false,
          impact_score: 50,
          implementation_difficulty: 'easy',
          estimated_roi: 800,
          timeframe: '1 month'
        }
      ];
      
      setBusinessInsights(mockInsights);

    } catch (error) {
      console.error("Error setting up mock data:", error);
      toast({
        title: 'Error setting up data',
        description: 'Failed to initialize financial data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportFinancialReport = () => {
    const data = {
      period: selectedPeriod,
      year: selectedYear,
      metrics: financialMetrics,
      expenses: expenseCategories,
      topProducts: topProducts,
      monthlyData: monthlyData,
      insights: businessInsights
    };

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${selectedPeriod}-${selectedYear}.json`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Financial report exported successfully",
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable':
        return <DollarSign className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  // Expense Management Functions
  const addExpenseField = () => {
    setExpenseFields([...expenseFields, { name: '', category: '', amount: '' }]);
  };

  const removeExpenseField = (index: number) => {
    if (expenseFields.length > 1) {
      const newFields = expenseFields.filter((_, i) => i !== index);
      setExpenseFields(newFields);
    }
  };

  const handleExpenseFieldChange = (index: number, field: keyof ExpenseField, value: string) => {
    const newFields = [...expenseFields];
    newFields[index] = { ...newFields[index], [field]: value };
    setExpenseFields(newFields);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmittingExpenses(true);
    try {
      // Check if expenses table exists
      const { error: tableCheckError } = await supabase
        .from('expenses' as never)
        .select('id')
        .limit(1);
      
      if (tableCheckError) {
        if (tableCheckError.message.includes('relation "expenses" does not exist')) {
          toast({
            title: "Database Setup Required",
            description: "Please run the expenses table migration in Supabase first.",
            variant: "destructive",
          });
          return;
        }
        throw tableCheckError;
      }
      // Validate fields
      const validExpenses = expenseFields.filter(field => 
        field.name.trim() && field.category && parseFloat(field.amount) > 0
      );

      if (validExpenses.length === 0) {
        toast({
          title: "No valid expenses",
          description: "Please fill in at least one expense field completely.",
          variant: "destructive",
        });
        return;
      }

      // Prepare expenses for database
      const expensesToInsert = validExpenses.map(field => ({
        name: field.name.trim(),
        category: field.category,
        amount: parseFloat(field.amount),
        date: new Date().toISOString().split('T')[0],
        created_by: user.id,
        created_at: new Date().toISOString()
      }));

      // Insert expenses into Supabase
      const { data, error } = await supabase
        .from('expenses' as never)
        .insert(expensesToInsert)
        .select();

      if (error) throw error;

      toast({
        title: "Expenses saved successfully",
        description: `${validExpenses.length} expense(s) have been recorded.`,
      });

      // Reset form
      setExpenseFields([{ name: '', category: '', amount: '' }]);
      
      // Refresh recent expenses
      fetchRecentExpenses();
      
      // Refresh monthly expenses
      fetchMonthlyExpenses();
      
      // Refresh financial data
      fetchFinancialData();

    } catch (error) {
      console.error("Error saving expenses:", error);
      
      // Provide more specific error information
      let errorMessage = "Failed to save expenses. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('relation "expenses" does not exist')) {
          errorMessage = "Expenses table not found. Please run the database migration first.";
        } else if (error.message.includes('permission denied')) {
          errorMessage = "Permission denied. Please check your authentication.";
        } else if (error.message.includes('invalid input syntax')) {
          errorMessage = "Invalid data format. Please check your input.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast({
        title: "Error saving expenses",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingExpenses(false);
    }
  };

  const fetchRecentExpenses = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('expenses' as never)
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentExpenses((data as ExpenseRecord[]) || []);
    } catch (error) {
      console.error("Error fetching recent expenses:", error);
    }
  };

  const fetchMonthlyExpenses = async () => {
    if (!user) return;
    
    try {
      // Get expenses for the last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
      twelveMonthsAgo.setDate(1); // Start of month
      
      const { data, error } = await supabase
        .from('expenses' as never)
        .select('*')
        .eq('created_by', user.id)
        .gte('date', twelveMonthsAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      // Group expenses by month
      const monthlyData: { [key: string]: MonthlyExpensesData } = {};
      
      // Initialize last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthlyData[monthKey] = {
          month: monthKey,
          totalExpenses: 0,
          expenseCount: 0
        };
      }

      // Aggregate expenses by month
      if (data) {
        data.forEach((expense: ExpenseRecord) => {
          const expenseDate = new Date(expense.date);
          const monthKey = expenseDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].totalExpenses += expense.amount;
            monthlyData[monthKey].expenseCount += 1;
          }
        });
      }

      // Convert to array and sort by month
      const monthlyArray = Object.values(monthlyData).sort((a, b) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const aMonth = months.indexOf(a.month.split(' ')[0]);
        const bMonth = months.indexOf(b.month.split(' ')[0]);
        return aMonth - bMonth;
      });

      setMonthlyExpensesData(monthlyArray);
    } catch (error) {
      console.error("Error fetching monthly expenses:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Development Notice */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-full">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-amber-900">🚧 UNDER DEVELOPMENT</h3>
              <span className="px-3 py-1 bg-amber-200 text-amber-800 text-xs font-bold rounded-full border border-amber-300">
                FUTURE UPDATE
              </span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              <strong>Financial Analytics Dashboard</strong> is currently in active development. 
              This page displays mock data for demonstration purposes. 
              Real-time financial tracking, expense management, and business intelligence features 
              will be available in upcoming updates.
            </p>
                         <div className="mt-3 text-sm text-amber-700 space-y-1">
               <p>• <strong>Current Status:</strong> Development Phase - Mock Data Display</p>
               <p>• <strong>Next Release:</strong> Real-time database integration</p>
               <p>• <strong>Coming Soon:</strong> Automated reports and advanced analytics</p>
               <p>• <strong>✅ Available Now:</strong> Live expense tracking and recording</p>
             </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Analytics & Business Intelligence</h1>
          <p className="text-gray-600 mt-2">
            Real-time financial insights, expense tracking, and business performance analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchFinancialData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button onClick={exportFinancialReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(financialMetrics?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialMetrics?.monthlyGrowth ? (
                <span className={financialMetrics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {financialMetrics.monthlyGrowth >= 0 ? '+' : ''}{financialMetrics.monthlyGrowth.toFixed(1)}% from last period
                </span>
              ) : 'No previous data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
                              {formatCurrency(financialMetrics?.totalExpenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {expenseCategories.length > 0 ? `${expenseCategories.length} categories` : 'No expense data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
                              {formatCurrency(financialMetrics?.netProfit || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialMetrics?.profitMargin ? `${financialMetrics.profitMargin.toFixed(1)}% margin` : 'No margin data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialMetrics?.profitMargin ? `${financialMetrics.profitMargin.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialMetrics?.profitMargin && financialMetrics.profitMargin < 20 ? (
                <span className="text-red-600">Below recommended 20%</span>
              ) : 'Healthy margin'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${financialMetrics?.monthlyGrowth && financialMetrics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {financialMetrics?.monthlyGrowth ? `${financialMetrics.monthlyGrowth >= 0 ? '+' : ''}${financialMetrics.monthlyGrowth.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue growth rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${financialMetrics?.averageOrderValue.toFixed(2) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Per service transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Professional Charts Section */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="add-expenses">Add Expenses</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Revenue vs Expenses Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses Trend</CardTitle>
              <CardDescription>
                Monthly comparison of revenue and expenses for {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [typeof value === 'number' ? formatCurrency(value) : value, name]}/>
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stackId="1" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.6}
                    name="Revenue"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stackId="1" 
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.6}
                    name="Expenses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Profit Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Profit Trend</CardTitle>
              <CardDescription>
                Monthly profit performance for {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [typeof value === 'number' ? formatCurrency(value) : value, 'Profit']}/>
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {/* Customer Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Growth & Retention</CardTitle>
              <CardDescription>
                New vs returning customers and growth trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="new_customers" fill="#10b981" name="New Customers" />
                  <Bar dataKey="returning_customers" fill="#3b82f6" name="Returning Customers" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Service Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Service Volume Trends</CardTitle>
              <CardDescription>
                Monthly service count and average ticket size
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="services_count" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    name="Services Count"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="average_ticket_size" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    name="Avg Ticket Size"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          {/* Expense Categories Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown by Category</CardTitle>
              <CardDescription>
                Distribution of expenses across different categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [typeof value === 'number' ? formatCurrency(value) : value, 'Amount']}/>
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Category Details</h3>
                  {expenseCategories.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: `hsl(${index * 60}, 70%, 60%)` }}
                        />
                        <div>
                          <p className="font-medium">{category.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.percentage.toFixed(1)}% of total
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{formatCurrency(category.amount)}</span>
                        {getTrendIcon(category.trend)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Expenses Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Expenses Overview</CardTitle>
              <CardDescription>
                Track your total expenses for each month to monitor spending patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Monthly Expenses Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyExpensesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [typeof value === 'number' ? formatCurrency(value) : value, 'Total Expenses']}
                        labelStyle={{ color: '#374151' }}
                      />
                      <Bar 
                        dataKey="totalExpenses" 
                        fill="#ef4444" 
                        name="Total Expenses"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Monthly Expenses Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Monthly Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-3 font-medium">Month</th>
                          <th className="text-left p-3 font-medium">Total Expenses</th>
                          <th className="text-left p-3 font-medium">Expense Count</th>
                          <th className="text-left p-3 font-medium">Avg per Expense</th>
                          <th className="text-left p-3 font-medium">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyExpensesData.map((monthData, index) => (
                          <tr key={monthData.month} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{monthData.month}</td>
                            <td className="p-3 text-red-600 font-bold">
                              {formatCurrency(monthData.totalExpenses)}
                            </td>
                            <td className="p-3">{monthData.expenseCount}</td>
                            <td className="p-3 text-gray-600">
                              {monthData.expenseCount > 0 
                                ? formatCurrency(monthData.totalExpenses / monthData.expenseCount)
                                : 'N/A'
                              }
                            </td>
                            <td className="p-3">
                              {index > 0 && (
                                <div className="flex items-center gap-2">
                                  {monthData.totalExpenses > monthlyExpensesData[index - 1].totalExpenses ? (
                                    <TrendingUp className="h-4 w-4 text-red-600" />
                                  ) : monthData.totalExpenses < monthlyExpensesData[index - 1].totalExpenses ? (
                                    <TrendingDown className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <DollarSign className="h-4 w-4 text-gray-600" />
                                  )}
                                  <span className={`text-sm ${
                                    monthData.totalExpenses > monthlyExpensesData[index - 1].totalExpenses 
                                      ? 'text-red-600' 
                                      : monthData.totalExpenses < monthlyExpensesData[index - 1].totalExpenses 
                                        ? 'text-green-600' 
                                        : 'text-gray-600'
                                  }`}>
                                    {index > 0 ? (
                                      monthData.totalExpenses > monthlyExpensesData[index - 1].totalExpenses 
                                        ? `+${formatCurrency(monthData.totalExpenses - monthlyExpensesData[index - 1].totalExpenses)}`
                                        : monthData.totalExpenses < monthlyExpensesData[index - 1].totalExpenses 
                                          ? `-${formatCurrency(monthlyExpensesData[index - 1].totalExpenses - monthData.totalExpenses)}`
                                          : 'No change'
                                    ) : 'N/A'
                                    }
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add Expenses Tab */}
        <TabsContent value="add-expenses" className="space-y-6">
          {/* Setup Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900"> </h4>
                <p className="text-sm text-blue-700">
                    
                    <code className="bg-blue-100 px-2 py-1 rounded text-xs"> </code>
                </p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Add New Expenses</CardTitle>
              <CardDescription>
                Record your business expenses for better financial tracking and analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleExpenseSubmit} className="space-y-6">
                {/* Expense Fields */}
                <div className="space-y-4">
                  {expenseFields.map((field, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-gray-50">
                      <div>
                        <Label htmlFor={`expense-name-${index}`}>Expense Name *</Label>
                        <Input
                          id={`expense-name-${index}`}
                          value={field.name}
                          onChange={(e) => handleExpenseFieldChange(index, 'name', e.target.value)}
                          placeholder="e.g., Office Supplies, Utilities"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`expense-category-${index}`}>Category *</Label>
                        <Select 
                          value={field.category} 
                          onValueChange={(value) => handleExpenseFieldChange(index, 'category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inventory">Inventory</SelectItem>
                            <SelectItem value="utilities">Utilities</SelectItem>
                            <SelectItem value="staff_salaries">Staff Salaries</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="rent">Rent</SelectItem>
                            <SelectItem value="insurance">Insurance</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor={`expense-amount-${index}`}>Amount (TZS) *</Label>
                        <Input
                          id={`expense-amount-${index}`}
                          type="number"
                          value={field.amount}
                          onChange={(e) => handleExpenseFieldChange(index, 'amount', e.target.value)}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeExpenseField(index)}
                          className="w-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add More Fields Button */}
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addExpenseField}
                    className="border-dashed border-2 border-gray-300 hover:border-gray-400"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Expense
                  </Button>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={isSubmittingExpenses}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSubmittingExpenses ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving Expenses...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save All Expenses
                      </>
                      )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>
                View your recently added expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentExpenses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No expenses recorded yet. Start adding expenses above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentExpenses.map((expense, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div>
                          <p className="font-medium">{expense.name}</p>
                          <p className="text-sm text-gray-500 capitalize">{expense.category.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                        <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          {/* Top Products Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products Performance</CardTitle>
              <CardDescription>
                Best-selling products and their revenue contribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product_name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [name === 'revenue_generated' ? (typeof value === 'number' ? formatCurrency(value) : value) : value, name === 'revenue_generated' ? 'Revenue' : 'Quantity']}/>
                  <Bar dataKey="revenue_generated" fill="#3b82f6" name="Revenue" />
                  <Bar dataKey="quantity_sold" fill="#10b981" name="Quantity" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Product Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Product Performance Details</CardTitle>
              <CardDescription>
                Comprehensive breakdown of product performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Product</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Quantity Sold</th>
                      <th className="text-left p-2">Revenue</th>
                      <th className="text-left p-2">Profit Margin</th>
                      <th className="text-left p-2">Stock Level</th>
                      <th className="text-left p-2">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product) => (
                      <tr key={product.product_id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{product.product_name}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            {product.category}
                          </Badge>
                        </td>
                        <td className="p-2">{product.quantity_sold}</td>
                        <td className="p-2 text-green-600 font-medium">
                          {formatCurrency(product.revenue_generated)}
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            {product.profit_margin.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge 
                            variant="outline" 
                            className={product.stock_level < 10 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                          >
                            {product.stock_level}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge 
                            variant="outline" 
                            className={
                              product.trend === 'increasing' ? 'bg-green-100 text-green-800' :
                              product.trend === 'decreasing' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {product.trend.charAt(0).toUpperCase() + product.trend.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Expense Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown by Category</CardTitle>
          <CardDescription>
            Distribution of expenses across different categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenseCategories.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: `hsl(${index * 60}, 70%, 60%)` }}
                  />
                  <div>
                    <p className="font-medium">{category.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {category.percentage.toFixed(1)}% of total
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatCurrency(category.amount)}</span>
                  {getTrendIcon(category.trend)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Products Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products Performance</CardTitle>
          <CardDescription>
            Best-selling products and their revenue contribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Quantity Sold</th>
                  <th className="text-left p-2">Revenue</th>
                  <th className="text-left p-2">Profit Margin</th>
                  <th className="text-left p-2">Stock Level</th>
                  <th className="text-left p-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product) => (
                  <tr key={product.product_id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{product.product_name}</td>
                    <td className="p-2">{product.quantity_sold}</td>
                    <td className="p-2 text-green-600 font-medium">
                      {formatCurrency(product.revenue_generated)}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        {product.profit_margin.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge 
                        variant="outline" 
                        className={product.stock_level < 10 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                      >
                        {product.stock_level}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge 
                        variant="outline" 
                        className={
                          product.trend === 'increasing' ? 'bg-green-100 text-green-800' :
                          product.trend === 'decreasing' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {product.trend.charAt(0).toUpperCase() + product.trend.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Business Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Business Intelligence & Insights</CardTitle>
          <CardDescription>
            AI-powered recommendations and business insights based on your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {businessInsights.map((insight, index) => (
              <div 
                key={index} 
                className={`p-4 border rounded-lg ${
                  insight.priority === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                  insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-green-100 text-green-800 border-green-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {insight.type === 'warning' ? <AlertTriangle className="h-5 w-5 text-red-600" /> :
                   insight.type === 'opportunity' ? <Lightbulb className="h-5 w-5 text-yellow-600" /> :
                   insight.type === 'trend' ? <TrendingUp className="h-5 w-5 text-blue-600" /> :
                   <BarChart3 className="h-5 w-5 text-green-600" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{insight.title}</h4>
                      {insight.action_required && (
                        <Badge variant="destructive" className="text-xs">Action Required</Badge>
                      )}
                    </div>
                    <p className="text-sm">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Professional Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Professional Financial Analytics System
            </h3>
            <p className="text-blue-800 mb-3">
              This comprehensive financial analytics dashboard provides real-time insights into your salon's financial performance, 
              helping you make data-driven decisions to optimize profitability and business growth.
            </p>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• <strong>Real-Time Data:</strong> All financial metrics updated automatically from your business operations</p>
              <p>• <strong>Expense Tracking:</strong> Monitor and categorize all business expenses for better cost control</p>
              <p>• <strong>Product Analytics:</strong> Identify top-performing products and optimize inventory management</p>
              <p>• <strong>Business Insights:</strong> AI-powered recommendations for business improvement</p>
              <p>• <strong>Professional Charts:</strong> Interactive visualizations for better data understanding</p>
              <p>• <strong>Export Functionality:</strong> Download comprehensive financial reports for stakeholders</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}