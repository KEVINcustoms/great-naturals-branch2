import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, Package, AlertTriangle, TrendingUp, Calendar, Activity, DollarSign, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalCustomers: number;
  totalWorkers: number;
  lowStockItems: number;
  unreadAlerts: number;
  totalInventoryValue: number;
  criticalAlerts: number;
  recentActivities: Array<{
    id: string;
    type: string;
    message: string;
    time: string;
  }>;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalWorkers: 0,
    lowStockItems: 0,
    unreadAlerts: 0,
    totalInventoryValue: 0,
    criticalAlerts: 0,
    recentActivities: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    
    // Set up real-time subscription for updates
    const subscription = supabase
      .channel('dashboard_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'customers' 
      }, () => fetchDashboardStats())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'workers' 
      }, () => fetchDashboardStats())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'inventory_items' 
      }, () => fetchDashboardStats())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'alerts' 
      }, () => fetchDashboardStats())
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch all stats in parallel
      const [
        { data: customers, error: customersError },
        { data: workers, error: workersError },
        { data: inventoryItems, error: inventoryError },
        { data: alerts, error: alertsError },
        { data: recentCustomers, error: recentCustomersError },
        { data: recentTransactions, error: recentTransactionsError }
      ] = await Promise.all([
        supabase.from('customers').select('id'),
        supabase.from('workers').select('id'),
        supabase.from('inventory_items').select('current_stock, min_stock_level, unit_price'),
        supabase.from('alerts').select('id, severity, is_read'),
        supabase.from('customers').select('name, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('inventory_transactions').select(`
          transaction_type,
          quantity,
          transaction_date,
          inventory_items(name)
        `).order('transaction_date', { ascending: false }).limit(2)
      ]);

      if (customersError || workersError || inventoryError || alertsError) {
        throw new Error('Failed to fetch dashboard data');
      }

      const lowStockItems = inventoryItems?.filter(item => 
        item.current_stock <= item.min_stock_level
      ) || [];

      const unreadAlerts = alerts?.filter(alert => !alert.is_read) || [];
      const criticalAlerts = alerts?.filter(alert => 
        alert.severity === 'critical' && !alert.is_read
      ) || [];

      const totalInventoryValue = inventoryItems?.reduce((total, item) => 
        total + (item.current_stock * item.unit_price), 0
      ) || 0;

      // Build recent activities
      const activities: Array<{
        id: string;
        type: string;
        message: string;
        time: string;
      }> = [];

      // Add recent customers
      recentCustomers?.forEach((customer, index) => {
        activities.push({
          id: `customer-${index}`,
          type: 'customer',
          message: `New customer added: ${customer.name}`,
          time: formatTimeAgo(customer.created_at)
        });
      });

      // Add recent transactions
      recentTransactions?.forEach((transaction, index) => {
        activities.push({
          id: `transaction-${index}`,
          type: 'inventory',
          message: `Stock ${transaction.transaction_type === 'stock_in' ? 'added' : 'removed'}: ${transaction.inventory_items?.name || 'Unknown item'}`,
          time: formatTimeAgo(transaction.transaction_date)
        });
      });

      // Sort activities by time (most recent first)
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setStats({
        totalCustomers: customers?.length || 0,
        totalWorkers: workers?.length || 0,
        lowStockItems: lowStockItems.length,
        unreadAlerts: unreadAlerts.length,
        totalInventoryValue,
        criticalAlerts: criticalAlerts.length,
        recentActivities: activities.slice(0, 5)
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return diffInMinutes === 0 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'inventory':
        return <Package className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Professional Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">System Updates & Maintenance</h3>
            <p className="text-sm text-blue-700 leading-relaxed">
              This system is actively maintained and enhanced by <strong>Devzora Technologies</strong>. 
              Future updates will include new features, security improvements, and performance optimizations. 
              For technical support or feature requests, please contact our development team.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to your salon management dashboard</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Customers</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {isLoading ? "..." : stats.totalCustomers}
            </div>
            <p className="text-xs text-blue-600 font-medium">
              Active customer profiles
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800">Active Workers</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900">
              {isLoading ? "..." : stats.totalWorkers}
            </div>
            <p className="text-xs text-emerald-600 font-medium">
              Registered staff members
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">Low Stock Items</CardTitle>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Package className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900">
              {isLoading ? "..." : stats.lowStockItems}
            </div>
            <p className="text-xs text-amber-600 font-medium">
              Need immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-pink-50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Active Alerts</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">
              {isLoading ? "..." : stats.unreadAlerts}
            </div>
            <p className="text-xs text-red-600 font-medium">
              {stats.criticalAlerts} critical alerts
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
            <CardTitle className="text-indigo-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Recent Activities
            </CardTitle>
            <CardDescription className="text-indigo-600">
              Latest updates and activities from your salon
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 bg-indigo-200 rounded-full"></div>
                      <div className="h-4 bg-indigo-200 rounded w-3/4"></div>
                    </div>
                    <div className="h-6 bg-indigo-200 rounded-full w-20"></div>
                  </div>
                ))}
              </div>
            ) : stats.recentActivities.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-100 hover:bg-indigo-50 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      {getActivityIcon(activity.type)}
                      <p className="text-sm text-gray-700 font-medium">{activity.message}</p>
                    </div>
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200">
                      {activity.time}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto mb-4 text-indigo-300" />
                <p className="text-indigo-600 font-medium">No recent activities</p>
                <p className="text-sm text-indigo-500">Activities will appear here as they happen</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/50">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <CardTitle className="text-emerald-800 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Inventory Value
            </CardTitle>
            <CardDescription className="text-emerald-600">
              Total stock value and quick actions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
                              <div className="text-center p-4 bg-emerald-100 rounded-lg">
                  <div className="text-3xl font-bold text-emerald-900">
                    {isLoading ? "..." : formatCurrency(stats.totalInventoryValue)}
                  </div>
                  <p className="text-sm text-emerald-700 font-medium">Current stock value</p>
                </div>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300" 
                  asChild
                >
                  <a href="/customers">
                    <Users className="mr-2 h-4 w-4 text-emerald-600" />
                    Manage Customers
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                  asChild
                >
                  <a href="/inventory">
                    <Package className="mr-2 h-4 w-4 text-emerald-600" />
                    Check Inventory
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                  asChild
                >
                  <a href="/alerts">
                    <AlertTriangle className="mr-2 h-4 w-4 text-emerald-600" />
                    View Alerts
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-md bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
                              <div>
                  <p className="text-sm font-medium text-purple-700">Today's Revenue</p>
                  <p className="text-2xl font-bold text-purple-900">{formatCurrency(0)}</p>
                </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Appointments</p>
                <p className="text-2xl font-bold text-blue-900">0</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">System Status</p>
                <p className="text-2xl font-bold text-green-900">Online</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}