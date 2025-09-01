import { useState, useEffect } from "react";
import { Package, Calendar, DollarSign, TrendingUp, User, Receipt, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";

interface CustomerProductUsage {
  id: string;
  customer_id: string;
  service_id: string;
  inventory_item_id: string;
  quantity_used: number;
  unit_price: number;
  total_cost: number;
  used_at: string;
  created_at: string;
  services: {
    service_name: string;
    service_category: string;
    service_price: number;
    date_time: string;
  };
  inventory_items: {
    name: string;
    category_id: string | null;
  };
}

interface CustomerProductHistoryProps {
  customerId: string;
  customerName: string;
}

export function CustomerProductHistory({ customerId, customerName }: CustomerProductHistoryProps) {
  const [productUsage, setProductUsage] = useState<CustomerProductUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("history");

  useEffect(() => {
    fetchCustomerProductHistory();

    // Set up real-time subscriptions for automatic updates
    const customerProductUsageSubscription = supabase
      .channel(`customer_product_usage_${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_product_usage',
          filter: `customer_id=eq.${customerId}`
        },
        (payload) => {
          console.log('Customer product usage changed:', payload);
          // Refresh customer product history when changes occur
          fetchCustomerProductHistory();
        }
      )
      .subscribe();

    const servicesSubscription = supabase
      .channel(`services_customer_${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services',
          filter: `customer_id=eq.${customerId}`
        },
        (payload) => {
          console.log('Customer services changed:', payload);
          // Refresh customer product history when services change
          fetchCustomerProductHistory();
        }
      )
      .subscribe();

    const serviceProductsSubscription = supabase
      .channel(`service_products_customer_${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_products'
        },
        (payload) => {
          console.log('Service products changed (customer):', payload);
          // Refresh customer product history when service products change
          fetchCustomerProductHistory();
        }
      )
      .subscribe();

    // Listen for custom events from other pages that indicate inventory data changes
    const handleInventoryDataChanged = (event: CustomEvent) => {
      console.log('Customer product history - inventory data change detected:', event.detail);
      // Refresh customer product history when services are updated
      fetchCustomerProductHistory();
    };

    window.addEventListener('inventory-data-changed', handleInventoryDataChanged as EventListener);

    // Cleanup subscriptions and event listeners on unmount
    return () => {
      customerProductUsageSubscription.unsubscribe();
      servicesSubscription.unsubscribe();
      serviceProductsSubscription.unsubscribe();
      window.removeEventListener('inventory-data-changed', handleInventoryDataChanged as EventListener);
    };
  }, [customerId]);

  const fetchCustomerProductHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('customer_product_usage')
        .select(`
          *,
          services(service_name, service_category, service_price, date_time),
          inventory_items(name, category_id)
        `)
        .eq('customer_id', customerId)
        .order('used_at', { ascending: false });

      if (dbError) throw dbError;

      setProductUsage(data || []);
    } catch (err) {
      console.error('Error fetching customer product history:', err);
      setError('Failed to load customer product history');
    } finally {
      setIsLoading(false);
    }
  };

  const totalProductsUsed = productUsage.length;
  const totalCost = productUsage.reduce((sum, usage) => sum + usage.total_cost, 0);
  const uniqueProducts = new Set(productUsage.map(usage => usage.inventory_item_id)).size;
  const totalServices = new Set(productUsage.map(usage => usage.service_id)).size;

  const getServiceCategoryBadge = (category: string) => {
    const categoryColors: { [key: string]: string } = {
      'haircut': 'bg-blue-100 text-blue-800 border-blue-200',
      'coloring': 'bg-pink-100 text-pink-800 border-pink-200',
      'styling': 'bg-purple-100 text-purple-800 border-purple-200',
      'treatment': 'bg-green-100 text-green-800 border-green-200',
      'extensions': 'bg-orange-100 text-orange-800 border-orange-200',
      'consultation': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    
    const colorClass = categoryColors[category.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
    return <Badge className={`${colorClass} hover:opacity-80`}>{category}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProductUsageByMonth = () => {
    const monthlyUsage: { [key: string]: { count: number; cost: number } } = {};
    
    productUsage.forEach(usage => {
      const month = new Date(usage.used_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!monthlyUsage[month]) {
        monthlyUsage[month] = { count: 0, cost: 0 };
      }
      monthlyUsage[month].count += usage.quantity_used;
      monthlyUsage[month].cost += usage.total_cost;
    });

    return Object.entries(monthlyUsage)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
  };

  const getTopProducts = () => {
    const productStats: { [key: string]: { name: string; quantity: number; cost: number } } = {};
    
    productUsage.forEach(usage => {
      const itemName = usage.inventory_items.name;
      if (!productStats[itemName]) {
        productStats[itemName] = { name: itemName, quantity: 0, cost: 0 };
      }
      productStats[itemName].quantity += usage.quantity_used;
      productStats[itemName].cost += usage.total_cost;
    });

    return Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-lg border-red-200">
        <CardHeader className="bg-red-50 border-b border-red-200">
          <CardTitle className="text-red-800">Error</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={fetchCustomerProductHistory} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <User className="h-5 w-5" />
              {customerName}'s Product History
            </CardTitle>
            <CardDescription className="text-blue-600">
              Track all products used by this customer across services
            </CardDescription>
          </div>
          <Button 
            onClick={() => {
              fetchCustomerProductHistory();
              // You can add a toast notification here if you have access to useToast
            }}
            variant="outline"
            size="sm"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
            >
              <Receipt className="mr-2 h-4 w-4" />
              Usage History
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
            >
              <Package className="mr-2 h-4 w-4" />
              Product Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-blue-800">{totalProductsUsed}</div>
                    <div className="text-sm text-blue-600">Total Items Used</div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-800">{formatCurrency(totalCost)}</div>
                    <div className="text-sm text-green-600">Total Product Cost</div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold text-purple-800">{uniqueProducts}</div>
                    <div className="text-sm text-purple-600">Unique Products</div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold text-orange-800">{totalServices}</div>
                    <div className="text-sm text-orange-600">Services Used</div>
                  </div>
                </div>
              </div>
            </div>

            {productUsage.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No product usage history found for this customer</p>
                <p className="text-sm">Products will appear here once they're used in services</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Monthly Usage Chart */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Monthly Product Usage</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {getProductUsageByMonth().map(([month, stats]) => (
                      <div key={month} className="p-3 bg-gray-50 rounded-lg border">
                        <div className="text-sm font-medium text-gray-600">{month}</div>
                        <div className="text-lg font-bold text-gray-900">{stats.count} items</div>
                        <div className="text-sm text-gray-500">{formatCurrency(stats.cost)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Products */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Most Used Products</h3>
                  <div className="space-y-2">
                    {getTopProducts().map((product, index) => (
                      <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{product.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{product.quantity} units</div>
                          <div className="text-sm text-gray-500">{formatCurrency(product.cost)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {productUsage.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No product usage history found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Service</TableHead>
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="font-semibold text-center">Quantity</TableHead>
                    <TableHead className="font-semibold text-center">Unit Price</TableHead>
                    <TableHead className="font-semibold text-center">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productUsage.map((usage) => (
                    <TableRow key={usage.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">{formatDate(usage.used_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{usage.services.service_name}</div>
                          {getServiceCategoryBadge(usage.services.service_category)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{usage.inventory_items.name}</TableCell>
                      <TableCell className="text-center font-semibold">{usage.quantity_used}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <DollarSign className="h-3 w-3 text-emerald-500" />
                          <span className="text-sm">{formatCurrency(usage.unit_price)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <DollarSign className="h-4 w-4 text-emerald-500" />
                          <span className="font-semibold text-emerald-700">{formatCurrency(usage.total_cost)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            {productUsage.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No analytics available</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Product Category Breakdown */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Product Category Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(
                      productUsage.reduce((acc, usage) => {
                        const category = usage.inventory_items.category_id || 'Uncategorized';
                        if (!acc[category]) acc[category] = { count: 0, cost: 0 };
                        acc[category].count += usage.quantity_used;
                        acc[category].cost += usage.total_cost;
                        return acc;
                      }, {} as { [key: string]: { count: number; cost: number } })
                    ).map(([category, stats]) => (
                      <div key={category} className="p-4 bg-gray-50 rounded-lg border">
                        <div className="font-medium text-gray-900">{category}</div>
                        <div className="text-2xl font-bold text-blue-600">{stats.count} units</div>
                        <div className="text-sm text-gray-500">{formatCurrency(stats.cost)} total cost</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Usage Trends */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Usage Trends</h3>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-blue-800 text-sm">
                      <strong>Insight:</strong> This customer has used {uniqueProducts} different products 
                      across {totalServices} services, with a total product cost of {formatCurrency(totalCost)}.
                      {totalProductsUsed > 10 && ' This indicates regular product usage.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
