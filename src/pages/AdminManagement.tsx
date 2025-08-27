import { useState, useEffect } from "react";
import { 
  Users, 
  Shield, 
  CheckCircle,
  AlertTriangle,
  Ban,
  Clock,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  Scissors,
  Palette
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/utils/permissions";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at?: string;
  is_active: boolean;
  access_level: 'full' | 'restricted' | 'banned';
}

interface UserService {
  id: string;
  service_name: string;
  service_category: string;
  service_price: number;
  status: string;
  date_time: string;
  customer_name: string;
  notes?: string;
  created_at: string;
}

interface UserCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  hair_type?: string;
  style_preference?: string;
  created_at: string;
}

interface UserStats {
  total_services: number;
  total_customers: number;
  total_revenue: number;
  last_service_date?: string;
  average_service_price: number;
}

export default function AdminManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userServices, setUserServices] = useState<UserService[]>([]);
  const [userCustomers, setUserCustomers] = useState<UserCustomer[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isServicesLoading, setIsServicesLoading] = useState(false);
  const [isCustomersLoading, setIsCustomersLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [accessAction, setAccessAction] = useState<'restrict' | 'ban' | 'activate'>('activate');
  const [accessReason, setAccessReason] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin(profile)) {
      fetchUsers();
    }
  }, [profile]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Add default access levels for existing users
      const usersWithAccess = (data || []).map(user => ({
        ...user,
        is_active: true, // Default to active
        access_level: 'full' as const // Default to full access
      }));
      
      setUsers(usersWithAccess);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserServices = async (userId: string) => {
    setIsServicesLoading(true);
    try {
      const { data, error } = await supabase
        .from("services")
        .select(`
          id,
          service_name,
          service_category,
          service_price,
          status,
          date_time,
          notes,
          created_at,
          customer_id
        `)
        .eq("created_by", userId)
        .order("date_time", { ascending: false });

      if (error) throw error;
      
      // Get customer names separately
      const customerIds = [...new Set((data || []).map(service => service.customer_id))];
      const { data: customers, error: customerError } = await supabase
        .from("customers")
        .select("id, name")
        .in("id", customerIds);

      if (customerError) throw customerError;

      const customerMap = new Map(customers?.map(c => [c.id, c.name]) || []);
      
      const servicesWithCustomerNames = (data || []).map(service => ({
        ...service,
        customer_name: customerMap.get(service.customer_id) || 'Unknown Customer'
      }));
      
      setUserServices(servicesWithCustomerNames);
    } catch (error) {
      console.error("Error fetching user services:", error);
      toast({
        title: "Error",
        description: "Failed to load user services",
        variant: "destructive",
      });
    } finally {
      setIsServicesLoading(false);
    }
  };

  const fetchUserCustomers = async (userId: string) => {
    setIsCustomersLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserCustomers(data || []);
    } catch (error) {
      console.error("Error fetching user customers:", error);
      toast({
        title: "Error",
        description: "Failed to load user customers",
        variant: "destructive",
      });
    } finally {
      setIsCustomersLoading(false);
    }
  };

  const fetchUserStats = async (userId: string) => {
    setIsStatsLoading(true);
    try {
      // Get total services
      const { data: services, error: servicesError } = await supabase
        .from("services")
        .select("service_price, date_time")
        .eq("created_by", userId);

      if (servicesError) throw servicesError;

      // Get total customers
      const { data: customers, error: customersError } = await supabase
        .from("customers")
        .select("id")
        .eq("created_by", userId);

      if (customersError) throw customersError;

      const totalServices = services?.length || 0;
      const totalCustomers = customers?.length || 0;
      const totalRevenue = services?.reduce((sum, service) => sum + (service.service_price || 0), 0) || 0;
      const averageServicePrice = totalServices > 0 ? totalRevenue / totalServices : 0;
      const lastServiceDate = services && services.length > 0 
        ? services.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())[0]?.date_time
        : undefined;

      setUserStats({
        total_services: totalServices,
        total_customers: totalCustomers,
        total_revenue: totalRevenue,
        last_service_date: lastServiceDate,
        average_service_price: averageServicePrice
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      toast({
        title: "Error",
        description: "Failed to load user statistics",
        variant: "destructive",
      });
    } finally {
      setIsStatsLoading(false);
    }
  };

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
    fetchUserServices(user.user_id);
    fetchUserCustomers(user.user_id);
    fetchUserStats(user.user_id);
    setActiveTab("overview");
  };

  const handleAccessChange = async () => {
    if (!selectedUser) return;

    try {
              // Map access actions to the correct values
        const accessLevelMap = {
          'activate': 'full',
          'restrict': 'restricted',
          'ban': 'banned'
        } as const;

        const newAccessLevel = accessLevelMap[accessAction];
        const newIsActive = accessAction === 'activate';

        const { error } = await supabase
          .from("profiles")
          .update({
            access_level: newAccessLevel,
            is_active: newIsActive,
            updated_at: new Date().toISOString()
          })
          .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User access ${accessAction === 'activate' ? 'activated' : accessAction} successfully`,
      });

      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id 
            ? { 
                ...user, 
                access_level: newAccessLevel,
                is_active: newIsActive
              }
            : user
        )
      );

      setSelectedUser(prev => prev ? {
        ...prev,
        access_level: newAccessLevel,
        is_active: newIsActive
      } : null);

      setIsAccessDialogOpen(false);
      setAccessReason("");
    } catch (error) {
      console.error("Error updating user access:", error);
      toast({
        title: "Error",
        description: "Failed to update user access",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && user.is_active) ||
                         (statusFilter === "inactive" && !user.is_active) ||
                         (statusFilter === "banned" && user.access_level === "banned");
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'full': return 'bg-green-100 text-green-800';
      case 'restricted': return 'bg-yellow-100 text-yellow-800';
      case 'banned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'full': return <CheckCircle className="h-4 w-4" />;
      case 'restricted': return <AlertTriangle className="h-4 w-4" />;
      case 'banned': return <Ban className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Check if user is admin
  if (!isAdmin(profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl text-red-900">Admin Access Required</CardTitle>
            <CardDescription className="text-red-700">
              This section is only available to administrators.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-full">
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
              This system is actively maintained and enhanced by <strong>Our Team</strong>. 
              Future updates will include new features, security improvements, and performance optimizations. 
              For technical support or feature requests, please contact our development team.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-gray-600">Manage users, monitor activities, and control access</p>
          {/* Enhanced Features Notice */}
          <div className="mt-2 inline-flex items-center gap-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-full px-3 py-1">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-purple-700">
              Enhanced features coming in future updates from Our Team
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <span className="text-sm text-gray-500">Administrator Panel</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 lg:gap-6">
        {/* Users List */}
        <div className="xl:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users ({filteredUsers.length})
              </CardTitle>
              <CardDescription>
                All registered users in the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="space-y-3">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full flex-shrink-0 ${
                        user.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.role === 'admin' ? <Shield className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge className={getAccessLevelColor(user.access_level)}>
                          {getAccessLevelIcon(user.access_level)}
                          <span className="ml-1 text-xs">
                            {user.access_level === 'full' ? 'Active' : 
                             user.access_level === 'restricted' ? 'Restricted' : 'Banned'}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Details */}
        <div className="xl:col-span-3">
          {selectedUser ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2">
                      {selectedUser.role === 'admin' ? <Shield className="h-5 w-5 text-blue-600 flex-shrink-0" /> : <Users className="h-5 w-5 flex-shrink-0" />}
                      <span className="truncate">{selectedUser.full_name}</span>
                    </CardTitle>
                    <CardDescription className="truncate">
                      {selectedUser.email} • {selectedUser.role} • Member since {formatDate(selectedUser.created_at)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={getAccessLevelColor(selectedUser.access_level)}>
                      {getAccessLevelIcon(selectedUser.access_level)}
                      <span className="ml-1">
                        {selectedUser.access_level === 'full' ? 'Active' : 
                         selectedUser.access_level === 'restricted' ? 'Restricted' : 'Banned'}
                      </span>
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAccessDialogOpen(true)}
                    >
                      Manage Access
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
                    <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
                    <TabsTrigger value="services" className="text-xs md:text-sm">Services</TabsTrigger>
                    <TabsTrigger value="customers" className="text-xs md:text-sm">Customers</TabsTrigger>
                    <TabsTrigger value="activity" className="text-xs md:text-sm">Activity</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-4">
                    {isStatsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Loading statistics...</p>
                      </div>
                    ) : userStats ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Card>
                          <CardContent className="p-3 lg:p-4 text-center">
                            <div className="text-xl lg:text-2xl font-bold text-blue-600">{userStats.total_services}</div>
                            <p className="text-xs lg:text-sm text-gray-600">Total Services</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 lg:p-4 text-center">
                            <div className="text-xl lg:text-2xl font-bold text-green-600">{userStats.total_customers}</div>
                            <p className="text-xs lg:text-sm text-gray-600">Total Customers</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 lg:p-4 text-center">
                            <div className="text-xl lg:text-2xl font-bold text-purple-600">{formatCurrency(userStats.total_revenue)}</div>
                            <p className="text-xs lg:text-sm text-gray-600">Total Revenue</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 lg:p-4 text-center">
                            <div className="text-xl lg:text-2xl font-bold text-orange-600">{formatCurrency(userStats.average_service_price)}</div>
                            <p className="text-xs lg:text-sm text-gray-600">Avg. Service Price</p>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">No statistics available</div>
                    )}

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Recent Activity</h3>
                      {userStats?.last_service_date && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Last service: {formatDate(userStats.last_service_date)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>Account created: {formatDate(selectedUser.created_at)}</span>
                      </div>
                      {selectedUser.updated_at !== selectedUser.created_at && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>Last updated: {formatDate(selectedUser.updated_at)}</span>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Services Tab */}
                  <TabsContent value="services" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Services ({userServices.length})</h3>
                    </div>
                    
                    {isServicesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Loading services...</p>
                      </div>
                    ) : userServices.length > 0 ? (
                      <div className="border rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs sm:text-sm">Service</TableHead>
                              <TableHead className="text-xs sm:text-sm">Customer</TableHead>
                              <TableHead className="text-xs sm:text-sm">Price</TableHead>
                              <TableHead className="text-xs sm:text-sm">Status</TableHead>
                              <TableHead className="text-xs sm:text-sm">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userServices.map((service) => (
                              <TableRow key={service.id}>
                                <TableCell className="text-xs sm:text-sm">
                                  <div>
                                    <p className="font-medium">{service.service_name}</p>
                                    <p className="text-xs text-gray-500">{service.service_category}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">{service.customer_name}</TableCell>
                                <TableCell className="text-xs sm:text-sm">{formatCurrency(service.service_price)}</TableCell>
                                <TableCell>
                                  <Badge variant={service.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                    {service.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">{formatDate(service.date_time)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">No services found</div>
                    )}
                  </TabsContent>

                  {/* Customers Tab */}
                  <TabsContent value="customers" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Customers ({userCustomers.length})</h3>
                    </div>
                    
                    {isCustomersLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Loading customers...</p>
                      </div>
                    ) : userCustomers.length > 0 ? (
                      <div className="border rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs sm:text-sm">Name</TableHead>
                              <TableHead className="text-xs sm:text-sm">Contact</TableHead>
                              <TableHead className="text-xs sm:text-sm">Preferences</TableHead>
                              <TableHead className="text-xs sm:text-sm">Created</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userCustomers.map((customer) => (
                              <TableRow key={customer.id}>
                                <TableCell className="text-xs sm:text-sm">
                                  <div>
                                    <p className="font-medium">{customer.name}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">
                                  <div className="space-y-1">
                                    {customer.email && (
                                      <div className="flex items-center gap-1 text-sm">
                                        <Mail className="h-3 w-3" />
                                        {customer.email}
                                      </div>
                                    )}
                                    {customer.phone && (
                                      <div className="flex items-center gap-1 text-sm">
                                        <Phone className="h-3 w-3" />
                                        {customer.phone}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">
                                  <div className="space-y-1">
                                    {customer.hair_type && (
                                      <div className="flex items-center gap-1 text-sm">
                                        <Scissors className="h-3 w-3" />
                                        {customer.hair_type}
                                      </div>
                                    )}
                                    {customer.style_preference && (
                                      <div className="flex items-center gap-1 text-sm">
                                        <Palette className="h-3 w-3" />
                                        {customer.style_preference}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">{formatDate(customer.created_at)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">No customers found</div>
                    )}
                  </TabsContent>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="space-y-4">
                    <h3 className="text-lg font-semibold">Account Activity</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Account created</span>
                        </div>
                        <span className="text-sm text-gray-500">{formatDate(selectedUser.created_at)}</span>
                      </div>
                      
                      {selectedUser.updated_at !== selectedUser.created_at && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm">Profile updated</span>
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(selectedUser.updated_at)}</span>
                        </div>
                      )}

                      {selectedUser.access_level !== 'full' && (
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Ban className="h-4 w-4 text-red-600" />
                            <span className="text-sm">Access {selectedUser.access_level}</span>
                          </div>
                          <span className="text-sm text-gray-500">Recently</span>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a User</h3>
                <p className="text-gray-500">Choose a user from the list to view their details and manage their access.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Access Management Dialog */}
      <Dialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Access</DialogTitle>
            <DialogDescription>
              Control {selectedUser?.full_name}'s access to the system
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Future Updates Notice */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="p-1 bg-amber-100 rounded-full">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-amber-800 mb-1">Coming Soon - Enhanced Access Control</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Future updates from <strong>Our Team</strong> will include advanced user management features, 
                    detailed access logs, temporary restrictions, and automated compliance monitoring.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Action</label>
              <Select value={accessAction} onValueChange={(value: 'restrict' | 'ban' | 'activate') => setAccessAction(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activate">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Activate Full Access
                    </div>
                  </SelectItem>
                  <SelectItem value="restrict">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      Restrict Access
                    </div>
                  </SelectItem>
                  <SelectItem value="ban">
                    <div className="flex items-center gap-2">
                      <Ban className="h-4 w-4 text-red-600" />
                      Ban User
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {accessAction !== 'activate' && (
              <div>
                <label className="text-sm font-medium">Reason (Optional)</label>
                <Input
                  placeholder="Enter reason for restriction/ban..."
                  value={accessReason}
                  onChange={(e) => setAccessReason(e.target.value)}
                />
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Current Status:</strong> {selectedUser?.access_level === 'full' ? 'Active' : 
                  selectedUser?.access_level === 'restricted' ? 'Restricted' : 'Banned'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Action:</strong> {accessAction === 'activate' ? 'Grant full access' : 
                  accessAction === 'restrict' ? 'Restrict access' : 'Ban from system'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAccessDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAccessChange}
              variant={accessAction === 'activate' ? 'default' : accessAction === 'restrict' ? 'secondary' : 'destructive'}
            >
              {accessAction === 'activate' ? 'Activate Access' : 
               accessAction === 'restrict' ? 'Restrict Access' : 'Ban User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
