import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Receipt, Calendar, Users } from "lucide-react";
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
        supabase.from("customers").select("id, name, email, phone").order("name"),
        supabase.from("workers").select("id, name").order("name"),
        supabase.from("products").select("id, name, unit_price").order("name")
      ]);

      if (servicesResponse.error) throw servicesResponse.error;
      if (customersResponse.error) throw customersResponse.error;
      if (workersResponse.error) throw workersResponse.error;
      if (productsResponse.error) throw productsResponse.error;

      setServices((servicesResponse.data as any) || []);
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
      resetForm();
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
      const { error } = await supabase.from("services").delete().eq("id", id);
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
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        service_name: service.service_name,
        service_category: service.service_category,
        service_price: service.service_price.toString(),
        staff_member_id: service.staff_member_id || "",
        status: service.status,
        date_time: service.date_time.slice(0, 16),
        notes: service.notes || "",
      });
    } else {
      setEditingService(null);
      resetForm();
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
    service.customers?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.service_category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">Manage salon services and appointments</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service History</CardTitle>
          <CardDescription>
            View and manage all services provided
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{service.service_name}</div>
                        <div className="text-sm text-muted-foreground">{service.service_category}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{service.customers?.name}</div>
                        {service.customers?.phone && (
                          <div className="text-sm text-muted-foreground">{service.customers.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.workers?.name || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>${service.service_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(service.status)}>
                        {service.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(service.date_time).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReceipt(service)}
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredServices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No services found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Service" : "Add New Service"}
              </DialogTitle>
              <DialogDescription>
                {editingService ? "Update service information" : "Create a new service appointment"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Customer</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={!isNewCustomer ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsNewCustomer(false)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Existing
                  </Button>
                  <Button
                    type="button"
                    variant={isNewCustomer ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsNewCustomer(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Customer
                  </Button>
                </div>
                
                {!isNewCustomer ? (
                  <Select value={formData.customer_id} onValueChange={(value) => setFormData({...formData, customer_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} {customer.phone && `(${customer.phone})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="grid gap-2">
                    <Input
                      placeholder="Customer name *"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                      required
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                    />
                    <Input
                      placeholder="Phone"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="service_name">Service Name *</Label>
                  <Input
                    id="service_name"
                    value={formData.service_name}
                    onChange={(e) => setFormData({...formData, service_name: e.target.value})}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="service_category">Category *</Label>
                  <Input
                    id="service_category"
                    value={formData.service_category}
                    onChange={(e) => setFormData({...formData, service_category: e.target.value})}
                    placeholder="e.g., Styling, Coloring"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="service_price">Price *</Label>
                  <Input
                    id="service_price"
                    type="number"
                    step="0.01"
                    value={formData.service_price}
                    onChange={(e) => setFormData({...formData, service_price: e.target.value})}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="staff_member_id">Staff Member</Label>
                  <Select value={formData.staff_member_id} onValueChange={(value) => setFormData({...formData, staff_member_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
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
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
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
                  <Label htmlFor="date_time">Date & Time</Label>
                  <Input
                    id="date_time"
                    type="datetime-local"
                    value={formData.date_time}
                    onChange={(e) => setFormData({...formData, date_time: e.target.value})}
                  />
                </div>
              </div>

              {!editingService && (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Products Used</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addServiceProduct}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                  {serviceProducts.map((sp, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select 
                          value={sp.product_id} 
                          onValueChange={(value) => {
                            const product = products.find(p => p.id === value);
                            updateServiceProduct(index, 'product_id', value);
                            if (product) {
                              updateServiceProduct(index, 'price_per_unit', product.unit_price);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} (${product.unit_price})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={sp.quantity}
                        onChange={(e) => updateServiceProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-20"
                        min="1"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={sp.price_per_unit}
                        onChange={(e) => updateServiceProduct(index, 'price_per_unit', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeServiceProduct(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes about the service"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingService ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ReceiptDialog
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        service={selectedService}
      />
    </div>
  );
}