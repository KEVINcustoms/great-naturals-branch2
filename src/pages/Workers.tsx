import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Calendar, DollarSign, Users, UserCheck, Mail, Phone, Briefcase, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { workerValidation, WorkerFormData } from "@/utils/validation";
import { secureFormSubmit, secureInput } from "@/utils/security";

interface Worker {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  salary: number;
  payment_type?: 'monthly' | 'commission';
  commission_rate?: number;
  payment_status: string;
  hire_date: string;
  created_at: string;
  created_by: string;
}

export default function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<WorkerFormData>({
    name: "",
    email: "",
    phone: "",
    role: "",
    salary: 0,
    payment_type: 'monthly',
    commission_rate: 6,
    payment_status: "pending",
    hire_date: "",
  });
  
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWorkers(data || []);
    } catch (error) {
      console.error("Error fetching workers:", error);
      toast({
        title: "Error",
        description: "Failed to load workers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Secure input handler with sanitization
  const handleInputChange = (field: keyof WorkerFormData, value: string | number) => {
    let sanitizedValue = value;
    
    if (typeof value === 'string') {
      switch (field) {
        case 'name':
        case 'role':
          sanitizedValue = secureInput.string(value);
          break;
        case 'email':
          sanitizedValue = secureInput.email(value);
          break;
        case 'phone':
          sanitizedValue = secureInput.phone(value);
          break;
        case 'hire_date':
          sanitizedValue = value; // Date format validation handled by Zod
          break;
        default:
          sanitizedValue = secureInput.string(value);
      }
    } else if (typeof value === 'number') {
      sanitizedValue = secureInput.number(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Use secure form submission wrapper
      await secureFormSubmit(
        workerValidation,
        formData,
        async (validatedData) => {
          if (editingWorker) {
            const { error } = await supabase
              .from("workers")
              .update({
                name: validatedData.name,
                email: validatedData.email || null,
                phone: validatedData.phone || null,
                role: validatedData.role,
                salary: validatedData.salary || 0,
                payment_type: validatedData.payment_type,
                commission_rate: validatedData.commission_rate || 0,
                payment_status: validatedData.payment_status,
                hire_date: validatedData.hire_date,
              })
              .eq("id", editingWorker.id);

            if (error) throw error;
            return { success: true, message: "Worker updated successfully" };
          } else {
            const { error } = await supabase
              .from("workers")
              .insert({
                name: validatedData.name,
                email: validatedData.email || null,
                phone: validatedData.phone || null,
                role: validatedData.role,
                salary: validatedData.salary || 0,
                payment_type: validatedData.payment_type,
                commission_rate: validatedData.commission_rate || 0,
                payment_status: validatedData.payment_status,
                hire_date: validatedData.hire_date,
                created_by: user.id,
              });

            if (error) throw error;
            return { success: true, message: "Worker created successfully" };
          }
        },
        user.id
      );

      toast({ title: "Success", description: editingWorker ? "Worker updated successfully" : "Worker created successfully" });
      setIsDialogOpen(false);
      setEditingWorker(null);
      setFormData({ name: "", email: "", phone: "", role: "", salary: 0, payment_status: "pending", hire_date: "", payment_type: 'monthly', commission_rate: 6 });
      fetchWorkers();
    } catch (error) {
      console.error("Error saving worker:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save worker",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this worker?")) return;

    try {
      const { error } = await supabase
        .from("workers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Worker deleted successfully" });
      fetchWorkers();
    } catch (error) {
      console.error("Error deleting worker:", error);
      toast({
        title: "Error",
        description: "Failed to delete worker",
        variant: "destructive",
      });
    }
  };

  const openDialog = (worker?: Worker) => {
    if (worker) {
      setEditingWorker(worker);
      setFormData({
        name: worker.name,
        email: worker.email || "",
        phone: worker.phone || "",
        role: worker.role,
        salary: worker.salary.toString(),
        payment_type: worker.payment_type || 'monthly',
        commission_rate: worker.commission_rate || 6,
        payment_status: worker.payment_status,
        hire_date: worker.hire_date,
      });
    } else {
      setEditingWorker(null);
      setFormData({ name: "", email: "", phone: "", role: "", salary: "", payment_status: "pending", hire_date: new Date().toISOString().split('T')[0], payment_type: 'monthly', commission_rate: 6 });
    }
    setIsDialogOpen(true);
  };

  const filteredWorkers = workers.filter((worker) =>
    worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    worker.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (worker.email && worker.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getRoleBadge = (role: string) => {
    const roleColors: { [key: string]: string } = {
      'stylist': 'bg-purple-100 text-purple-800 border-purple-200',
      'colorist': 'bg-pink-100 text-pink-800 border-pink-200',
      'receptionist': 'bg-blue-100 text-blue-800 border-blue-200',
      'manager': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'assistant': 'bg-green-100 text-green-800 border-green-200',
      'trainee': 'bg-orange-100 text-orange-800 border-orange-200',
      'barber': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    
    const colorClass = roleColors[role.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
    return <Badge className={`${colorClass} hover:opacity-80`}>{role}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">✓ Paid</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200">⏳ Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">⚠ Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
              This system is actively maintained and enhanced by <strong>Our Team</strong>. 
              Future updates will include new features, security improvements, and performance optimizations. 
              For technical support or feature requests, please contact our development team.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workers Management</h1>
          <p className="text-gray-600">Manage your salon staff and their schedules</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Worker
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-full">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-600">Total Workers</p>
                <p className="text-2xl font-bold text-emerald-900">{workers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <UserCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600">Active Workers</p>
                <p className="text-2xl font-bold text-blue-900">{workers.filter(w => w.payment_status !== 'overdue').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-full">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-600">Monthly Salary</p>
                <p className="text-2xl font-bold text-amber-900">
                  {formatCurrency(workers.filter(w => w.payment_type === 'monthly').reduce((sum, w) => sum + w.salary, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-600">Commission Workers</p>
                <p className="text-2xl font-bold text-purple-900">{workers.filter(w => w.payment_type === 'commission').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/50">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
          <CardTitle className="text-emerald-800">Staff Directory</CardTitle>
          <CardDescription className="text-emerald-600">
            View and manage all salon workers and their information
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-emerald-500" />
            <Input
              placeholder="Search workers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-teal-100">
                  <TableHead className="text-emerald-800 font-semibold">Name</TableHead>
                  <TableHead className="text-emerald-800 font-semibold">Contact</TableHead>
                  <TableHead className="text-emerald-800 font-semibold">Role</TableHead>
                  <TableHead className="text-emerald-800 font-semibold">Payment</TableHead>
                  <TableHead className="text-emerald-800 font-semibold">Earnings</TableHead>
                  <TableHead className="text-emerald-800 font-semibold">Hire Date</TableHead>
                  <TableHead className="text-emerald-800 font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((worker) => (
                  <TableRow key={worker.id} className="hover:bg-emerald-50/50 transition-colors duration-200">
                    <TableCell className="font-medium text-gray-900">{worker.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {worker.email && (
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Mail className="h-3 w-3 text-blue-500" />
                            {worker.email}
                          </div>
                        )}
                        {worker.phone && (
                          <div className="text-sm text-gray-700 flex items-center gap-2">
                            <Phone className="h-3 w-3 text-green-500" />
                            {worker.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(worker.role)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        <div className="flex flex-col">
                          {worker.payment_type === 'commission' ? (
                            <>
                              <span className="font-semibold text-emerald-700">Commission Based</span>
                              <span className="text-xs text-gray-500">{worker.commission_rate || 6}% per service</span>
                            </>
                          ) : (
                            <>
                        <span className="font-semibold text-emerald-700">{formatCurrency(worker.salary)}</span>
                              <span className="text-xs text-gray-500">Monthly Salary</span>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {worker.payment_type === 'commission' ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                            <div className="flex flex-col">
                              <span className="font-semibold text-blue-700">Daily Earnings</span>
                              <span className="text-xs text-gray-500">Based on services performed</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <Calendar className="h-4 w-4 text-emerald-500" />
                            <div className="flex flex-col">
                              <span className="font-semibold text-emerald-700">{formatCurrency(worker.salary)}</span>
                              <span className="text-xs text-gray-500">Monthly</span>
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-gray-700">{formatDate(worker.hire_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(worker)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(worker.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredWorkers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchQuery ? "No workers found matching your search." : "No workers found. Add your first worker to get started."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingWorker ? "Edit Worker" : "Add New Worker"}
              </DialogTitle>
              <DialogDescription>
                {editingWorker ? "Update worker information" : "Create a new worker profile"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role *</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    placeholder="e.g., Hair Stylist, Receptionist"
                    required
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
              </div>

              {/* Payment Information */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="payment_type">Payment Type *</Label>
                  <Select 
                    value={formData.payment_type} 
                    onValueChange={(value: 'monthly' | 'commission') => setFormData({ ...formData, payment_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly Salary</SelectItem>
                      <SelectItem value="commission">Commission Based (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.payment_type === 'monthly' ? (
                <div className="grid gap-2">
                  <Label htmlFor="salary">Monthly Salary *</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => handleInputChange('salary', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    required
                  />
                </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                    <Input
                      id="commission_rate"
                      type="number"
                      value={formData.commission_rate}
                      onChange={(e) => handleInputChange('commission_rate', parseFloat(e.target.value) || 0)}
                      placeholder="6"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-500">
                      Worker will earn {formData.commission_rate}% from each service they perform
                    </p>
                  </div>
                )}
              </div>
              
              {/* Status and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select value={formData.payment_status} onValueChange={(value) => setFormData({ ...formData, payment_status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hire_date">Hire Date *</Label>
                  <Input
                    id="hire_date"
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => handleInputChange('hire_date', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                {editingWorker ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}