import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Calendar, DollarSign } from "lucide-react";
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

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workers</h1>
          <p className="text-muted-foreground">Manage your salon staff</p>
        </div>
        {profile?.role === 'admin' && (
          <Button onClick={() => openDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Worker
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workers</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${workers.reduce((total, worker) => total + worker.salary, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workers.filter(w => w.payment_status === 'pending' || w.payment_status === 'overdue').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>
            View and manage all your salon staff
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workers..."
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
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Hire Date</TableHead>
                  {profile?.role === 'admin' && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">{worker.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{worker.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {worker.email && (
                          <div className="text-sm text-muted-foreground">{worker.email}</div>
                        )}
                        {worker.phone && (
                          <div className="text-sm">{worker.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>${worker.salary.toLocaleString()}</TableCell>
                    <TableCell>{getPaymentStatusBadge(worker.payment_status)}</TableCell>
                    <TableCell>{new Date(worker.hire_date).toLocaleDateString()}</TableCell>
                    {profile?.role === 'admin' && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDialog(worker)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(worker.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {filteredWorkers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={profile?.role === 'admin' ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      No workers found
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