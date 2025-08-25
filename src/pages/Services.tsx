import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Receipt, Calendar, Users, Scissors, DollarSign, Clock, UserCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ReceiptDialog } from "@/components/services/ReceiptDialog";

interface Service {
  id: string;
  customer_id: string;
  service_name: string;
  service_category: string;
  service_price: number;
  staff_member_id: string | null;
  status: string;
  date_time: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  customers?: { name: string; email: string; phone: string } | null;
  workers?: { name: string } | null;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Worker {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  unit_price: number;
}

interface ServiceProduct {
  product_id: string;
  quantity: number;
  price_per_unit: number;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    service_name: "",
    service_category: "",
    service_price: "",
    staff_member_id: "",
    status: "pending",
    date_time: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  const [serviceProducts, setServiceProducts] = useState<ServiceProduct[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesResponse, customersResponse, workersResponse, productsResponse] = await Promise.all([
        supabase
          .from("services")
          .select(`
            *,
            customers:customer_id (name, email, phone),
            workers:staff_member_id (name)
          `)
          .order("created_at", { ascending: false }),
        supabase.from("customers").select("*").order("name"),
        supabase.from("workers").select("*").order("name"),
        supabase.from("inventory_items").select("id, name, unit_price").order("name")
      ]);

      if (servicesResponse.error) throw servicesResponse.error;
      if (customersResponse.error) throw customersResponse.error;
      if (workersResponse.error) throw workersResponse.error;
      if (productsResponse.error) throw productsResponse.error;

      // Transform the services data to match our interface
      const transformedServices = (servicesResponse.data || []).map(service => ({
        ...service,
        customers: service.customers && typeof service.customers === 'object' && !('error' in (service.customers as object)) ? service.customers : null,
        workers: service.workers && typeof service.workers === 'object' && !('error' in (service.workers as object)) ? service.workers : null
      }));
      setServices(transformedServices);
      setCustomers(customersResponse.data || []);
      setWorkers(workersResponse.data || []);
      setProducts(productsResponse.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      let customerId = formData.customer_id;

      // Create new customer if needed
      if (isNewCustomer && formData.customer_name.trim()) {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: formData.customer_name,
            email: formData.customer_email || null,
            phone: formData.customer_phone || null,
            created_by: user.id,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
        
        // Refresh customers list
        const { data: updatedCustomers } = await supabase
          .from("customers")
          .select("id, name, email, phone")
          .order("name");
        setCustomers(updatedCustomers || []);
      }

      const serviceData = {
        customer_id: customerId,
        service_name: formData.service_name,
        service_category: formData.service_category,
        service_price: parseFloat(formData.service_price) || 0,
        staff_member_id: formData.staff_member_id || null,
        status: formData.status,
        date_time: formData.date_time,
        notes: formData.notes || null,
        created_by: user.id,
      };

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) throw error;
        toast({ title: "Success", description: "Service updated successfully" });
      } else {
        const { data: newService, error } = await supabase
          .from("services")
          .insert(serviceData)
          .select()
          .single();

        if (error) throw error;

        // Add service products
        if (serviceProducts.length > 0) {
          const serviceProductsData = serviceProducts.map(sp => ({
            service_id: newService.id,
            product_id: sp.product_id,
            quantity: sp.quantity,
            price_per_unit: sp.price_per_unit,
            total_price: sp.quantity * sp.price_per_unit,
          }));

          const { error: productsError } = await supabase
            .from("service_products")
            .insert(serviceProductsData);

          if (productsError) throw productsError;
        }

        toast({ title: "Success", description: "Service created successfully" });
      }

