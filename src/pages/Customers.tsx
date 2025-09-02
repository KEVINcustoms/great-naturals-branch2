import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, History, Calendar, DollarSign, User, Mail, Phone, Scissors, Palette } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CustomerProductHistory } from "@/components/services/CustomerProductHistory";
import { formatCurrency } from "@/lib/utils";
import { customerValidation, CustomerFormData } from "@/utils/validation";
import { secureFormSubmit, secureInput } from "@/utils/security";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  hair_type: string | null;
  style_preference: string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
}

interface ServiceHistory {
  id: string;
  service_name: string;
  service_category: string;
  service_price: number;
  status: string;
  date_time: string;
  notes: string | null;
  staff_member?: {
    name: string;
  } | null;
  created_at: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("customers");
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    email: "",
    phone: "",
    hair_type: "",
    style_preference: "",
    notes: "",
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServiceHistory = async (customerId: string) => {
    setIsHistoryLoading(true);
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
          created_at
        `)
        .eq("customer_id", customerId)
        .order("date_time", { ascending: false });

      if (error) throw error;
      setServiceHistory(data || []);
    } catch (error) {
      console.error("Error fetching service history:", error);
      toast({
        title: "Error",
        description: "Failed to load service history",
        variant: "destructive",
      });
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchServiceHistory(customer.id);
    setActiveTab("history");
  };

  // Secure input handler with sanitization
  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    let sanitizedValue = value;
    
    switch (field) {
      case 'name':
        sanitizedValue = secureInput.string(value);
        break;
      case 'email':
        sanitizedValue = secureInput.email(value);
        break;
      case 'phone':
        sanitizedValue = secureInput.phone(value);
        break;
      default:
        sanitizedValue = secureInput.string(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Use secure form submission wrapper
      await secureFormSubmit(
        customerValidation,
        formData,
        async (validatedData) => {
          if (editingCustomer) {
            const { error } = await supabase
              .from("customers")
              .update({
                name: validatedData.name,
                email: validatedData.email || null,
                phone: validatedData.phone || null,
                hair_type: validatedData.hair_type || null,
                style_preference: validatedData.style_preference || null,
                notes: validatedData.notes || null,
              })
              .eq("id", editingCustomer.id);

            if (error) throw error;
            return { success: true, message: "Customer updated successfully" };
          } else {
            const { error } = await supabase
              .from("customers")
              .insert({
                name: validatedData.name,
                email: validatedData.email || null,
                phone: validatedData.phone || null,
                hair_type: validatedData.hair_type || null,
                style_preference: validatedData.style_preference || null,
                notes: validatedData.notes || null,
                created_by: user.id,
              });

            if (error) throw error;
            return { success: true, message: "Customer created successfully" };
          }
        },
        user.id
      );

      toast({ title: "Success", description: editingCustomer ? "Customer updated successfully" : "Customer created successfully" });
      setIsDialogOpen(false);
      setEditingCustomer(null);
      setFormData({ name: "", email: "", phone: "", hair_type: "", style_preference: "", notes: "" });
      fetchCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save customer",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Customer deleted successfully" });
      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  const openDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        hair_type: customer.hair_type || "",
        style_preference: customer.style_preference || "",
        notes: customer.notes || "",
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: "", email: "", phone: "", hair_type: "", style_preference: "", notes: "" });
    }
    setIsDialogOpen(true);
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (customer.phone && customer.phone.includes(searchQuery))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">✓ Completed</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200">⏳ Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">✗ Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getHairTypeBadge = (hairType: string) => {
    const hairTypeColors: { [key: string]: string } = {
      'curly': 'bg-purple-100 text-purple-800 border-purple-200',
      'straight': 'bg-blue-100 text-blue-800 border-blue-200',
      'wavy': 'bg-teal-100 text-teal-800 border-teal-200',
      'coily': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'textured': 'bg-pink-100 text-pink-800 border-pink-200',
    };
    
    const colorClass = hairTypeColors[hairType.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
    return <Badge className={`${colorClass} hover:opacity-80`}>{hairType}</Badge>;
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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Customers
          </h1>
          <p className="text-muted-foreground">Manage your salon customers and view their service history</p>
        </div>
        <Button 
          onClick={() => openDialog()}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1">
          <TabsTrigger 
            value="customers" 
            className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm"
          >
            Customer Directory
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            disabled={!selectedCustomer}
            className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm disabled:opacity-50"
          >
            Service History
            {selectedCustomer && (
              <span className="ml-2 text-xs text-purple-500 font-medium">
                ({selectedCustomer.name})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="products" 
            disabled={!selectedCustomer}
            className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm disabled:opacity-50"
          >
            Product History
            {selectedCustomer && (
              <span className="ml-2 text-xs text-purple-500 font-medium">
                ({selectedCustomer.name})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
              <CardTitle className="text-purple-800">Customer Directory</CardTitle>
              <CardDescription className="text-purple-600">
                View and manage all your customers. Click on a customer to view their service history.
              </CardDescription>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-purple-500" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-purple-50 to-pink-50 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100">
                      <TableHead className="text-purple-800 font-semibold">Name</TableHead>
                      <TableHead className="text-purple-800 font-semibold">Contact</TableHead>
                      <TableHead className="text-purple-800 font-semibold">Hair Type</TableHead>
                      <TableHead className="text-purple-800 font-semibold">Style Preference</TableHead>
                      <TableHead className="text-purple-800 font-semibold">Member Since</TableHead>
                      <TableHead className="text-purple-800 font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow 
                        key={customer.id} 
                        className="cursor-pointer hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200 border-l-4 border-l-transparent hover:border-l-purple-400"
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <TableCell className="font-medium text-gray-900">{customer.name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="text-sm text-gray-600 flex items-center gap-2">
                                <Mail className="h-3 w-3 text-blue-500" />
                                {customer.email}
                              </div>
                            )}
                            {customer.phone && (
                              <div className="text-sm text-gray-700 flex items-center gap-2">
                                <Phone className="h-3 w-3 text-green-500" />
                                {customer.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.hair_type ? (
                            getHairTypeBadge(customer.hair_type)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.style_preference ? (
                            <div className="flex items-center gap-2">
                              <Scissors className="h-3 w-3 text-purple-500" />
                              <span className="text-sm text-gray-700">{customer.style_preference}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {new Date(customer.created_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDialog(customer);
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(customer.id);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <User className="h-12 w-12 text-gray-300" />
                            <p>No customers found</p>
                            <p className="text-sm">Start by adding your first customer</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {selectedCustomer && (
            <div className="space-y-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <History className="h-5 w-5 text-blue-600" />
                        Service History - {selectedCustomer.name}
                      </CardTitle>
                      <CardDescription className="text-blue-600">
                        Complete service history and preferences for this customer
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("customers")}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                    >
                      Back to Customers
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Contact Information
                      </div>
                      <div className="space-y-2">
                        {selectedCustomer.email && (
                          <div className="text-sm text-blue-700">{selectedCustomer.email}</div>
                        )}
                        {selectedCustomer.phone && (
                          <div className="text-sm text-blue-700">{selectedCustomer.phone}</div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Hair Profile
                      </div>
                      <div className="space-y-2">
                        {selectedCustomer.hair_type && (
                          <div className="text-sm text-purple-700">{selectedCustomer.hair_type}</div>
                        )}
                        {selectedCustomer.style_preference && (
                          <div className="text-sm text-purple-700">{selectedCustomer.style_preference}</div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-100">
                      <div className="text-sm font-semibold text-green-800 flex items-center gap-2">
                        <Scissors className="h-4 w-4" />
                        Notes
                      </div>
                      <div className="text-sm text-green-700">
                        {selectedCustomer.notes || "No notes available"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/50">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                  <CardTitle className="text-emerald-800">Service Records</CardTitle>
                  <CardDescription className="text-emerald-600">
                    All services performed for this customer
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {isHistoryLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                  ) : serviceHistory.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-teal-100">
                          <TableHead className="text-emerald-800 font-semibold">Date & Time</TableHead>
                          <TableHead className="text-emerald-800 font-semibold">Service</TableHead>
                          <TableHead className="text-emerald-800 font-semibold">Category</TableHead>
                          <TableHead className="text-emerald-800 font-semibold">Staff Member</TableHead>
                          <TableHead className="text-emerald-800 font-semibold">Status</TableHead>
                          <TableHead className="text-emerald-800 font-semibold">Amount</TableHead>
                          <TableHead className="text-emerald-800 font-semibold">Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serviceHistory.map((service) => (
                          <TableRow key={service.id} className="hover:bg-emerald-50/50 transition-colors duration-200">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-emerald-500" />
                                <span className="text-sm text-gray-700">{formatDate(service.date_time)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-gray-900">{service.service_name}</TableCell>
                            <TableCell>
                              {getServiceCategoryBadge(service.service_category)}
                            </TableCell>
                            <TableCell>
                              {service.staff_member ? (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-indigo-500" />
                                  <span className="text-sm text-gray-700">{service.staff_member.name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(service.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                                <span className="font-semibold text-emerald-700">{formatCurrency(service.service_price)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {service.notes ? (
                                <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{service.notes}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <History className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium text-gray-500">No service history found</p>
                      <p className="text-sm text-gray-400">Services will appear here once they are recorded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          {selectedCustomer && (
            <CustomerProductHistory
              customerId={selectedCustomer.id}
              customerName={selectedCustomer.name}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 -m-6 mb-6 rounded-t-lg">
              <DialogTitle className="text-purple-800">
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
              <DialogDescription className="text-purple-600">
                {editingCustomer ? "Update customer information" : "Create a new customer profile"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-gray-700 font-medium">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    className="border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-gray-700 font-medium">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                />
              </div>

              {/* Hair Profile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="hair_type" className="text-gray-700 font-medium">Hair Type</Label>
                  <Input
                    id="hair_type"
                    value={formData.hair_type}
                    onChange={(e) => handleInputChange('hair_type', e.target.value)}
                    placeholder="e.g., Curly, Straight, Wavy"
                    className="border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="style_preference" className="text-gray-700 font-medium">Style Preference</Label>
                  <Input
                    id="style_preference"
                    value={formData.style_preference}
                    onChange={(e) => handleInputChange('style_preference', e.target.value)}
                    placeholder="e.g., Long layers, Bob cut"
                    className="border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="notes" className="text-gray-700 font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about the customer"
                  rows={3}
                  className="border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                />
              </div>
            </div>
            <DialogFooter className="bg-gray-50 p-6 -m-6 mt-6 rounded-b-lg flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-gray-300 w-full sm:w-auto">
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white w-full sm:w-auto"
              >
                {editingCustomer ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}