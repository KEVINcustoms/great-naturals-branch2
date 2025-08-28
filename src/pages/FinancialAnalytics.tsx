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
  const [revenueExpenseData, setRevenueExpenseData] = useState<MonthlyData[]>([]);
  const [trendsData, setTrendsData] = useState<MonthlyData[]>([]);
  const [realBusinessInsights, setRealBusinessInsights] = useState<BusinessInsight[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchFinancialData();
    fetchRecentExpenses();
    fetchMonthlyExpenses();
    fetchExpenseCategories();
    fetchProductPerformance();
    fetchRevenueExpenseData();
    fetchTrendsData();
    generateBusinessInsights();
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

      // Top products will be fetched separately by fetchProductPerformance
      // This ensures real-time data based on selected period and year

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
         .from('expenses')
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
         .from('expenses')
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
      let startDate: Date;
      let monthsToShow: number;
      
      // Calculate date range based on selected period and year
      const selectedYearNum = parseInt(selectedYear);
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      
      switch (selectedPeriod) {
        case 'current_month':
          startDate = new Date(selectedYearNum, currentMonth, 1);
          monthsToShow = 1;
          break;
        case 'last_3_months':
          startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 2), 1);
          monthsToShow = 3;
          break;
        case 'last_6_months':
          startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 5), 1);
          monthsToShow = 6;
          break;
        case 'last_12_months':
          startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 11), 1);
          monthsToShow = 12;
          break;
        case 'custom_range':
        default:
          // For custom range, show the selected year
          startDate = new Date(selectedYearNum, 0, 1); // January 1st of selected year
          monthsToShow = 12;
          break;
      }
      
      // Adjust for year boundaries
      if (startDate.getFullYear() < selectedYearNum) {
        startDate = new Date(selectedYearNum, 0, 1);
      }
      
      const endDate = new Date(selectedYearNum, 11, 31); // December 31st of selected year
      
      const { data, error } = await supabase
        .from('expenses' as never)
        .select('*')
        .eq('created_by', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      // Group expenses by month
      const monthlyData: { [key: string]: MonthlyExpensesData } = {};
      
      // Initialize months based on selection
      for (let i = 0; i < monthsToShow; i++) {
        const date = new Date(startDate);
        date.setMonth(startDate.getMonth() + i);
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
        const aYear = parseInt(a.month.split(' ')[1]);
        const bYear = parseInt(b.month.split(' ')[1]);
        
        // First sort by year, then by month
        if (aYear !== bYear) {
          return aYear - bYear;
        }
        return aMonth - bMonth;
      });

      setMonthlyExpensesData(monthlyArray);
    } catch (error) {
      console.error("Error fetching monthly expenses:", error);
    }
  };

  const fetchExpenseCategories = async () => {
    if (!user) return;
    
    try {
      let startDate: Date;
      let endDate: Date;
      
      // Calculate date range based on selected period and year
      const selectedYearNum = parseInt(selectedYear);
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      
      switch (selectedPeriod) {
        case 'current_month':
          startDate = new Date(selectedYearNum, currentMonth, 1);
          endDate = new Date(selectedYearNum, currentMonth + 1, 0); // Last day of current month
          break;
        case 'last_3_months':
          startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 2), 1);
          endDate = new Date(selectedYearNum, currentMonth + 1, 0);
          break;
        case 'last_6_months':
          startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 5), 1);
          endDate = new Date(selectedYearNum, currentMonth + 1, 0);
          break;
        case 'last_12_months':
          startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 11), 1);
          endDate = new Date(selectedYearNum, currentMonth + 1, 0);
          break;
        case 'custom_range':
        default:
          // For custom range, show the selected year
          startDate = new Date(selectedYearNum, 0, 1); // January 1st of selected year
          endDate = new Date(selectedYearNum, 11, 31); // December 31st of selected year
          break;
      }
      
      // Adjust for year boundaries
      if (startDate.getFullYear() < selectedYearNum) {
        startDate = new Date(selectedYearNum, 0, 1);
      }
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('created_by', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      // Group expenses by category
      const categoryData: { [key: string]: { amount: number; count: number } } = {};
      
      if (data) {
        data.forEach((expense: ExpenseRecord) => {
          const category = expense.category || 'Uncategorized';
          if (!categoryData[category]) {
            categoryData[category] = { amount: 0, count: 0 };
          }
          categoryData[category].amount += expense.amount;
          categoryData[category].count += 1;
        });
      }

      // Calculate total expenses for percentage calculation
      const totalExpenses = Object.values(categoryData).reduce((sum, cat) => sum + cat.amount, 0);

      // Convert to array format and calculate percentages
      const categoriesArray = Object.entries(categoryData).map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        count: data.count,
        trend: 'stable' as const, // We'll implement trend calculation later
        budget: 0, // We'll implement budget tracking later
        variance: 0,
        lastMonthAmount: 0 // We'll implement comparison later
      }));

      // Sort by amount (highest first)
      categoriesArray.sort((a, b) => b.amount - a.amount);

      setExpenseCategories(categoriesArray);
    } catch (error) {
      console.error("Error fetching expense categories:", error);
      toast({
        title: "Error",
        description: "Failed to fetch expense categories",
        variant: "destructive",
      });
    }
  };

    const fetchProductPerformance = async () => {
    if (!user) return;
    
    try {
      let startDate: Date;
      let endDate: Date;
      
      // Calculate date range based on selected period and year
      const selectedYearNum = parseInt(selectedYear);
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      
      switch (selectedPeriod) {
        case 'current_month':
          startDate = new Date(selectedYearNum, currentMonth, 1);
          endDate = new Date(selectedYearNum, currentMonth + 1, 0); // Last day of current month
          break;
        case 'last_3_months':
          startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 2), 1);
          endDate = new Date(selectedYearNum, currentMonth + 1, 0);
          break;
        case 'last_6_months':
          startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 5), 1);
          endDate = new Date(selectedYearNum, currentMonth + 1, 0);
          break;
        case 'last_12_months':
          startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 11), 1);
          endDate = new Date(selectedYearNum, currentMonth + 1, 0);
          break;
        case 'custom_range':
        default:
          // For custom range, show the selected year
          startDate = new Date(selectedYearNum, 0, 1); // January 1st of selected year
          endDate = new Date(selectedYearNum, 11, 31); // December 31st of selected year
          break;
      }
      
      // Adjust for year boundaries
      if (startDate.getFullYear() < selectedYearNum) {
        startDate = new Date(selectedYearNum, 0, 1);
      }
      
      console.log("Fetching product performance for period:", selectedPeriod, "year:", selectedYear);
      console.log("Date range:", startDate.toISOString(), "to", endDate.toISOString());
      
             // First, get completed services within the date range
       const { data: completedServices, error: servicesError } = await supabase
         .from('services')
         .select('id, date_time, service_price')
         .eq('status', 'completed')
         .gte('date_time', startDate.toISOString())
         .lte('date_time', endDate.toISOString())
         .eq('created_by', user.id);

      if (servicesError) {
        console.error("Error fetching completed services:", servicesError);
        throw servicesError;
      }

      console.log("Found", completedServices?.length || 0, "completed services");

      if (!completedServices || completedServices.length === 0) {
        // No completed services in this period, show empty state
        setTopProducts([]);
        return;
      }

      // Get the service IDs to fetch their products
      const serviceIds = completedServices.map(service => service.id);
      
             // Fetch service products for these services
       const { data: serviceProductsData, error: serviceProductsError } = await supabase
         .from('service_products')
         .select('service_id, product_id, quantity, price_per_unit, total_price')
         .in('service_id', serviceIds);

            if (serviceProductsError) {
        console.error("Error fetching service products:", serviceProductsError);
        throw serviceProductsError;
      }

      console.log("Found", serviceProductsData?.length || 0, "service products");

      if (!serviceProductsData || serviceProductsData.length === 0) {
        // No products used in services, show empty state
        setTopProducts([]);
        return;
      }

      // Get unique product IDs to fetch inventory details
      const productIds = [...new Set(serviceProductsData.map(sp => sp.product_id))];
      
             // Fetch inventory items for these products
       const { data: inventoryItems, error: inventoryError } = await supabase
         .from('inventory_items')
         .select('id, name, unit_price')
         .in('id', productIds);

      if (inventoryError) {
        console.error("Error fetching inventory items:", inventoryError);
        throw inventoryError;
      }

      // Create a map for quick lookup
      const inventoryMap = new Map(
        inventoryItems?.map(item => [item.id, item]) || []
      );

      console.log("Processing service products with inventory data...");
      console.log("Found", inventoryItems?.length || 0, "inventory items");
      console.log("Sample service product item:", serviceProductsData?.[0]);

      // Group product sales data
      const productSalesData: { [key: string]: { 
        product_id: string; 
        product_name: string; 
        category: string; 
        quantity_sold: number; 
        revenue_generated: number; 
        unit_price: number;
        total_quantity: number;
      } } = {};
      
             serviceProductsData.forEach((item: {
         product_id: string;
         quantity: number;
         price_per_unit: number;
       }) => {
         const productId = item.product_id;
         const product = inventoryMap.get(item.product_id);
         
         if (!productSalesData[productId]) {
           productSalesData[productId] = {
             product_id: productId,
             product_name: product?.name || 'Unknown Product',
             category: 'Inventory Item', // Default category for inventory items
             quantity_sold: 0,
             revenue_generated: 0,
             unit_price: product?.unit_price || 0,
             total_quantity: 0
           };
         }
        
        // Aggregate sales data
        const quantity = item.quantity || 0;
        const price = item.price_per_unit || 0;
        
        productSalesData[productId].quantity_sold += quantity;
        productSalesData[productId].revenue_generated += quantity * price;
        productSalesData[productId].total_quantity += quantity;
      });

      // Convert to array and calculate additional metrics
      const productsArray = Object.values(productSalesData).map(product => {
        // Calculate profit margin (assuming 30% profit margin for demo)
        const cost = product.revenue_generated * 0.7; // 70% of revenue as cost
        const profit = product.revenue_generated - cost;
        const profit_margin = product.revenue_generated > 0 ? (profit / product.revenue_generated) * 100 : 0;
        
        // Mock stock level and reorder point for now
        const stock_level = Math.max(0, Math.floor(Math.random() * 50) + 10);
        const reorder_point = Math.floor(stock_level * 0.3);
        
        // Calculate days of inventory (simplified)
        const days_of_inventory = product.quantity_sold > 0 ? Math.floor((stock_level / product.quantity_sold) * 30) : 0;
        
        // Determine trend based on stock level vs reorder point
        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (stock_level < reorder_point) {
          trend = 'decreasing';
        } else if (stock_level > reorder_point * 2) {
          trend = 'increasing';
        }
        
        // Mock supplier
        const suppliers = ['Supplier A', 'Supplier B', 'Supplier C', 'Local Vendor'];
        const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
        
        return {
          ...product,
          profit_margin: Math.round(profit_margin * 10) / 10, // Round to 1 decimal place
          stock_level,
          reorder_point,
          days_of_inventory,
          trend,
          supplier
        };
      });

      // Sort by revenue generated (highest first)
      productsArray.sort((a, b) => b.revenue_generated - a.revenue_generated);

      // Take top 10 products
      const topProducts = productsArray.slice(0, 10);
      
             console.log("Processed", topProducts.length, "top inventory items from separate queries");
       setTopProducts(topProducts);
      
    } catch (error) {
      console.error("Error fetching product performance:", error);
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to fetch product performance data. Please try again.",
        variant: "destructive",
      });
      
             // Set empty array on error
       setTopProducts([]);
     }
   };

   const fetchRevenueExpenseData = async () => {
     if (!user) return;
     
     try {
       let startDate: Date;
       let endDate: Date;
       
       // Calculate date range based on selected period and year
       const selectedYearNum = parseInt(selectedYear);
       const currentYear = new Date().getFullYear();
       const currentMonth = new Date().getMonth();
       
       switch (selectedPeriod) {
         case 'current_month':
           startDate = new Date(selectedYearNum, currentMonth, 1);
           endDate = new Date(selectedYearNum, currentMonth + 1, 0); // Last day of current month
           break;
         case 'last_3_months':
           startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 2), 1);
           endDate = new Date(selectedYearNum, currentMonth + 1, 0);
           break;
         case 'last_6_months':
           startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 5), 1);
           endDate = new Date(selectedYearNum, currentMonth + 1, 0);
           break;
         case 'last_12_months':
           startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 11), 1);
           endDate = new Date(selectedYearNum, currentMonth + 1, 0);
           break;
         case 'custom_range':
         default:
           // For custom range, show the selected year
           startDate = new Date(selectedYearNum, 0, 1); // January 1st of selected year
           endDate = new Date(selectedYearNum, 11, 31); // December 31st of selected year
           break;
       }
       
       // Adjust for year boundaries
       if (startDate.getFullYear() < selectedYearNum) {
         startDate = new Date(selectedYearNum, 0, 1);
       }

       console.log("Fetching revenue vs expense data for period:", selectedPeriod, "year:", selectedYear);
       console.log("Date range:", startDate.toISOString(), "to", endDate.toISOString());

       // Fetch completed services for revenue calculation
       const { data: completedServices, error: servicesError } = await supabase
         .from('services' as never)
         .select('id, date_time, service_price, service_products(total_price)')
         .eq('status', 'completed')
         .gte('date_time', startDate.toISOString())
         .lte('date_time', endDate.toISOString())
         .eq('created_by', user.id);

       if (servicesError) {
         console.error("Error fetching completed services:", servicesError);
         throw servicesError;
       }

       // Fetch expenses for the same period
       const { data: expensesData, error: expensesError } = await supabase
         .from('expenses' as never)
         .select('*')
         .eq('created_by', user.id)
         .gte('date', startDate.toISOString().split('T')[0])
         .lte('date', endDate.toISOString().split('T')[0]);

       if (expensesError) {
         console.error("Error fetching expenses:", expensesError);
         throw expensesError;
       }

       console.log("Found", completedServices?.length || 0, "completed services");
       console.log("Found", expensesData?.length || 0, "expenses");

       // Calculate months to show based on selection
       let monthsToShow: number;
       switch (selectedPeriod) {
         case 'current_month':
           monthsToShow = 1;
           break;
         case 'last_3_months':
           monthsToShow = 3;
           break;
         case 'last_6_months':
           monthsToShow = 6;
           break;
         case 'last_12_months':
           monthsToShow = 12;
           break;
         case 'custom_range':
         default:
           monthsToShow = 12;
           break;
       }

       // Initialize monthly data structure
       const monthlyData: { [key: string]: MonthlyData } = {};
       
       for (let i = 0; i < monthsToShow; i++) {
         const date = new Date(startDate);
         date.setMonth(startDate.getMonth() + i);
         const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
         monthlyData[monthKey] = {
           month: monthKey,
           revenue: 0,
           expenses: 0,
           profit: 0,
           services_count: 0,
           customer_count: 0,
           new_customers: 0,
           returning_customers: 0,
           average_ticket_size: 0,
           profit_margin: 0
         };
       }

       // Aggregate service revenue by month
       if (completedServices) {
         completedServices.forEach((service: {
           date_time: string;
           service_price: number;
           service_products?: { total_price: number }[];
         }) => {
           const serviceDate = new Date(service.date_time);
           const monthKey = serviceDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
           
           if (monthlyData[monthKey]) {
             // Calculate total revenue including service price and products
             let totalRevenue = service.service_price || 0;
             
             // Add product revenue if service_products exist
             if (service.service_products && Array.isArray(service.service_products)) {
               const productRevenue = service.service_products.reduce((sum: number, sp: { total_price: number }) => 
                 sum + (sp.total_price || 0), 0
               );
               totalRevenue += productRevenue;
             }
             
             monthlyData[monthKey].revenue += totalRevenue;
             monthlyData[monthKey].services_count += 1;
           }
         });
       }

       // Aggregate expenses by month
       if (expensesData) {
         expensesData.forEach((expense: ExpenseRecord) => {
           const expenseDate = new Date(expense.date);
           const monthKey = expenseDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
           
           if (monthlyData[monthKey]) {
             monthlyData[monthKey].expenses += expense.amount;
           }
         });
       }

       // Calculate profit and other metrics for each month
       Object.values(monthlyData).forEach(month => {
         month.profit = month.revenue - month.expenses;
         month.profit_margin = month.revenue > 0 ? (month.profit / month.revenue) * 100 : 0;
         month.average_ticket_size = month.services_count > 0 ? month.revenue / month.services_count : 0;
         
         // For now, we'll use a simplified customer count (can be enhanced later)
         month.customer_count = month.services_count; // Assuming 1 customer per service for now
         month.new_customers = Math.floor(month.services_count * 0.2); // 20% new customers estimate
         month.returning_customers = month.customer_count - month.new_customers;
       });

       // Convert to array and sort by month
       const monthlyArray = Object.values(monthlyData).sort((a, b) => {
         const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
         const aMonth = months.indexOf(a.month.split(' ')[0]);
         const bMonth = months.indexOf(b.month.split(' ')[0]);
         const aYear = parseInt(a.month.split(' ')[1]);
         const bYear = parseInt(b.month.split(' ')[1]);
         
         // First sort by year, then by month
         if (aYear !== bYear) {
           return aYear - bYear;
         }
         return aMonth - bMonth;
       });

       console.log("Processed revenue vs expense data:", monthlyArray);
       setRevenueExpenseData(monthlyArray);
       
     } catch (error) {
       console.error("Error fetching revenue vs expense data:", error);
       toast({
         title: "Error",
         description: "Failed to fetch revenue vs expense data. Please try again.",
         variant: "destructive",
       });
       
       // Set empty array on error
       setRevenueExpenseData([]);
     }
   };

   const fetchTrendsData = async () => {
     if (!user) return;
     
     try {
       let startDate: Date;
       let endDate: Date;
       
       // Calculate date range based on selected period and year
       const selectedYearNum = parseInt(selectedYear);
       const currentYear = new Date().getFullYear();
       const currentMonth = new Date().getMonth();
       
       switch (selectedPeriod) {
         case 'current_month':
           startDate = new Date(selectedYearNum, currentMonth, 1);
           endDate = new Date(selectedYearNum, currentMonth + 1, 0); // Last day of current month
           break;
         case 'last_3_months':
           startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 2), 1);
           endDate = new Date(selectedYearNum, currentMonth + 1, 0);
           break;
         case 'last_6_months':
           startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 5), 1);
           endDate = new Date(selectedYearNum, currentMonth + 1, 0);
           break;
         case 'last_12_months':
           startDate = new Date(selectedYearNum, Math.max(0, currentMonth - 11), 1);
           endDate = new Date(selectedYearNum, currentMonth + 1, 0);
           break;
         case 'custom_range':
         default:
           // For custom range, show the selected year
           startDate = new Date(selectedYearNum, 0, 1); // January 1st of selected year
           endDate = new Date(selectedYearNum, 11, 31); // December 31st of selected year
           break;
       }
       
       // Adjust for year boundaries
       if (startDate.getFullYear() < selectedYearNum) {
         startDate = new Date(selectedYearNum, 0, 1);
       }

       console.log("Fetching trends data for period:", selectedPeriod, "year:", selectedYear);
       console.log("Date range:", startDate.toISOString(), "to", endDate.toISOString());

       // Fetch completed services for customer and service analysis
       const { data: completedServices, error: servicesError } = await supabase
         .from('services')
         .select('id, date_time, service_price, customer_id, service_products(total_price)')
         .eq('status', 'completed')
         .gte('date_time', startDate.toISOString())
         .lte('date_time', endDate.toISOString())
         .eq('created_by', user.id);

       if (servicesError) {
         console.error("Error fetching completed services for trends:", servicesError);
         throw servicesError;
       }

       // Fetch customers to determine new vs returning
       const { data: allCustomers, error: customersError } = await supabase
         .from('customers' as never)
         .select('id, created_at')
         .eq('created_by', user.id);

       if (customersError) {
         console.error("Error fetching customers for trends:", customersError);
         throw customersError;
       }

       console.log("Found", completedServices?.length || 0, "completed services for trends");
       console.log("Found", allCustomers?.length || 0, "total customers");

       // Calculate months to show based on selection
       let monthsToShow: number;
       switch (selectedPeriod) {
         case 'current_month':
           monthsToShow = 1;
           break;
         case 'last_3_months':
           monthsToShow = 3;
           break;
         case 'last_6_months':
           monthsToShow = 6;
           break;
         case 'last_12_months':
           monthsToShow = 12;
           break;
         case 'custom_range':
         default:
           monthsToShow = 12;
           break;
       }

       // Initialize monthly trends data structure
       const monthlyTrendsData: { [key: string]: MonthlyData } = {};
       
       for (let i = 0; i < monthsToShow; i++) {
         const date = new Date(startDate);
         date.setMonth(startDate.getMonth() + i);
         const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
         monthlyTrendsData[monthKey] = {
           month: monthKey,
           revenue: 0,
           expenses: 0,
           profit: 0,
           services_count: 0,
           customer_count: 0,
           new_customers: 0,
           returning_customers: 0,
           average_ticket_size: 0,
           profit_margin: 0
         };
       }

       // Track unique customers per month and their first service date
       const monthlyCustomerData: { [key: string]: { 
         uniqueCustomers: Set<string>; 
         newCustomers: Set<string>; 
         returningCustomers: Set<string>; 
         totalRevenue: number; 
         servicesCount: number; 
       } } = {};

       // Initialize customer tracking for each month
       Object.keys(monthlyTrendsData).forEach(monthKey => {
         monthlyCustomerData[monthKey] = {
           uniqueCustomers: new Set(),
           newCustomers: new Set(),
           returningCustomers: new Set(),
           totalRevenue: 0,
           servicesCount: 0
         };
       });

       // Process completed services
       if (completedServices) {
         completedServices.forEach((service: {
           date_time: string;
           service_price: number;
           customer_id: string;
           service_products?: { total_price: number }[];
         }) => {
           const serviceDate = new Date(service.date_time);
           const monthKey = serviceDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
           
           if (monthlyCustomerData[monthKey]) {
             // Calculate total revenue including service price and products
             let totalRevenue = service.service_price || 0;
             
             // Add product revenue if service_products exist
             if (service.service_products && Array.isArray(service.service_products)) {
               const productRevenue = service.service_products.reduce((sum: number, sp: { total_price: number }) => 
                 sum + (sp.total_price || 0), 0
               );
               totalRevenue += productRevenue;
             }
             
             monthlyCustomerData[monthKey].totalRevenue += totalRevenue;
             monthlyCustomerData[monthKey].servicesCount += 1;
             monthlyCustomerData[monthKey].uniqueCustomers.add(service.customer_id);
           }
         });
       }

       // Determine new vs returning customers for each month
       if (allCustomers) {
         allCustomers.forEach((customer: { id: string; created_at: string }) => {
           const customerCreatedDate = new Date(customer.created_at);
           
           // Check each month to see if this customer was new or returning
           Object.entries(monthlyCustomerData).forEach(([monthKey, monthData]) => {
             const monthDate = new Date();
             const [monthStr, yearStr] = monthKey.split(' ');
             const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthStr);
             monthDate.setMonth(monthIndex);
             monthDate.setFullYear(parseInt(yearStr));
             
             // If customer was created in this month, they're new
             if (customerCreatedDate.getMonth() === monthDate.getMonth() && 
                 customerCreatedDate.getFullYear() === monthDate.getFullYear()) {
               monthData.newCustomers.add(customer.id);
             } else if (monthData.uniqueCustomers.has(customer.id)) {
               // If customer exists in this month but wasn't created here, they're returning
               monthData.returningCustomers.add(customer.id);
             }
           });
         });
       }

       // Convert to final format
       Object.entries(monthlyCustomerData).forEach(([monthKey, monthData]) => {
         if (monthlyTrendsData[monthKey]) {
           monthlyTrendsData[monthKey].revenue = monthData.totalRevenue;
           monthlyTrendsData[monthKey].services_count = monthData.servicesCount;
           monthlyTrendsData[monthKey].customer_count = monthData.uniqueCustomers.size;
           monthlyTrendsData[monthKey].new_customers = monthData.newCustomers.size;
           monthlyTrendsData[monthKey].returning_customers = monthData.returningCustomers.size;
           monthlyTrendsData[monthKey].average_ticket_size = monthData.servicesCount > 0 ? monthData.totalRevenue / monthData.servicesCount : 0;
         }
       });

       // Convert to array and sort by month
       const trendsArray = Object.values(monthlyTrendsData).sort((a, b) => {
         const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
         const aMonth = months.indexOf(a.month.split(' ')[0]);
         const bMonth = months.indexOf(b.month.split(' ')[0]);
         const aYear = parseInt(a.month.split(' ')[1]);
         const bYear = parseInt(b.month.split(' ')[1]);
         
         // First sort by year, then by month
         if (aYear !== bYear) {
           return aYear - bYear;
         }
         return aMonth - bMonth;
       });

       console.log("Processed trends data:", trendsArray);
       setTrendsData(trendsArray);
       
     } catch (error) {
       console.error("Error fetching trends data:", error);
       toast({
         title: "Error",
         description: "Failed to fetch trends data. Please try again.",
         variant: "destructive",
       });
       
              // Set empty array on error
       setTrendsData([]);
     }
   };

   const generateBusinessInsights = async () => {
     if (!user) return;
     
     try {
       console.log("Generating business insights for period:", selectedPeriod, "year:", selectedYear);
       
       const insights: BusinessInsight[] = [];
       
       // Insight 1: Revenue Performance Analysis
       if (revenueExpenseData.length > 0) {
         const totalRevenue = revenueExpenseData.reduce((sum, month) => sum + month.revenue, 0);
         const totalServices = revenueExpenseData.reduce((sum, month) => sum + month.services_count, 0);
         const avgTicketSize = totalServices > 0 ? totalRevenue / totalServices : 0;
         
         if (totalRevenue > 0) {
           // Revenue growth insight
           if (revenueExpenseData.length > 1) {
             const firstMonth = revenueExpenseData[0];
             const lastMonth = revenueExpenseData[revenueExpenseData.length - 1];
             const growthRate = ((lastMonth.revenue - firstMonth.revenue) / firstMonth.revenue) * 100;
             
             if (growthRate > 10) {
               insights.push({
                 type: 'trend',
                 title: 'Strong Revenue Growth',
                 description: `Revenue has grown by ${growthRate.toFixed(1)}% over the selected period. Keep up the momentum!`,
                 priority: 'low',
                 action_required: false,
                 impact_score: 75,
                 implementation_difficulty: 'easy',
                 estimated_roi: 2000,
                 timeframe: '1 month'
               });
             } else if (growthRate < -5) {
               insights.push({
                 type: 'warning',
                 title: 'Revenue Decline Alert',
                 description: `Revenue has declined by ${Math.abs(growthRate).toFixed(1)}% over the selected period. Investigate causes and implement recovery strategies.`,
                 priority: 'high',
                 action_required: true,
                 impact_score: 90,
                 implementation_difficulty: 'medium',
                 estimated_roi: 3000,
                 timeframe: '2 weeks'
               });
             }
           }
           
           // Average ticket size insight
           if (avgTicketSize < 50) {
             insights.push({
               type: 'opportunity',
               title: 'Increase Average Ticket Size',
               description: `Current average ticket size is ${formatCurrency(avgTicketSize)}. Consider upselling services or bundling products to increase revenue per customer.`,
               priority: 'medium',
               action_required: false,
               impact_score: 80,
               implementation_difficulty: 'medium',
               estimated_roi: 2500,
               timeframe: '1 month'
             });
           }
         }
       }
       
       // Insight 2: Customer Analysis
       if (trendsData.length > 0) {
         const totalCustomers = trendsData.reduce((sum, month) => sum + month.customer_count, 0);
         const totalNewCustomers = trendsData.reduce((sum, month) => sum + month.new_customers, 0);
         const customerRetentionRate = totalCustomers > 0 ? ((totalCustomers - totalNewCustomers) / totalCustomers) * 100 : 0;
         
         if (customerRetentionRate < 70) {
           insights.push({
             type: 'warning',
             title: 'Customer Retention Needs Improvement',
             description: `Customer retention rate is ${customerRetentionRate.toFixed(1)}%. Focus on customer satisfaction and loyalty programs to increase repeat business.`,
             priority: 'high',
             action_required: true,
             impact_score: 85,
             implementation_difficulty: 'medium',
             estimated_roi: 4000,
             timeframe: '2 weeks'
           });
         } else if (customerRetentionRate > 85) {
           insights.push({
             type: 'trend',
             title: 'Excellent Customer Retention',
             description: `Customer retention rate is ${customerRetentionRate.toFixed(1)}%. Your customer service is working well!`,
             priority: 'low',
             action_required: false,
             impact_score: 60,
             implementation_difficulty: 'easy',
             estimated_roi: 1000,
             timeframe: '1 month'
           });
         }
         
         // New customer acquisition insight
         if (totalNewCustomers > 0) {
           const avgNewCustomersPerMonth = totalNewCustomers / trendsData.length;
           if (avgNewCustomersPerMonth < 5) {
             insights.push({
               type: 'opportunity',
               title: 'Increase New Customer Acquisition',
               description: `Average new customers per month is ${avgNewCustomersPerMonth.toFixed(1)}. Consider marketing campaigns and referral programs to attract more customers.`,
               priority: 'medium',
               action_required: false,
               impact_score: 75,
               implementation_difficulty: 'medium',
               estimated_roi: 3000,
               timeframe: '1 month'
             });
           }
         }
       }
       
       // Insight 3: Product Performance Analysis
       if (topProducts.length > 0) {
         const topPerformer = topProducts[0];
         const lowPerformers = topProducts.filter(p => p.revenue_generated < topPerformer.revenue_generated * 0.3);
         
         if (topPerformer) {
           insights.push({
             type: 'opportunity',
             title: 'Top Product Performance',
             description: `${topPerformer.product_name} is your best seller with ${formatCurrency(topPerformer.revenue_generated)} revenue. Consider increasing stock and promoting similar products.`,
             priority: 'low',
             action_required: false,
             impact_score: 70,
             implementation_difficulty: 'easy',
             estimated_roi: 2000,
             timeframe: '1 month'
           });
         }
         
         if (lowPerformers.length > 0) {
           insights.push({
             type: 'recommendation',
             title: 'Optimize Low-Performing Products',
             description: `${lowPerformers.length} products are underperforming. Consider promotional strategies, price adjustments, or discontinuing slow-moving items.`,
             priority: 'medium',
             action_required: false,
             impact_score: 65,
             implementation_difficulty: 'medium',
             estimated_roi: 1500,
             timeframe: '1 month'
           });
         }
         
         // Stock level insights
         const lowStockProducts = topProducts.filter(p => p.stock_level < 10);
         if (lowStockProducts.length > 0) {
           insights.push({
             type: 'warning',
             title: 'Low Stock Alert',
             description: `${lowStockProducts.length} products have low stock levels. Reorder soon to avoid stockouts and lost sales.`,
             priority: 'high',
             action_required: true,
             impact_score: 90,
             implementation_difficulty: 'easy',
             estimated_roi: 5000,
             timeframe: '1 week'
           });
         }
       }
       
       // Insight 4: Seasonal Trends
       if (trendsData.length >= 3) {
         const recentMonths = trendsData.slice(-3);
         const avgRecentRevenue = recentMonths.reduce((sum, month) => sum + month.revenue, 0) / recentMonths.length;
         const avgRecentServices = recentMonths.reduce((sum, month) => sum + month.services_count, 0) / recentMonths.length;
         
         if (avgRecentRevenue > 0 && avgRecentServices > 0) {
           const revenuePerService = avgRecentRevenue / avgRecentServices;
           
           if (revenuePerService > 100) {
             insights.push({
               type: 'trend',
               title: 'High Revenue per Service',
               description: `Recent average revenue per service is ${formatCurrency(revenuePerService)}. Your premium services are performing well!`,
               priority: 'low',
               action_required: false,
               impact_score: 65,
               implementation_difficulty: 'easy',
               estimated_roi: 1500,
               timeframe: '1 month'
             });
           }
         }
       }
       
       // Insight 5: Operational Efficiency
       if (trendsData.length > 0 && revenueExpenseData.length > 0) {
         const totalRevenue = revenueExpenseData.reduce((sum, month) => sum + month.revenue, 0);
         const totalServices = trendsData.reduce((sum, month) => sum + month.services_count, 0);
         
         if (totalServices > 0) {
           const revenuePerService = totalRevenue / totalServices;
           const servicesPerDay = totalServices / (trendsData.length * 30); // Approximate days
           
           if (servicesPerDay < 3) {
             insights.push({
               type: 'opportunity',
               title: 'Increase Service Volume',
               description: `Average services per day is ${servicesPerDay.toFixed(1)}. Consider marketing campaigns and staff scheduling optimization to increase capacity utilization.`,
               priority: 'medium',
               action_required: false,
               impact_score: 70,
               implementation_difficulty: 'medium',
               estimated_roi: 3000,
               timeframe: '1 month'
             });
           }
         }
       }
       
       // Insight 6: Profitability Analysis
       if (revenueExpenseData.length > 0) {
         const totalRevenue = revenueExpenseData.reduce((sum, month) => sum + month.revenue, 0);
         const totalExpenses = revenueExpenseData.reduce((sum, month) => sum + month.expenses, 0);
         
         if (totalRevenue > 0 && totalExpenses > 0) {
           const profitMargin = ((totalRevenue - totalExpenses) / totalRevenue) * 100;
           
           if (profitMargin < 20) {
             insights.push({
               type: 'warning',
               title: 'Low Profit Margin',
               description: `Current profit margin is ${profitMargin.toFixed(1)}%, below the recommended 20%. Review pricing strategies and cost control measures.`,
               priority: 'high',
               action_required: true,
               impact_score: 95,
               implementation_difficulty: 'hard',
               estimated_roi: 8000,
               timeframe: '2 months'
             });
           } else if (profitMargin > 40) {
             insights.push({
               type: 'trend',
               title: 'Excellent Profitability',
               description: `Profit margin is ${profitMargin.toFixed(1)}%. Your business model is highly profitable!`,
               priority: 'low',
               action_required: false,
               impact_score: 55,
               implementation_difficulty: 'easy',
               estimated_roi: 1000,
               timeframe: '1 month'
             });
           }
         }
       }
       
       // If no insights generated, add a default insight
       if (insights.length === 0) {
         insights.push({
           type: 'recommendation',
           title: 'Data Analysis in Progress',
           description: 'Continue using the system to generate more business insights. More data will provide better recommendations.',
           priority: 'low',
           action_required: false,
           impact_score: 50,
           implementation_difficulty: 'easy',
           estimated_roi: 500,
           timeframe: '1 month'
         });
       }
       
       // Sort insights by priority and impact score
       insights.sort((a, b) => {
         const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
         const aPriority = priorityOrder[a.priority];
         const bPriority = priorityOrder[b.priority];
         
         if (aPriority !== bPriority) {
           return bPriority - aPriority;
         }
         return b.impact_score - a.impact_score;
       });
       
       console.log("Generated", insights.length, "business insights");
       setRealBusinessInsights(insights);
       
     } catch (error) {
       console.error("Error generating business insights:", error);
       toast({
         title: "Error",
         description: "Failed to generate business insights. Please try again.",
         variant: "destructive",
       });
       
       // Set empty array on error
       setRealBusinessInsights([]);
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
              <div className="flex items-center justify-between">
                <div>
              <CardTitle>Revenue vs Expenses Trend</CardTitle>
              <CardDescription>
                    Monthly comparison of revenue and expenses for {selectedPeriod === 'current_month' ? 'Current Month' : selectedPeriod === 'last_3_months' ? 'Last 3 Months' : selectedPeriod === 'last_6_months' ? 'Last 6 Months' : selectedPeriod === 'last_12_months' ? 'Last 12 Months' : `Full Year ${selectedYear}`}
              </CardDescription>
                </div>
                <Button onClick={fetchRevenueExpenseData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Chart
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {revenueExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={revenueExpenseData}>
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
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                  <BarChart3 className="h-16 w-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No Revenue vs Expense Data Available</p>
                  <p className="text-sm text-center">
                    No financial data found for the selected period.<br />
                    Try adjusting the period selection or refresh the data.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profit Trend Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
              <CardTitle>Profit Trend</CardTitle>
              <CardDescription>
                    Monthly profit performance for {selectedPeriod === 'current_month' ? 'Current Month' : selectedPeriod === 'last_3_months' ? 'Last 3 Months' : selectedPeriod === 'last_6_months' ? 'Last 6 Months' : selectedPeriod === 'last_12_months' ? 'Last 12 Months' : `Full Year ${selectedYear}`}
              </CardDescription>
                </div>
                <Button onClick={fetchRevenueExpenseData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Chart
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {revenueExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={revenueExpenseData}>
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
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                  <BarChart3 className="h-16 w-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No Profit Data Available</p>
                  <p className="text-sm text-center">
                    No profit data found for the selected period.<br />
                    Try adjusting the period selection or refresh the data.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {/* Customer Growth Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
              <CardTitle>Customer Growth & Retention</CardTitle>
              <CardDescription>
                    New vs returning customers and growth trends for {selectedPeriod === 'current_month' ? 'Current Month' : selectedPeriod === 'last_3_months' ? 'Last 3 Months' : selectedPeriod === 'last_6_months' ? 'Last 6 Months' : selectedPeriod === 'last_12_months' ? 'Last 12 Months' : `Full Year ${selectedYear}`}
              </CardDescription>
                </div>
                <Button onClick={fetchTrendsData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Trends
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {trendsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="new_customers" fill="#10b981" name="New Customers" />
                  <Bar dataKey="returning_customers" fill="#3b82f6" name="Returning Customers" />
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                  <BarChart3 className="h-16 w-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No Customer Trends Data Available</p>
                  <p className="text-sm text-center">
                    No customer data found for the selected period.<br />
                    Try adjusting the period selection or refresh the data.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Volume Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
              <CardTitle>Service Volume Trends</CardTitle>
              <CardDescription>
                    Monthly service count and average ticket size for {selectedPeriod === 'current_month' ? 'Current Month' : selectedPeriod === 'last_3_months' ? 'Last 3 Months' : selectedPeriod === 'last_6_months' ? 'Last 6 Months' : selectedPeriod === 'last_12_months' ? 'Last 12 Months' : `Full Year ${selectedYear}`}
              </CardDescription>
                </div>
                <Button onClick={fetchTrendsData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Trends
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {trendsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendsData}>
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
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                  <BarChart3 className="h-16 w-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No Service Volume Data Available</p>
                  <p className="text-sm text-center">
                    No service data found for the selected period.<br />
                    Try adjusting the period selection or refresh the data.
                  </p>
                </div>
              )}
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
              {/* Month/Year Selection Controls */}
              <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="period-select" className="text-sm font-medium">Period:</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current_month">Current Month</SelectItem>
                      <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                      <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                      <SelectItem value="last_12_months">Last 12 Months</SelectItem>
                      <SelectItem value="custom_range">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="year-select" className="text-sm font-medium">Year:</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                                                                   <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchMonthlyExpenses();
                      fetchExpenseCategories();
                      fetchProductPerformance();
                      fetchFinancialData();
                      fetchRevenueExpenseData();
                      fetchTrendsData();
                      generateBusinessInsights();
                    }}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh All
                  </Button>
                            </div>
              
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Monthly Breakdown</h3>
                    <div className="text-sm text-gray-600">
                      {selectedPeriod === 'current_month' && 'Current Month'}
                      {selectedPeriod === 'last_3_months' && 'Last 3 Months'}
                      {selectedPeriod === 'last_6_months' && 'Last 6 Months'}
                      {selectedPeriod === 'last_12_months' && 'Last 12 Months'}
                      {selectedPeriod === 'custom_range' && `Full Year ${selectedYear}`}
                    </div>
                  </div>
                  
                  {/* Period Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-red-600 font-medium">Total Expenses</p>
                          <p className="text-2xl font-bold text-red-700">
                            {formatCurrency(monthlyExpensesData.reduce((sum, month) => sum + month.totalExpenses, 0))}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-red-500" />
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Total Transactions</p>
                          <p className="text-2xl font-bold text-blue-700">
                            {monthlyExpensesData.reduce((sum, month) => sum + month.expenseCount, 0)}
                          </p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-blue-500" />
                      </div>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600 font-medium">Average per Month</p>
                          <p className="text-2xl font-bold text-green-700">
                            {monthlyExpensesData.length > 0 
                              ? formatCurrency(monthlyExpensesData.reduce((sum, month) => sum + month.totalExpenses, 0) / monthlyExpensesData.length)
                              : 'N/A'
                            }
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-500" />
                      </div>
                    </div>
                  </div>
                  
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
                        {monthlyExpensesData.length > 0 ? (
                          monthlyExpensesData.map((monthData, index) => (
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
                                          : 'N/A'
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
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                <DollarSign className="h-8 w-8 text-gray-300" />
                                <p>No expenses found for the selected period</p>
                                <p className="text-sm">Try adjusting the period or year selection</p>
                              </div>
                            </td>
                          </tr>
                        )}
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
               <div className="flex items-center justify-between">
                 <div>
              <CardTitle>Top Products Performance</CardTitle>
              <CardDescription>
                     Best-selling inventory items and their revenue contribution for {selectedPeriod === 'current_month' ? 'Current Month' : selectedPeriod === 'last_3_months' ? 'Last 3 Months' : selectedPeriod === 'last_6_months' ? 'Last 6 Months' : selectedPeriod === 'last_12_months' ? 'Last 12 Months' : `Full Year ${selectedYear}`}. Data is fetched from your completed services.
              </CardDescription>
                 </div>
                                    <Button onClick={fetchProductPerformance} variant="outline" size="sm">
                     <RefreshCw className="h-4 w-4 mr-2" />
                     Refresh Inventory
                   </Button>
               </div>
            </CardHeader>
            <CardContent>
                             {topProducts.length > 0 ? (
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
               ) : (
                                    <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                     <BarChart3 className="h-16 w-16 mb-4 text-gray-300" />
                     <p className="text-lg font-medium mb-2">No Inventory Data Available</p>
                     <p className="text-sm text-center">
                       No inventory sales data found for the selected period.<br />
                       Try adjusting the period selection or refresh the data.
                     </p>
                   </div>
               )}
            </CardContent>
          </Card>

          {/* Product Performance Table */}
          <Card>
            <CardHeader>
                 <CardTitle>Inventory Performance Details</CardTitle>
              <CardDescription>
                   Comprehensive breakdown of inventory item performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                       <th className="text-left p-2">Inventory Item</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Quantity Sold</th>
                      <th className="text-left p-2">Revenue</th>
                      <th className="text-left p-2">Profit Margin</th>
                      <th className="text-left p-2">Stock Level</th>
                      <th className="text-left p-2">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                     {topProducts.length > 0 ? (
                       topProducts.map((product) => (
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
                       ))
                     ) : (
                                                <tr>
                           <td colSpan={7} className="text-center py-8 text-gray-500">
                             <div className="flex flex-col items-center gap-2">
                               <BarChart3 className="h-8 w-8 text-gray-300" />
                               <p>No inventory performance data available</p>
                               <p className="text-sm">Try adjusting the period selection or refresh the data</p>
                             </div>
                           </td>
                         </tr>
                     )}
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

             {/* Top Inventory Performance */}
      <Card>
        <CardHeader>
           <CardTitle>Top Inventory Performance</CardTitle>
          <CardDescription>
             Best-selling inventory items and their revenue contribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                       <th className="text-left p-2">Inventory Item</th>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Business Intelligence & Insights</CardTitle>
              <CardDescription>
                AI-powered recommendations and business insights based on your data for {selectedPeriod === 'current_month' ? 'Current Month' : selectedPeriod === 'last_3_months' ? 'Last 3 Months' : selectedPeriod === 'last_6_months' ? 'Last 6 Months' : selectedPeriod === 'last_12_months' ? 'Last 12 Months' : `Full Year ${selectedYear}`}
              </CardDescription>
            </div>
            <Button onClick={generateBusinessInsights} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Insights
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {realBusinessInsights.length > 0 ? (
            <div className="space-y-4">
              {realBusinessInsights.map((insight, index) => (
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
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                        <span>Impact: {insight.impact_score}/100</span>
                        <span>ROI: {formatCurrency(insight.estimated_roi)}</span>
                        <span>Timeframe: {insight.timeframe}</span>
                        <span className="capitalize">Difficulty: {insight.implementation_difficulty}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <BarChart3 className="h-16 w-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No Business Insights Available</p>
              <p className="text-sm text-center">
                No insights generated for the selected period.<br />
                Try adjusting the period selection or refresh the insights.
              </p>
            </div>
          )}
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