      setIsDialogOpen(false);
      setEditingService(null);
      setFormData({
        customer_id: "",
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        service_name: "",
        service_category: "",
        service_price: "",
        staff_member_id: "",
        status: "pending",
        date_time: new Date().toISOString().slice(0, 16),
        notes: "",
      });
      setServiceProducts([]);
      fetchData();
    } catch (error) {
      console.error("Error saving service:", error);
      toast({
        title: "Error",
        description: "Failed to save service",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Service deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: "",
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      service_name: "",
      service_category: "",
      service_price: "",
      staff_member_id: "",
      status: "pending",
      date_time: new Date().toISOString().slice(0, 16),
      notes: "",
    });
    setServiceProducts([]);
    setIsNewCustomer(false);
  };

  const openDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        customer_id: service.customer_id,
        customer_name: service.customers?.name || "",
        customer_email: service.customers?.email || "",
        customer_phone: service.customers?.phone || "",
        service_name: service.service_name,
        service_category: service.service_category,
        service_price: service.service_price.toString(),
        staff_member_id: service.staff_member_id || "",
        status: service.status,
        date_time: new Date(service.date_time).toISOString().slice(0, 16),
        notes: service.notes || "",
      });
    } else {
      setEditingService(null);
      setFormData({
        customer_id: "",
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        service_name: "",
        service_category: "",
        service_price: "",
        staff_member_id: "",
        status: "pending",
        date_time: new Date().toISOString().slice(0, 16),
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const openReceipt = (service: Service) => {
    setSelectedService(service);
    setIsReceiptOpen(true);
  };

  const addServiceProduct = () => {
    setServiceProducts([...serviceProducts, { product_id: "", quantity: 1, price_per_unit: 0 }]);
  };

  const updateServiceProduct = (index: number, field: keyof ServiceProduct, value: string | number) => {
    const updated = [...serviceProducts];
    updated[index] = { ...updated[index], [field]: value };
    setServiceProducts(updated);
  };

  const removeServiceProduct = (index: number) => {
    setServiceProducts(serviceProducts.filter((_, i) => i !== index));
  };



  const filteredServices = services.filter((service) =>
    service.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.service_category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">✓ Completed</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200">⏳ Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">✗ Cancelled</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200">🔄 In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Services
          </h1>
          <p className="text-muted-foreground">Manage salon services and appointments</p>
        </div>
        <Button 
          onClick={() => openDialog()}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Service
        </Button>
      </div>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
          <CardTitle className="text-blue-800">Service Directory</CardTitle>
          <CardDescription className="text-blue-600">
            View and manage all salon services and appointments
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-blue-500" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm border-blue-200 focus:border-blue-400 focus:ring-blue-400"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-blue-50 to-cyan-50 hover:bg-gradient-to-r hover:from-blue-100 hover:to-cyan-100">
                  <TableHead className="text-blue-800 font-semibold">Customer</TableHead>
                  <TableHead className="text-blue-800 font-semibold">Service</TableHead>
                  <TableHead className="text-blue-800 font-semibold">Category</TableHead>
                  <TableHead className="text-blue-800 font-semibold">Staff</TableHead>
                  <TableHead className="text-blue-800 font-semibold">Status</TableHead>
                  <TableHead className="text-blue-800 font-semibold">Date & Time</TableHead>
                  <TableHead className="text-blue-800 font-semibold">Price</TableHead>
                  <TableHead className="text-blue-800 font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id} className="hover:bg-blue-50/50 transition-colors duration-200">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{service.customers?.name || 'Unknown'}</div>
                        {service.customers?.email && (
                          <div className="text-sm text-gray-500">{service.customers.email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{service.service_name}</TableCell>
                    <TableCell>
                      {getServiceCategoryBadge(service.service_category)}
                    </TableCell>
                    <TableCell>
                      {service.workers ? (
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-indigo-500" />
                          <span className="text-sm text-gray-700">{service.workers.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(service.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-700">{formatDate(service.date_time)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        <span className="font-semibold text-emerald-700">{formatCurrency(service.service_price)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReceipt(service)}
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(service)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredServices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Scissors className="h-12 w-12 text-gray-300" />
                        <p>No services found</p>
                        <p className="text-sm">Start by creating your first service</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Service Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 -m-6 mb-6 rounded-t-lg">
              <DialogTitle className="text-blue-800">
                {editingService ? "Edit Service" : "Add New Service"}
              </DialogTitle>
              <DialogDescription className="text-blue-600">
                {editingService ? "Update service information" : "Create a new service for your salon"}
              </DialogDescription>
            </DialogHeader>
                        <div className="grid gap-6 py-4">
              {/* Customer Selection */}
              <div className="grid gap-2">
                <Label className="text-gray-700 font-medium">Customer *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={isNewCustomer ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsNewCustomer(false)}
                    className={!isNewCustomer ? "bg-blue-600 text-white" : ""}
                  >
                    Existing Customer
                  </Button>
                  <Button
                    type="button"
                    variant={isNewCustomer ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsNewCustomer(true)}
                    className={isNewCustomer ? "bg-blue-600 text-white" : ""}
                  >
                    New Customer
                  </Button>
                </div>
              </div>

              {!isNewCustomer ? (
                <div className="grid gap-2">
                  <Label htmlFor="customer_id" className="text-gray-700 font-medium">Select Customer *</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                    required
                  >
                    <SelectTrigger className="border-gray-200 focus:border-blue-400 focus:ring-blue-400">
                      <SelectValue placeholder="Choose a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} {customer.email && `(${customer.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customer_name" className="text-gray-700 font-medium">Customer Name *</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      required
                      className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="customer_email" className="text-gray-700 font-medium">Customer Email</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="customer_phone" className="text-gray-700 font-medium">Customer Phone</Label>
                    <Input
                      id="customer_phone"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="service_name" className="text-gray-700 font-medium">Service Name *</Label>
                  <Input
                    id="service_name"
                    value={formData.service_name}
                    onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                    required
                    className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="service_category" className="text-gray-700 font-medium">Category *</Label>
                  <Input
                    id="service_category"
                    value={formData.service_category}
                    onChange={(e) => setFormData({ ...formData, service_category: e.target.value })}
                    required
                    placeholder="e.g., Haircut, Coloring, Styling"
                    className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="service_price" className="text-gray-700 font-medium">Price *</Label>
                  <Input
                    id="service_price"
                    type="number"
                    step="0.01"
                    value={formData.service_price}
                    onChange={(e) => setFormData({ ...formData, service_price: e.target.value })}
                    required
                    className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="staff_member_id" className="text-gray-700 font-medium">Staff Member</Label>
                  <Select
                    value={formData.staff_member_id}
                    onValueChange={(value) => setFormData({ ...formData, staff_member_id: value })}
                  >
                    <SelectTrigger className="border-gray-200 focus:border-blue-400 focus:ring-blue-400">
                      <SelectValue placeholder="Select staff member (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {workers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="status" className="text-gray-700 font-medium">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                    required
                  >
                    <SelectTrigger className="border-gray-200 focus:border-blue-400 focus:ring-blue-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date_time" className="text-gray-700 font-medium">Date & Time *</Label>
                  <Input
                    id="date_time"
                    type="datetime-local"
                    value={formData.date_time}
                    onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                    required
                    className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Products Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-700 font-medium">Products Used</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addServiceProduct}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
                
                {serviceProducts.length > 0 && (
                  <div className="space-y-3">
                    {serviceProducts.map((product, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 p-3 bg-gray-50 rounded-lg border">
                        <div className="col-span-4">
                          <Select
                            value={product.product_id}
                            onValueChange={(value) => updateServiceProduct(index, 'product_id', value)}
                          >
                            <SelectTrigger className="border-gray-200 focus:border-blue-400 focus:ring-blue-400">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} - ${p.unit_price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) => updateServiceProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                            placeholder="Qty"
                            className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={product.price_per_unit}
                            onChange={(e) => updateServiceProduct(index, 'price_per_unit', parseFloat(e.target.value) || 0)}
                            placeholder="Price"
                            className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                          />
                        </div>
                        <div className="col-span-2 flex items-center">
                          <span className="text-sm font-medium text-gray-700">
                            ${(product.quantity * product.price_per_unit).toFixed(2)}
                          </span>
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeServiceProduct(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-end">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Total Products:</div>
                        <div className="text-lg font-semibold text-blue-600">
                          ${serviceProducts.reduce((total, product) => total + (product.quantity * product.price_per_unit), 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes" className="text-gray-700 font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about the service..."
                  rows={3}
                  className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
            </div>
            <DialogFooter className="bg-gray-50 p-6 -m-6 mt-6 rounded-b-lg">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-gray-300">
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
              >
                {editingService ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <ReceiptDialog
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        service={selectedService}
      />
    </div>
  );
}