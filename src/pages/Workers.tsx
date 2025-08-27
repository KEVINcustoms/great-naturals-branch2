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

interface Worker {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  salary: number;
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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    salary: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingWorker) {
        const { error } = await supabase
          .from("workers")
          .update({
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.role,
            salary: parseFloat(formData.salary) || 0,
            payment_status: formData.payment_status,
            hire_date: formData.hire_date,
          })
          .eq("id", editingWorker.id);

        if (error) throw error;
        toast({ title: "Success", description: "Worker updated successfully" });
      } else {
        const { error } = await supabase
          .from("workers")
          .insert({
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.role,
            salary: parseFloat(formData.salary) || 0,
            payment_status: formData.payment_status,
            hire_date: formData.hire_date,
            created_by: user.id,
          });

        if (error) throw error;
        toast({ title: "Success", description: "Worker created successfully" });
      }

      setIsDialogOpen(false);
      setEditingWorker(null);
      setFormData({ name: "", email: "", phone: "", role: "", salary: "", payment_status: "pending", hire_date: "" });
      fetchWorkers();
    } catch (error) {
      console.error("Error saving worker:", error);
      toast({
        title: "Error",
        description: "Failed to save worker",
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
        payment_status: worker.payment_status,
        hire_date: worker.hire_date,
      });
    } else {
      setEditingWorker(null);
      setFormData({ name: "", email: "", phone: "", role: "", salary: "", payment_status: "pending", hire_date: new Date().toISOString().split('T')[0] });
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
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Worker
        </Button>
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
                  <TableHead className="text-emerald-800 font-semibold">Salary</TableHead>
                  <TableHead className="text-emerald-800 font-semibold">Payment Status</TableHead>
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
                        <span className="font-semibold text-emerald-700">{formatCurrency(worker.salary)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(worker.payment_status)}
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
                          onClick={() => {
                            setEditingWorker(worker);
                            setIsDialogOpen(true);
                          }}
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
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-12 w-12 text-gray-300" />
                        <p>No workers found</p>
                        <p className="text-sm">Start by adding your first team member</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
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
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Hair Stylist, Receptionist"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="salary">Monthly Salary *</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
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
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingWorker ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}