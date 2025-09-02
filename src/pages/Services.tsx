import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Receipt, Calendar, Users, Scissors, DollarSign, Clock, UserCheck, TrendingUp, RefreshCw } from "lucide-react";
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
import { InventoryAvailabilityCheck } from "@/components/services/InventoryAvailabilityCheck";
import { updateWorkerEarnings } from "@/utils/workerEarnings";
import { formatCurrency } from "@/lib/utils";
import { extendedServiceValidation, ExtendedServiceFormData } from "@/utils/validation";
import { secureFormSubmit, secureInput } from "@/utils/security";

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
  commission_rate?: number | null;
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

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number;
  unit_price: number;
  expiry_date: string | null;
  supplier: string | null;
  barcode: string | null;
  category_id: string | null;
  created_at: string;
  created_by: string;
}

interface ServiceProduct {
  inventory_item_id: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isInventoryCheckOpen, setIsInventoryCheckOpen] = useState(false);
  const [pendingServiceCompletion, setPendingServiceCompletion] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  
  const [formData, setFormData] = useState<ExtendedServiceFormData>({
    customer_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    service_name: "",
    service_category: "",
    service_price: 0,
    staff_member_id: "",
    status: "pending",
    date_time: new Date().toISOString().slice(0, 16),
    notes: "",
    commission_rate: 0,
  });

  const [serviceProducts, setServiceProducts] = useState<ServiceProduct[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Secure input handler with sanitization
  const handleInputChange = (field: keyof ExtendedServiceFormData, value: string | number) => {
    let sanitizedValue = value;
    
    if (typeof value === 'string') {
      switch (field) {
        case 'customer_name':
        case 'service_name':
        case 'service_category':
          sanitizedValue = secureInput.string(value);
          break;
        case 'customer_email':
          sanitizedValue = secureInput.email(value);
          break;
        case 'customer_phone':
          sanitizedValue = secureInput.phone(value);
          break;
        case 'date_time':
        case 'notes':
          sanitizedValue = value; // These are handled by specific validation
          break;
        default:
          sanitizedValue = secureInput.string(value);
      }
    } else if (typeof value === 'number') {
      sanitizedValue = secureInput.number(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions for automatic updates
    const servicesSubscription = supabase
      .channel('services_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services'
        },
        (payload) => {
          console.log('Services table changed:', payload);
          // Refresh services data when changes occur
          fetchData();
        }
      )
      .subscribe();

    const inventorySubscription = supabase
      .channel('inventory_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items'
        },
        (payload) => {
          console.log('Inventory items table changed:', payload);
          // Refresh inventory data when changes occur
          fetchData();
        }
      )
      .subscribe();

    const serviceProductsSubscription = supabase
      .channel('service_products_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_products'
        },
        (payload) => {
          console.log('Service products table changed:', payload);
          // Refresh both services and inventory when service products change
          fetchData();
        }
      )
      .subscribe();

    const inventoryTransactionsSubscription = supabase
      .channel('inventory_transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_transactions'
        },
        (payload) => {
          console.log('Inventory transactions table changed:', payload);
          // Refresh inventory data when transactions occur
          fetchData();
        }
      )
      .subscribe();

    // Listen for custom events from other pages that indicate inventory data changes
    const handleInventoryDataChanged = (event: CustomEvent) => {
      console.log('Services page - inventory data change detected:', event.detail);
      // Refresh services data when inventory changes
      fetchData();
    };

    window.addEventListener('inventory-data-changed', handleInventoryDataChanged as EventListener);

    // Cleanup subscriptions and event listeners on unmount
    return () => {
      servicesSubscription.unsubscribe();
      inventorySubscription.unsubscribe();
      serviceProductsSubscription.unsubscribe();
      inventoryTransactionsSubscription.unsubscribe();
      window.removeEventListener('inventory-data-changed', handleInventoryDataChanged as EventListener);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [servicesResponse, customersResponse, workersResponse, inventoryResponse] = await Promise.all([
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
        supabase.from("inventory_items").select("*").order("name")
      ]);

      if (servicesResponse.error) throw servicesResponse.error;
      if (customersResponse.error) throw customersResponse.error;
      if (workersResponse.error) throw workersResponse.error;
      if (inventoryResponse.error) throw inventoryResponse.error;

      // Transform the services data to match our interface
      const transformedServices = (servicesResponse.data || []).map(service => ({
        ...service,
        customers: service.customers && typeof service.customers === 'object' && !('error' in (service.customers as object)) ? service.customers : null,
        workers: service.workers && typeof service.workers === 'object' && !('error' in (service.workers as object)) ? service.workers : null
      }));
      setServices(transformedServices);
      setCustomers(customersResponse.data || []);
      setWorkers(workersResponse.data || []);
      
      // Handle inventory data with better error handling
      if (inventoryResponse.data && inventoryResponse.data.length > 0) {
        setInventoryItems(inventoryResponse.data);
        console.log('Fetched inventory items:', inventoryResponse.data);
      } else {
        console.warn('No inventory items found or inventory_items table is empty');
        setInventoryItems([]);
      }
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

    console.log('Form submission - Service products:', serviceProducts);
    console.log('Form submission - Form data:', formData);

    // Validate service products - only validate products that have a inventory_item_id selected
    const productsToValidate = serviceProducts.filter(sp => sp.inventory_item_id);
    const invalidProducts = productsToValidate.filter(sp => 
      sp.quantity <= 0 || sp.price_per_unit <= 0
    );
    
    // Check if there are products with no inventory_item_id selected
    const productsWithoutSelection = serviceProducts.filter(sp => !sp.inventory_item_id);
    if (productsWithoutSelection.length > 0) {
      toast({
        title: "Product Selection Error",
        description: "Please select a product for all product rows before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    if (invalidProducts.length > 0) {
      console.log('Invalid products:', invalidProducts);
      console.log('All service products:', serviceProducts);
      
      const errorDetails = invalidProducts.map((sp, index) => {
        if (!sp.inventory_item_id) return `Product ${index + 1}: No product selected`;
        if (sp.quantity <= 0) return `Product ${index + 1}: Invalid quantity (${sp.quantity})`;
        return `Product ${index + 1}: Unknown error`;
      }).join(', ');
      
      toast({
        title: "Product Validation Error",
        description: errorDetails,
        variant: "destructive",
      });
      return;
    }

    // Additional validation for required fields
    if (!formData.customer_id && !formData.customer_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a customer or enter customer details.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.service_name.trim() || !formData.service_category.trim() || !formData.service_price) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required service fields.",
        variant: "destructive",
      });
      return;
    }

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
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
        created_by: user.id,
      };

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) throw error;

        // Update service products for existing service
        if (serviceProducts.length > 0) {
          // First, delete existing service products
          const { error: deleteError } = await supabase
            .from("service_products")
            .delete()
            .eq("service_id", editingService.id);

          if (deleteError) throw deleteError;

          // Then insert new service products
          const serviceProductsData = serviceProducts.map(sp => ({
            service_id: editingService.id,
            inventory_item_id: sp.inventory_item_id,
            quantity: sp.quantity,
            price_per_unit: sp.price_per_unit,
            total_price: sp.total_price || sp.quantity * sp.price_per_unit,
          }));

          const { error: productsError } = await supabase
            .from("service_products")
            .insert(serviceProductsData);

          if (productsError) throw productsError;
        } else {
          // If no products, delete all existing service products
          const { error: deleteError } = await supabase
            .from("service_products")
            .delete()
            .eq("service_id", editingService.id);

          if (deleteError) throw deleteError;
        }

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
            inventory_item_id: sp.inventory_item_id,
            quantity: sp.quantity,
            price_per_unit: sp.price_per_unit,
            total_price: sp.total_price || sp.quantity * sp.price_per_unit,
          }));

          const { error: productsError } = await supabase
            .from("service_products")
            .insert(serviceProductsData);

          if (productsError) throw productsError;
        }

        toast({ title: "Success", description: "Service created successfully" });
        
        // Calculate worker earnings if staff member is assigned and service is completed
        if (formData.staff_member_id && formData.status === 'completed') {
          try {
            const result = await updateWorkerEarnings(
              formData.staff_member_id,
              parseFloat(formData.service_price) || 0,
              formData.date_time
            );
            
            if (result.success) {
              console.log("Worker earnings updated:", result.message);
            } else {
              console.warn("Failed to update worker earnings:", result.message);
            }
          } catch (earningsError) {
            console.error("Error updating worker earnings:", earningsError);
          }
        }
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
        commission_rate: "",
      });
      setServiceProducts([]);
      
      // Refresh services data
      await fetchData();
      
      // Trigger a custom event to notify other components that inventory-related data has changed
      window.dispatchEvent(new CustomEvent('inventory-data-changed', {
        detail: {
          type: 'service_updated',
          serviceId: editingService?.id || 'new',
          hasInventoryProducts: serviceProducts.length > 0
        }
      }));
      
      // Additional refresh to ensure all data is current
      setTimeout(() => {
        fetchData();
      }, 500);
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
      commission_rate: "",
    });
    setServiceProducts([]);
    setIsNewCustomer(false);
  };

  const openDialog = async (service?: Service) => {
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
        commission_rate: service.commission_rate?.toString() || "",
      });
      
      // Fetch existing service products
      try {
        const { data: existingProducts, error } = await supabase
          .from("service_products")
          .select(`
            *,
            inventory_items (name, unit_price)
          `)
          .eq("service_id", service.id);

        if (error) throw error;
        
        // Transform the data to match our ServiceProduct interface
        const transformedProducts = (existingProducts || []).map(sp => ({
          inventory_item_id: sp.inventory_item_id,
          quantity: sp.quantity,
          price_per_unit: sp.price_per_unit,
          total_price: sp.total_price || 0,
        }));
        
        setServiceProducts(transformedProducts);
      } catch (error) {
        console.error("Error fetching service products:", error);
        setServiceProducts([]);
      }
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
        commission_rate: "",
      });
      setServiceProducts([]);
    }
    setIsDialogOpen(true);
  };

  const openReceipt = (service: Service) => {
    setSelectedService(service);
    setIsReceiptOpen(true);
  };

  const handleServiceCompletion = async (service: Service) => {
    try {
      // First, check if this specific service has inventory items
      const { data: serviceProductsData, error: fetchError } = await supabase
        .from('service_products')
        .select('*')
        .eq('service_id', service.id);

      if (fetchError) {
        console.error('Error fetching service products:', fetchError);
        toast({
          title: "❌ Error",
          description: "Failed to check service inventory. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if service has inventory items
      if (serviceProductsData && serviceProductsData.length > 0) {
        // Open inventory availability check
        setPendingServiceCompletion(service);
        setIsInventoryCheckOpen(true);
      } else {
        // No inventory items, complete service directly
        await completeService(service);
      }
    } catch (error) {
      console.error('Error in handleServiceCompletion:', error);
      toast({
        title: "❌ Error",
        description: "Failed to process service completion. Please try again.",
        variant: "destructive",
      });
    }
  };

  const completeService = async (service: Service) => {
    try {
      // Show loading state
      toast({
        title: "Processing...",
        description: "Completing service and updating inventory...",
      });

      console.log('Attempting to complete service:', service.id);

      // First, verify the service exists and get current status
      const { data: currentService, error: fetchError } = await supabase
        .from("services")
        .select("status, created_by")
        .eq("id", service.id)
        .single();

      if (fetchError) {
        console.error('Error fetching current service:', fetchError);
        throw new Error('Service not found or access denied');
      }

      if (currentService.status === 'completed') {
        toast({
          title: "⚠️ Already Completed",
          description: "This service is already completed.",
          variant: "default",
        });
        return;
      }

      console.log('Current service status:', currentService.status);

      // Update service status to completed
      const { error: updateError } = await supabase
        .from("services")
        .update({ status: "completed" })
        .eq("id", service.id);

      if (updateError) {
        console.error('Error updating service status:', updateError);
        throw updateError;
      }

      console.log('Service status updated successfully');

      // Update worker earnings if staff member is assigned
      if (service.staff_member_id) {
        try {
          await updateWorkerEarnings(service.staff_member_id, service.service_price, service.commission_rate);
          console.log('Worker earnings updated');
        } catch (earningsError) {
          console.warn('Warning: Failed to update worker earnings:', earningsError);
          // Don't fail the service completion for earnings update failure
        }
      }

      // Success message with details
      toast({
        title: "✅ Service Completed Successfully",
        description: `"${service.service_name}" has been completed and inventory has been updated.`,
        className: "bg-green-50 border-green-200 text-green-800",
      });

      console.log('Service completed successfully');

      // Refresh ALL data to show updated inventory levels
      await fetchData(); // This will refresh both services and inventory items

      // Additional refresh to ensure all data is up to date
      setTimeout(() => {
        fetchData();
      }, 1000);

    } catch (error) {
      console.error("Error completing service:", error);
      
      // Professional error handling with specific messages
      let errorMessage = "Failed to complete service";
      const errorTitle = "❌ Service Completion Failed";
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errorObj = error as { message: string };
        console.log('Error message:', errorObj.message);
        
        if (errorObj.message.includes("inventory issues")) {
          errorMessage = "Inventory check failed. Please verify stock levels and try again.";
        } else if (errorObj.message.includes("stock levels")) {
          errorMessage = "Insufficient inventory stock. Please restock items before completing.";
        } else if (errorObj.message.includes("Failed to deduct")) {
          errorMessage = "Inventory deduction failed. Please check stock availability.";
        } else if (errorObj.message.includes("Service not found")) {
          errorMessage = "Service not found or access denied. Please refresh and try again.";
        } else if (errorObj.message.includes("access denied")) {
          errorMessage = "Access denied. Please check your permissions.";
        } else {
          errorMessage = `Error: ${errorObj.message}`;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-800",
      });
    }
  };

  const onInventoryAvailabilityConfirmed = async () => {
    if (pendingServiceCompletion) {
      console.log('Inventory availability confirmed, completing service:', pendingServiceCompletion.id);
      try {
        await completeService(pendingServiceCompletion);
        setIsInventoryCheckOpen(false);
        setPendingServiceCompletion(null);
      } catch (error) {
        console.error('Error in onInventoryAvailabilityConfirmed:', error);
        toast({
          title: "❌ Error",
          description: "Failed to complete service after inventory confirmation.",
          variant: "destructive",
        });
      }
    }
  };

  const addServiceProduct = () => {
    const newProduct = { inventory_item_id: "", quantity: 1, price_per_unit: 0, total_price: 0 };
    console.log('Adding new service product:', newProduct);
    setServiceProducts([...serviceProducts, newProduct]);
  };



  const updateServiceProduct = (index: number, field: keyof ServiceProduct, value: string | number) => {
    const updated = [...serviceProducts];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate total_price when quantity or price_per_unit changes
    if (field === 'quantity' || field === 'price_per_unit') {
      updated[index].total_price = updated[index].quantity * updated[index].price_per_unit;
    }
    
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

  const getStatusBadge = (status: string, service: Service) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">✓ Completed</Badge>;
      case 'pending':
        return (
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-800 border-amber-200">⏳ Pending</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleServiceCompletion(service)}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs px-2 py-1 h-6"
            >
              ✓ Complete
            </Button>
          </div>
        );
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">✗ Cancelled</Badge>;
      case 'in_progress':
        return (
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-800 border-amber-200">🔄 In Progress</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleServiceCompletion(service)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-1 h-6"
            >
              ✓ Complete
            </Button>
          </div>
        );
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
        <div className="flex gap-3">
          <Button 
            onClick={() => {
              fetchData();
              toast({
                title: "🔄 Refreshed",
                description: "Data refreshed successfully",
              });
            }}
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button 
            onClick={() => openDialog()}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Service
          </Button>
        </div>
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
                    <TableHead className="text-blue-800 font-semibold">Commission Rate</TableHead>
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
                    <TableCell>{getStatusBadge(service.status, service)}</TableCell>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                        <span className="text-sm text-gray-700">
                          {service.commission_rate ? `${service.commission_rate}%` : 'Worker Default'}
                        </span>
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
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setServiceProducts([]);
          setEditingService(null);
          resetForm();
        }
        setIsDialogOpen(open);
      }}>
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
                  
                  {/* Searchable Customer Dropdown */}
                  <div className="relative">
                    <Input
                      placeholder="Search customers by name or email..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    />
                    
                    {/* Dropdown Results - Only show when searching and no customer selected */}
                    {customerSearchQuery && !formData.customer_id && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {customers
                          .filter(customer => 
                            customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                            (customer.email && customer.email.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                          )
                          .map((customer) => (
                            <div
                              key={customer.id}
                              onClick={() => {
                                setFormData({ ...formData, customer_id: customer.id });
                                setCustomerSearchQuery(customer.name); // Show selected customer name
                              }}
                              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">{customer.name}</span>
                                {customer.email && (
                                  <span className="text-xs text-gray-500">{customer.email}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        
                        {/* No Results Message */}
                        {customers.filter(customer => 
                          customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                          (customer.email && customer.email.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                        ).length === 0 && (
                          <div className="px-4 py-3 text-gray-500 text-center">
                            No customers found matching "{customerSearchQuery}"
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Selected Customer Display */}
                    {formData.customer_id && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">Selected:</span> {
                            customers.find(c => c.id === formData.customer_id)?.name || 'Unknown Customer'
                          }
                        </p>
                      </div>
                    )}
                    
                    {/* Search Results Count - Only show when searching and no customer selected */}
                    {customerSearchQuery && !formData.customer_id && (
                      <p className="text-xs text-gray-500 mt-1">
                        {customers.filter(customer => 
                          customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                          (customer.email && customer.email.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                        ).length} customer(s) found
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customer_name" className="text-gray-700 font-medium">Customer Name *</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => handleInputChange('customer_name', e.target.value)}
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
                      onChange={(e) => handleInputChange('customer_email', e.target.value)}
                      className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="customer_phone" className="text-gray-700 font-medium">Customer Phone</Label>
                    <Input
                      id="customer_phone"
                      value={formData.customer_phone}
                      onChange={(e) => handleInputChange('customer_phone', e.target.value)}
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
                  onChange={(e) => handleInputChange('service_name', e.target.value)}
                  required
                  className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="service_category" className="text-gray-700 font-medium">Category *</Label>
                <Input
                  id="service_category"
                  value={formData.service_category}
                  onChange={(e) => handleInputChange('service_category', e.target.value)}
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
                  onChange={(e) => handleInputChange('service_price', parseFloat(e.target.value) || 0)}
                  required
                  className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
                <div className="grid gap-2">
                  <Label htmlFor="commission_rate" className="text-gray-700 font-medium">Commission Rate (%)</Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.commission_rate}
                    onChange={(e) => handleInputChange('commission_rate', parseFloat(e.target.value) || 0)}
                    placeholder="Leave empty for worker default"
                    className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                  <p className="text-xs text-gray-500">
                    Custom commission rate for this service. If empty, uses worker's default rate.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  onChange={(e) => handleInputChange('date_time', e.target.value)}
                  required
                  className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
              </div>

              {/* Inventory Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-700 font-medium">Inventory Items Used</Label>
                    {inventoryItems.length === 0 && (
                      <p className="text-sm text-amber-600 mt-1">
                        ⚠️ No inventory items available. Please add items in the Inventory tab first.
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addServiceProduct}
                    disabled={inventoryItems.length === 0}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Inventory Item
                  </Button>
                </div>
                
                {serviceProducts.length > 0 && (
                  <div className="space-y-3">
                    {/* Table Headers */}
                    <div className="grid grid-cols-12 gap-3 p-3 bg-gray-100 rounded-lg border border-gray-200">
                      <div className="col-span-4 font-medium text-gray-700">Inventory Item</div>
                      <div className="col-span-2 font-medium text-gray-700">Quantity</div>
                      <div className="col-span-2 font-medium text-gray-700">Price</div>
                      <div className="col-span-2 font-medium text-gray-700">Total</div>
                      <div className="col-span-2 font-medium text-gray-700">Actions</div>
                    </div>
                                         {serviceProducts.map((product, index) => (
                       <div key={index} className={`grid grid-cols-12 gap-3 p-3 rounded-lg border ${
                         !product.inventory_item_id ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                       }`}>
                        <div className="col-span-4">
                          <Select
                            value={product.inventory_item_id}
                                                         onValueChange={(value) => {
                               console.log('Inventory item selected:', value);
                               const selectedItem = inventoryItems.find(item => item.id === value);
                               console.log('Selected inventory item:', selectedItem);
                               
                               if (selectedItem) {
                                 console.log('Setting price:', selectedItem.unit_price);
                                 
                                 // Update both inventory_item_id and price_per_unit atomically
                                 const updated = [...serviceProducts];
                                 updated[index] = {
                                   ...updated[index],
                                   inventory_item_id: value,
                                   price_per_unit: selectedItem.unit_price,
                                   total_price: selectedItem.unit_price * updated[index].quantity
                                 };
                                 setServiceProducts(updated);
                               } else {
                                 // Just update the inventory_item_id if no item found
                                 updateServiceProduct(index, 'inventory_item_id', value);
                               }
                             }}
                          >
                            <SelectTrigger className="border-gray-200 focus:border-blue-400 focus:ring-blue-400">
                              <SelectValue placeholder="Select inventory item" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryItems.length > 0 ? (
                                inventoryItems.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name} - {formatCurrency(item.unit_price)} (Stock: {item.current_stock})
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  No inventory items available
                                </SelectItem>
                              )}
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
                             {formatCurrency(product.quantity * product.price_per_unit)}
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
                        <div className="text-sm text-gray-600">Total Inventory Items:</div>
                        <div className="text-lg font-semibold text-blue-600">
                          {formatCurrency(serviceProducts.reduce((total, product) => total + (product.quantity * product.price_per_unit), 0))}
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
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about the service..."
                  rows={3}
                  className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
            </div>
            <DialogFooter className="bg-gray-50 p-6 -m-6 mt-6 rounded-b-lg">
              <Button type="button" variant="outline" onClick={() => {
                setIsDialogOpen(false);
                setServiceProducts([]);
                setEditingService(null);
                resetForm();
              }} className="border-gray-300">
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

      {/* Inventory Availability Check Dialog */}
      <Dialog open={isInventoryCheckOpen} onOpenChange={setIsInventoryCheckOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {pendingServiceCompletion && (
            <InventoryAvailabilityCheck
              serviceId={pendingServiceCompletion.id}
              onAvailabilityConfirmed={onInventoryAvailabilityConfirmed}
              onCancel={() => {
                setIsInventoryCheckOpen(false);
                setPendingServiceCompletion(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
