import { useState, useEffect } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Users, 
  BarChart3, 
  Download,
  RefreshCw,
  Filter,
  Search,
  Clock,
  UserCheck,
  Receipt
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";

interface Worker {
  id: string;
  name: string;
  role: string;
  payment_type: 'monthly' | 'commission';
  salary: number;
  commission_rate: number;
  total_earnings: number;
  current_month_earnings: number;
  services_performed: number;
  hire_date: string;
}

interface ServiceHistory {
  id: string;
  service_name: string;
  service_price: number;
  customer_name: string;
  commission_amount: number;
  service_date: string;
  status: string;
  service_commission_rate?: number;
  worker_commission_rate?: number;
}

interface DailyEarnings {
  date: string;
  earnings: number;
  services_count: number;
  services: ServiceHistory[];
}

export default function WorkerPayroll() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterPaymentType, setFilterPaymentType] = useState<string>("all");
  const [isWorkerDetailOpen, setIsWorkerDetailOpen] = useState(false);
  const [workerServiceHistory, setWorkerServiceHistory] = useState<ServiceHistory[]>([]);
  const [workerDailyEarnings, setWorkerDailyEarnings] = useState<DailyEarnings[]>([]);
  const [selectedWorkerDate, setSelectedWorkerDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isCommissionEditOpen, setIsCommissionEditOpen] = useState(false);
  const [editingCommissionWorker, setEditingCommissionWorker] = useState<Worker | null>(null);
  const [newCommissionRate, setNewCommissionRate] = useState<string>("");
  const [isServiceCommissionEditOpen, setIsServiceCommissionEditOpen] = useState(false);
  const [editingServiceCommission, setEditingServiceCommission] = useState<{serviceId: string, serviceName: string, currentRate: number} | null>(null);
  const [newServiceCommissionRate, setNewServiceCommissionRate] = useState<string>("");
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    if (selectedWorker) {
      fetchWorkerServiceHistory(selectedWorker.id);
    }
  }, [selectedWorker, selectedWorkerDate]);

  const fetchWorkers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .order("name");

      if (error) throw error;
      
      // Fetch real-time earnings data for each worker
      const workersWithEarnings = await Promise.all(
        (data || []).map(async (worker) => {
          if (worker.payment_type === 'commission') {
            const earnings = await calculateWorkerEarnings(worker.id);
            return {
              ...worker,
              total_earnings: earnings.totalEarnings,
              current_month_earnings: earnings.currentMonthEarnings,
              services_performed: earnings.servicesPerformed
            };
          } else {
            // For salary workers, still count services for tracking purposes
            const serviceCount = await getWorkerServiceCount(worker.id);
            return {
              ...worker,
              total_earnings: worker.salary || 0,
              current_month_earnings: worker.salary || 0,
              services_performed: serviceCount
            };
          }
        })
      );
      
      setWorkers(workersWithEarnings);
    } catch (error) {
      console.error("Error fetching workers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch workers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getWorkerServiceCount = async (workerId: string) => {
    try {
      const { data: services, error } = await supabase
        .from("services")
        .select("id")
        .eq("staff_member_id", workerId)
        .eq("status", "completed");

      if (error) throw error;
      return services?.length || 0;
    } catch (error) {
      console.error("Error getting worker service count:", error);
      return 0;
    }
  };

  const calculateWorkerEarnings = async (workerId: string) => {
    try {
      // Get all completed services for this worker
      const { data: services, error } = await supabase
        .from("services")
        .select(`
          id,
          service_name,
          service_price,
          created_at,
          status,
          customers (name)
        `)
        .eq("staff_member_id", workerId)
        .eq("status", "completed");

      if (error) throw error;

      if (!services || services.length === 0) {
        return { totalEarnings: 0, currentMonthEarnings: 0, servicesPerformed: 0 };
      }

      // Get worker commission rate
      const { data: worker } = await supabase
        .from("workers")
        .select("commission_rate")
        .eq("id", workerId)
        .single();

      const workerCommissionRate = worker?.commission_rate || 0;
      
      // Get commission rates for all services
      const serviceIds = services.map(s => s.id);
      const { data: serviceCommissionRates } = await supabase
        .from("services")
        .select("id, commission_rate")
        .in("id", serviceIds);
      
      const serviceCommissionMap = new Map(
        serviceCommissionRates?.map(s => [s.id, s.commission_rate]) || []
      );
      
      const totalEarnings = services.reduce((sum, service) => {
        const serviceCommissionRate = serviceCommissionMap.get(service.id) || workerCommissionRate;
        const commission = (service.service_price * serviceCommissionRate) / 100;
        return sum + commission;
      }, 0);

      // Calculate current month earnings
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const currentMonthEarnings = services.reduce((sum, service) => {
        const serviceDate = new Date(service.created_at);
        if (serviceDate.getMonth() === currentMonth && serviceDate.getFullYear() === currentYear) {
          const serviceCommissionRate = serviceCommissionMap.get(service.id) || workerCommissionRate;
          const commission = (service.service_price * serviceCommissionRate) / 100;
          return sum + commission;
        }
        return sum;
      }, 0);

      return {
        totalEarnings,
        currentMonthEarnings,
        servicesPerformed: services.length
      };
    } catch (error) {
      console.error("Error calculating worker earnings:", error);
      return { totalEarnings: 0, currentMonthEarnings: 0, servicesPerformed: 0 };
    }
  };

  const fetchWorkerServiceHistory = async (workerId: string) => {
    try {
      const { data: services, error } = await supabase
        .from("services")
        .select(`
          id,
          service_name,
          service_price,
          created_at,
          status,
          customers (name)
        `)
        .eq("staff_member_id", workerId)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!services) {
        setWorkerServiceHistory([]);
        setWorkerDailyEarnings([]);
        return;
      }

      // Get worker commission rate
      const { data: worker } = await supabase
        .from("workers")
        .select("commission_rate")
        .eq("id", workerId)
        .single();

      const workerCommissionRate = worker?.commission_rate || 0;

      // Get commission rates for all services
      const serviceIds = services.map(s => s.id);
      const { data: serviceCommissionRates } = await supabase
        .from("services")
        .select("id, commission_rate")
        .in("id", serviceIds);
      
      const serviceCommissionMap = new Map(
        serviceCommissionRates?.map(s => [s.id, s.commission_rate]) || []
      );

      // Transform services to include commission calculations
      const servicesWithCommission = services.map(service => {
        const serviceCommissionRate = serviceCommissionMap.get(service.id) || workerCommissionRate;
        return {
          id: service.id,
          service_name: service.service_name,
          service_price: service.service_price,
          customer_name: service.customers?.name || 'Unknown Customer',
          commission_amount: (service.service_price * serviceCommissionRate) / 100,
          service_date: service.created_at,
          status: service.status,
          service_commission_rate: serviceCommissionRate,
          worker_commission_rate: workerCommissionRate
        };
      });

      setWorkerServiceHistory(servicesWithCommission);

      // Group services by date for daily earnings
      const dailyEarningsMap = new Map<string, DailyEarnings>();
      
      servicesWithCommission.forEach(service => {
        const date = new Date(service.service_date).toISOString().slice(0, 10);
        
        if (dailyEarningsMap.has(date)) {
          const existing = dailyEarningsMap.get(date)!;
          existing.earnings += service.commission_amount;
          existing.services_count += 1;
          existing.services.push(service);
        } else {
          dailyEarningsMap.set(date, {
            date,
            earnings: service.commission_amount,
            services_count: 1,
            services: [service]
          });
        }
      });

      const dailyEarnings = Array.from(dailyEarningsMap.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setWorkerDailyEarnings(dailyEarnings);
    } catch (error) {
      console.error("Error fetching worker service history:", error);
      toast({
        title: "Error",
        description: "Failed to fetch worker service history",
        variant: "destructive",
      });
    }
  };

  const openWorkerDetail = async (worker: Worker) => {
    setSelectedWorker(worker);
    setSelectedWorkerDate(new Date().toISOString().slice(0, 10));
    setIsWorkerDetailOpen(true);
  };

  const openCommissionEdit = (worker: Worker) => {
    setEditingCommissionWorker(worker);
    setNewCommissionRate(worker.commission_rate.toString());
    setIsCommissionEditOpen(true);
  };

  const updateCommissionRate = async () => {
    if (!editingCommissionWorker || !newCommissionRate) return;
    
    try {
      const { error } = await supabase
        .from("workers")
        .update({ commission_rate: parseFloat(newCommissionRate) })
        .eq("id", editingCommissionWorker.id);

      if (error) throw error;

      // Update local state
      setWorkers(prev => prev.map(worker => 
        worker.id === editingCommissionWorker.id 
          ? { ...worker, commission_rate: parseFloat(newCommissionRate) }
          : worker
      ));

      // Refresh earnings for this worker
      if (editingCommissionWorker.payment_type === 'commission') {
        const earnings = await calculateWorkerEarnings(editingCommissionWorker.id);
        setWorkers(prev => prev.map(worker => 
          worker.id === editingCommissionWorker.id 
            ? { ...worker, total_earnings: earnings.totalEarnings, current_month_earnings: earnings.currentMonthEarnings }
            : worker
        ));
      }

      toast({
        title: "Success",
        description: `Commission rate updated to ${newCommissionRate}%`,
      });

      setIsCommissionEditOpen(false);
      setEditingCommissionWorker(null);
      setNewCommissionRate("");
    } catch (error) {
      console.error("Error updating commission rate:", error);
      toast({
        title: "Error",
        description: "Failed to update commission rate",
        variant: "destructive",
      });
    }
  };

  const openServiceCommissionEdit = (service: ServiceHistory) => {
    setEditingServiceCommission({
      serviceId: service.id,
      serviceName: service.service_name,
      currentRate: service.service_commission_rate || 0
    });
    setNewServiceCommissionRate(service.service_commission_rate?.toString() || "0");
    setIsServiceCommissionEditOpen(true);
  };

  const updateServiceCommissionRate = async () => {
    if (!editingServiceCommission || !newServiceCommissionRate) return;
    
    try {
      const { error } = await supabase
        .from("services")
        .update({ commission_rate: parseFloat(newServiceCommissionRate) })
        .eq("id", editingServiceCommission.serviceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Service commission rate updated to ${newServiceCommissionRate}%`,
      });

      // Refresh worker data to reflect new commission rates
      await fetchWorkers();
      if (selectedWorker) {
        await fetchWorkerServiceHistory(selectedWorker.id);
      }

      setIsServiceCommissionEditOpen(false);
      setEditingServiceCommission(null);
      setNewServiceCommissionRate("");
    } catch (error) {
      console.error("Error updating service commission rate:", error);
      toast({
        title: "Error",
        description: "Failed to update service commission rate",
        variant: "destructive",
      });
    }
  };

  const getPaymentTypeBadge = (paymentType: string) => {
    if (paymentType === 'commission') {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Commission Based</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Monthly Salary</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roleColors: { [key: string]: string } = {
      'stylist': 'bg-purple-100 text-purple-800',
      'barber': 'bg-blue-100 text-blue-800',
      'assistant': 'bg-orange-100 text-orange-800',
      'manager': 'bg-red-100 text-red-800',
      'receptionist': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge variant="secondary" className={roleColors[role] || 'bg-gray-100 text-gray-800'}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const calculateTotalDailyEarnings = () => {
    return workers
      .filter(worker => worker.payment_type === 'commission')
      .reduce((total, worker) => {
        // Calculate daily average from current month earnings
        return total + (worker.current_month_earnings / 30);
      }, 0);
  };

  const calculateTotalMonthlyEarnings = () => {
    return workers
      .filter(worker => worker.payment_type === 'commission')
      .reduce((total, worker) => total + worker.current_month_earnings, 0);
  };

  const calculateTotalSalary = () => {
    return workers
      .filter(worker => worker.payment_type === 'monthly')
      .reduce((total, worker) => total + worker.salary, 0);
  };

  const filteredWorkers = workers.filter(worker => {
    const matchesSearch = worker.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || worker.role === filterRole;
    const matchesPaymentType = filterPaymentType === "all" || worker.payment_type === filterPaymentType;
    
    return matchesSearch && matchesRole && matchesPaymentType;
  });

  const commissionWorkers = filteredWorkers.filter(w => w.payment_type === 'commission');
  const salaryWorkers = filteredWorkers.filter(w => w.payment_type === 'monthly');

  const exportPayrollData = () => {
    const data = workers.map(worker => ({
      Name: worker.name,
      Role: worker.role,
      'Payment Type': worker.payment_type,
      'Monthly Salary': worker.payment_type === 'monthly' ? worker.salary : 'N/A',
      'Commission Rate': worker.payment_type === 'commission' ? `${worker.commission_rate}%` : 'N/A',
      'Total Earnings': worker.total_earnings || 0,
      'Current Month Earnings': worker.current_month_earnings || 0,
      'Services Performed': worker.services_performed || 0,
      'Hire Date': new Date(worker.hire_date).toLocaleDateString()
    }));

    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worker-payroll-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Payroll data exported to CSV",
    });
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
          <h1 className="text-3xl font-bold text-gray-900">Worker Payroll Management</h1>
          <p className="text-gray-600 mt-2">
            Track worker earnings, commissions, and salary distributions with real-time data
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchWorkers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportPayrollData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workers.length}</div>
            <p className="text-xs text-muted-foreground">
              Active staff members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Workers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commissionWorkers.length}</div>
            <p className="text-xs text-muted-foreground">
              Performance-based pay
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(calculateTotalSalary())}</div>
            <p className="text-xs text-muted-foreground">
              Fixed monthly cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Commissions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(calculateTotalMonthlyEarnings())}</div>
            <p className="text-xs text-muted-foreground">
              This month's total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
          <CardDescription>
            Filter workers by role, payment type, or search by name
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Workers</Label>
              <Input
                id="search"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role-filter">Filter by Role</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="stylist">Stylist</SelectItem>
                  <SelectItem value="barber">Barber</SelectItem>
                  <SelectItem value="assistant">Assistant</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-filter">Payment Type</Label>
              <Select value={filterPaymentType} onValueChange={setFilterPaymentType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="monthly">Monthly Salary</SelectItem>
                  <SelectItem value="commission">Commission Based</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month-select">Select Month</Label>
              <Input
                id="month-select"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commission">Commission Workers</TabsTrigger>
          <TabsTrigger value="salary">Salary Workers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>All Workers - Earnings Summary</CardTitle>
                <CardDescription>
                  Complete overview of all workers and their current earnings status (Real-time data)
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchWorkers}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Base Amount</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>This Month</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkers.map((worker) => (
                    <TableRow key={worker.id}>
                      <TableCell className="font-medium">{worker.name}</TableCell>
                      <TableCell>{getRoleBadge(worker.role)}</TableCell>
                      <TableCell>{getPaymentTypeBadge(worker.payment_type)}</TableCell>
                      <TableCell>
                        {worker.payment_type === 'monthly' 
                          ? 'N/A'
                          : (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{worker.commission_rate}%</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCommissionEdit(worker)}
                                className="h-6 w-6 p-0"
                              >
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                            </div>
                          )
                        }
                      </TableCell>
                      <TableCell>
                        {worker.payment_type === 'monthly' 
                          ? `${formatCurrency(worker.salary)}/month`
                          : 'Commission based'
                        }
                      </TableCell>
                      <TableCell>
                        {formatCurrency(worker.total_earnings || 0)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(worker.current_month_earnings || 0)}
                      </TableCell>
                      <TableCell>
                        {worker.services_performed || 0}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openWorkerDetail(worker)}
                          className="flex items-center gap-2"
                        >
                          <UserCheck className="h-4 w-4" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commission Workers Tab */}
        <TabsContent value="commission" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Commission-Based Workers</CardTitle>
                <CardDescription>
                  Detailed breakdown of commission workers and their daily/monthly earnings (Real-time data)
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchWorkers}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>This Month</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Daily Average</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionWorkers.map((worker) => (
                    <TableRow key={worker.id}>
                      <TableCell className="font-medium">{worker.name}</TableCell>
                      <TableCell>{getRoleBadge(worker.role)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{worker.commission_rate}%</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCommissionEdit(worker)}
                            className="h-6 w-6 p-0"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(worker.total_earnings || 0)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(worker.current_month_earnings || 0)}
                      </TableCell>
                      <TableCell>
                        {worker.services_performed || 0}
                      </TableCell>
                      <TableCell>
                        {formatCurrency((worker.current_month_earnings || 0) / 30)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openWorkerDetail(worker)}
                          className="flex items-center gap-2"
                        >
                          <UserCheck className="h-4 w-4" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salary Workers Tab */}
        <TabsContent value="salary" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Monthly Salary Workers</CardTitle>
                <CardDescription>
                  Fixed salary workers and their monthly compensation
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchWorkers}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Monthly Salary</TableHead>
                    <TableHead>Services Performed</TableHead>
                    <TableHead>Hire Date</TableHead>
                    <TableHead>Annual Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryWorkers.map((worker) => (
                    <TableRow key={worker.id}>
                      <TableCell className="font-medium">{worker.name}</TableCell>
                      <TableCell>{getRoleBadge(worker.role)}</TableCell>
                      <TableCell>
                        {formatCurrency(worker.salary)}/month
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{worker.services_performed || 0}</span>
                          <Badge variant="outline" className="text-xs">
                            {worker.services_performed === 1 ? 'service' : 'services'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(worker.hire_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(worker.salary * 12)}/year
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openWorkerDetail(worker)}
                          className="flex items-center gap-2"
                        >
                          <UserCheck className="h-4 w-4" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Worker Detail Dialog */}
      <Dialog open={isWorkerDetailOpen} onOpenChange={setIsWorkerDetailOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              {selectedWorker?.name} - Detailed Earnings Report
            </DialogTitle>
            <DialogDescription>
              {selectedWorker?.payment_type === 'commission' 
                ? `Complete service history and daily commission breakdown for ${selectedWorker?.name}`
                : `Complete service history and performance tracking for ${selectedWorker?.name} (Salary worker)`
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedWorker && (
            <div className="space-y-6">
              {/* Worker Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Worker Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Role</p>
                      <div className="font-medium">{getRoleBadge(selectedWorker.role)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Type</p>
                      <div className="font-medium">{getPaymentTypeBadge(selectedWorker.payment_type)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorker.payment_type === 'monthly' ? 'Monthly Salary' : 'Commission Rate'}
                      </p>
                      <p className="font-medium">
                        {selectedWorker.payment_type === 'monthly' 
                          ? formatCurrency(selectedWorker.salary)
                          : `${selectedWorker.commission_rate}%`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Services</p>
                      <p className="font-medium">{selectedWorker.services_performed || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Salary Worker Performance Summary */}
              {selectedWorker.payment_type === 'monthly' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Summary</CardTitle>
                    <CardDescription>
                      Service performance metrics for salary worker
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{selectedWorker.services_performed || 0}</div>
                        <div className="text-sm text-blue-600">Total Services</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedWorker.salary || 0)}</div>
                        <div className="text-sm text-green-600">Monthly Salary</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedWorker.services_performed > 0 ? Math.round((selectedWorker.services_performed / 30) * 100) / 100 : 0}
                        </div>
                        <div className="text-sm text-purple-600">Avg. Services/Day</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Date Selection for Commission Workers */}
              {selectedWorker.payment_type === 'commission' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Select Date for Daily Breakdown</CardTitle>
                    <CardDescription>
                      Choose a date to view detailed service breakdown and commission earned
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="worker-date-select">Select Date</Label>
                        <Input
                          id="worker-date-select"
                          type="date"
                          value={selectedWorkerDate}
                          onChange={(e) => setSelectedWorkerDate(e.target.value)}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {workerDailyEarnings.find(d => d.date === selectedWorkerDate) ? (
                          <span className="text-green-600 font-medium">
                            {formatCurrency(workerDailyEarnings.find(d => d.date === selectedWorkerDate)?.earnings || 0)} earned on this date
                          </span>
                        ) : (
                          <span className="text-gray-500">No services on this date</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Daily Earnings Summary */}
              {selectedWorker.payment_type === 'commission' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Earnings Summary</CardTitle>
                    <CardDescription>
                      Commission earnings breakdown by date (Last 30 days)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {workerDailyEarnings.slice(0, 30).map((daily) => (
                        <div
                          key={daily.date}
                          className={`p-4 rounded-lg border ${
                            daily.date === selectedWorkerDate 
                              ? 'border-blue-300 bg-blue-50' 
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">
                                {new Date(daily.date).toLocaleDateString('en-US', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {daily.services_count} service{daily.services_count !== 1 ? 's' : ''} completed
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(daily.earnings)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Commission earned
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Service History */}
              <Card>
                <CardHeader>
                  <CardTitle>Complete Service History</CardTitle>
                  <CardDescription>
                    {selectedWorker.payment_type === 'commission' 
                      ? `All services performed by ${selectedWorker.name} with commission calculations`
                      : `All services performed by ${selectedWorker.name} (Salary worker - no commission)`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service Price</TableHead>
                        {selectedWorker.payment_type === 'commission' && (
                          <>
                            <TableHead>Commission Rate</TableHead>
                            <TableHead>Commission Amount</TableHead>
                          </>
                        )}
                        <TableHead>Status</TableHead>
                        {selectedWorker.payment_type === 'commission' && (
                          <TableHead>Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workerServiceHistory.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell>
                            {new Date(service.service_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{service.service_name}</TableCell>
                          <TableCell>{service.customer_name}</TableCell>
                          <TableCell>{formatCurrency(service.service_price)}</TableCell>
                          {selectedWorker.payment_type === 'commission' && (
                            <>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{service.service_commission_rate || 0}%</Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openServiceCommissionEdit(service)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-green-600 font-medium">
                                  {formatCurrency(service.commission_amount)}
                                </span>
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {service.status}
                            </Badge>
                          </TableCell>
                          {selectedWorker.payment_type === 'commission' && (
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openServiceCommissionEdit(service)}
                                className="flex items-center gap-2"
                              >
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Rate
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Professional Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <DollarSign className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Real-Time Payroll Management System
            </h3>
            <p className="text-blue-800 mb-3">
              This comprehensive payroll system tracks worker earnings, commissions, and salary distributions using real-time data from completed services. 
              Commission workers earn based on service performance, while salary workers receive fixed monthly compensation.
            </p>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• <strong>Real-Time Data:</strong> All earnings calculated from actual completed services</p>
              <p>• <strong>Commission Workers:</strong> Earn variable commission rates based on individual worker settings</p>
              <p>• <strong>Service-Specific Commissions:</strong> Different services can have different commission rates</p>
              <p>• <strong>Commission Management:</strong> Edit both worker and service commission rates directly from payroll view</p>
              <p>• <strong>Salary Workers:</strong> Fixed monthly compensation with service tracking</p>
              <p>• <strong>Daily Tracking:</strong> View commission earnings by specific dates</p>
              <p>• <strong>Service History:</strong> Complete breakdown of all services and earnings</p>
              <p>• <strong>Export Functionality:</strong> Download payroll data for accounting</p>
            </div>
          </div>
        </div>
      </div>

      {/* Commission Rate Edit Dialog */}
      <Dialog open={isCommissionEditOpen} onOpenChange={setIsCommissionEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Commission Rate</DialogTitle>
            <DialogDescription>
              Update the commission rate for {editingCommissionWorker?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="commission-rate">Commission Rate (%)</Label>
              <Input
                id="commission-rate"
                type="number"
                value={newCommissionRate}
                onChange={(e) => setNewCommissionRate(e.target.value)}
                placeholder="Enter commission rate"
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                Worker will earn {newCommissionRate || 0}% from each service they perform
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCommissionEditOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={updateCommissionRate}>
                Update Commission Rate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Commission Rate Edit Dialog */}
      <Dialog open={isServiceCommissionEditOpen} onOpenChange={setIsServiceCommissionEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service Commission Rate</DialogTitle>
            <DialogDescription>
              Update the commission rate for {editingServiceCommission?.serviceName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="service-commission-rate">Service Commission Rate (%)</Label>
              <Input
                id="service-commission-rate"
                type="number"
                value={newServiceCommissionRate}
                onChange={(e) => setNewServiceCommissionRate(e.target.value)}
                placeholder="Enter commission rate"
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                This service will use {newServiceCommissionRate || 0}% commission rate instead of the worker's default rate
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsServiceCommissionEditOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={updateServiceCommissionRate}>
                Update Service Commission Rate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}