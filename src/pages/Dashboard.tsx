import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, Package, AlertTriangle, TrendingUp, Calendar } from "lucide-react";
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
          message: `Stock ${transaction.transaction_type === 'in' ? 'added' : 'removed'}: ${transaction.inventory_items?.name || 'Unknown item'}`,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.full_name}! Here's what's happening at your salon.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.totalCustomers}
            </div>
            <p className="text-xs text-muted-foreground">
              Active customer profiles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.totalWorkers}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered staff members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {isLoading ? "..." : stats.lowStockItems}
            </div>
            <p className="text-xs text-muted-foreground">
              Need immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.unreadAlerts}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.criticalAlerts} critical alerts
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest updates from your salon</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : stats.recentActivities.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <p className="text-sm">{activity.message}</p>
                    <Badge variant="secondary">{activity.time}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No recent activities</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Value</CardTitle>
            <CardDescription>Total stock value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : `$${stats.totalInventoryValue.toFixed(2)}`}
                </div>
                <p className="text-xs text-muted-foreground">Current stock value</p>
              </div>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start" 
                  asChild
                >
                  <a href="/customers">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Customers
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  asChild
                >
                  <a href="/inventory">
                    <Package className="mr-2 h-4 w-4" />
                    Check Inventory
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  asChild
                >
                  <a href="/alerts">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    View Alerts
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}