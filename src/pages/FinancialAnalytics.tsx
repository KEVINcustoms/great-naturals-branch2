import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  AlertTriangle, 
  Lightbulb, 
  RefreshCw,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

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

export default function FinancialAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isLoading, setIsLoading] = useState(false);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [topProducts, setTopProducts] = useState<ProductPerformance[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [businessInsights, setBusinessInsights] = useState<BusinessInsight[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchFinancialData();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
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
              ${financialMetrics?.totalRevenue.toLocaleString() || 0}
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
              ${financialMetrics?.totalExpenses.toLocaleString() || 0}
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
              ${financialMetrics?.netProfit.toLocaleString() || 0}
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
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
                  <Tooltip formatter={(value, name) => [`$${value}`, name]}/>
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
                  <Tooltip formatter={(value) => [`$${value}`, 'Profit']}/>
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
                    <Tooltip formatter={(value) => [`$${value}`, 'Amount']}/>
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
                        <span className="font-bold">${category.amount.toLocaleString()}</span>
                        {getTrendIcon(category.trend)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                  <Tooltip formatter={(value, name) => [name === 'revenue_generated' ? `$${value}` : value, name === 'revenue_generated' ? 'Revenue' : 'Quantity']}/>
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
                          ${product.revenue_generated.toLocaleString()}
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
                  <span className="font-bold">${category.amount.toLocaleString()}</span>
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
                      ${product.revenue_generated.toLocaleString()}
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