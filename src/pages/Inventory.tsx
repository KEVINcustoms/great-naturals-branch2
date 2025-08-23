import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface Transaction {
  id: string;
  item_id: string;
  transaction_type: string;
  quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  reason: string | null;
  reference_number: string | null;
  transaction_date: string;
  inventory_items: { name: string };
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("inventory");
  const [formData, setFormData] = useState({
    name: "",
    current_stock: "",
    min_stock_level: "",
    max_stock_level: "",
    unit_price: "",
    expiry_date: "",
    supplier: "",
    barcode: "",
    category_id: "",
  });
  const [transactionData, setTransactionData] = useState({
    transaction_type: "",
    quantity: "",
    unit_price: "",
    reason: "",
    reference_number: "",
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsResponse, categoriesResponse, transactionsResponse] = await Promise.all([
        supabase.from("inventory_items").select("*").order("created_at", { ascending: false }),
        supabase.from("inventory_categories").select("*").order("name"),
        supabase.from("inventory_transactions").select(`
          *,
          inventory_items(name)
        `).order("transaction_date", { ascending: false }).limit(50)
      ]);

      if (itemsResponse.error) throw itemsResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;
      if (transactionsResponse.error) throw transactionsResponse.error;

      setItems(itemsResponse.data || []);
      setCategories(categoriesResponse.data || []);
      setTransactions(transactionsResponse.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
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
      const itemData = {
        name: formData.name,
        current_stock: parseInt(formData.current_stock) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 0,
        max_stock_level: parseInt(formData.max_stock_level) || 100,
        unit_price: parseFloat(formData.unit_price) || 0,
        expiry_date: formData.expiry_date || null,
        supplier: formData.supplier || null,
        barcode: formData.barcode || null,
        category_id: formData.category_id || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("inventory_items")
          .update(itemData)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({ title: "Success", description: "Item updated successfully" });
      } else {
        const { error } = await supabase
          .from("inventory_items")
          .insert({ ...itemData, created_by: user.id });

        if (error) throw error;
        toast({ title: "Success", description: "Item created successfully" });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({
        name: "",
        current_stock: "",
        min_stock_level: "",
        max_stock_level: "",
        unit_price: "",
        expiry_date: "",
        supplier: "",
        barcode: "",
        category_id: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error saving item:", error);
      toast({
        title: "Error",
        description: "Failed to save item",
        variant: "destructive",
      });
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedItem) return;

    try {
      const quantity = parseInt(transactionData.quantity);
      const newStock = transactionData.transaction_type === 'in' 
        ? selectedItem.current_stock + quantity 
        : selectedItem.current_stock - quantity;

      if (newStock < 0) {
        toast({
          title: "Error",
          description: "Cannot remove more stock than available",
          variant: "destructive",
        });
        return;
      }

      // Create transaction
      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert({
          item_id: selectedItem.id,
          transaction_type: transactionData.transaction_type,
          quantity: quantity,
          unit_price: parseFloat(transactionData.unit_price) || null,
          total_amount: transactionData.unit_price ? parseFloat(transactionData.unit_price) * quantity : null,
          reason: transactionData.reason || null,
          reference_number: transactionData.reference_number || null,
          created_by: user.id,
        });

      if (transactionError) throw transactionError;

      // Update item stock
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ current_stock: newStock })
        .eq("id", selectedItem.id);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Transaction recorded successfully" });
      setIsTransactionDialogOpen(false);
      setSelectedItem(null);
      setTransactionData({
        transaction_type: "",
        quantity: "",
        unit_price: "",
        reason: "",
        reference_number: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error recording transaction:", error);
      toast({
        title: "Error",
        description: "Failed to record transaction",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Item deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const openDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        current_stock: item.current_stock.toString(),
        min_stock_level: item.min_stock_level.toString(),
        max_stock_level: item.max_stock_level.toString(),
        unit_price: item.unit_price.toString(),
        expiry_date: item.expiry_date || "",
        supplier: item.supplier || "",
        barcode: item.barcode || "",
        category_id: item.category_id || "",
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        current_stock: "0",
        min_stock_level: "10",
        max_stock_level: "100",
        unit_price: "",
        expiry_date: "",
        supplier: "",
        barcode: "",
        category_id: "",
      });
    }
    setIsDialogOpen(true);
  };

  const openTransactionDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setTransactionData({
      transaction_type: "",
      quantity: "",
      unit_price: item.unit_price.toString(),
      reason: "",
      reference_number: "",
    });
    setIsTransactionDialogOpen(true);
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const lowStockItems = items.filter(item => item.current_stock <= item.min_stock_level);
  const expiringSoonItems = items.filter(item => {
    if (!item.expiry_date) return false;
    const expiryDate = new Date(item.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
  });

  const getStockBadge = (item: InventoryItem) => {
    if (item.current_stock <= item.min_stock_level) {
      return <Badge variant="destructive">Low Stock</Badge>;
    } else if (item.current_stock >= item.max_stock_level) {
      return <Badge variant="secondary">Max Stock</Badge>;
    } else {
      return <Badge variant="default">In Stock</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Manage your salon inventory and stock</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringSoonItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${items.reduce((total, item) => total + (item.current_stock * item.unit_price), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">Inventory Items</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>
                Manage your salon products and supplies
              </CardDescription>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
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
                      <TableHead>Stock</TableHead>
                      <TableHead>Min/Max</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.supplier && (
                              <div className="text-sm text-muted-foreground">{item.supplier}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.current_stock}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            Min: {item.min_stock_level} / Max: {item.max_stock_level}
                          </div>
                        </TableCell>
                        <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                        <TableCell>{getStockBadge(item)}</TableCell>
                        <TableCell>
                          {item.expiry_date ? (
                            <div className="text-sm">
                              {new Date(item.expiry_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openTransactionDialog(item)}
                            >
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDialog(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No items found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                View recent stock movements and transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {transaction.inventory_items?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.transaction_type === 'in' ? 'default' : 'secondary'}>
                          {transaction.transaction_type === 'in' ? 'Stock In' : 'Stock Out'}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>
                        {transaction.total_amount ? `$${transaction.total_amount.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {transaction.reason || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Item Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Item" : "Add New Item"}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? "Update item information" : "Add a new inventory item"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="current_stock">Current Stock</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="min_stock_level">Min Stock</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="max_stock_level">Max Stock</Label>
                  <Input
                    id="max_stock_level"
                    type="number"
                    value={formData.max_stock_level}
                    onChange={(e) => setFormData({ ...formData, max_stock_level: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit_price">Unit Price *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleTransaction}>
            <DialogHeader>
              <DialogTitle>Stock Transaction</DialogTitle>
              <DialogDescription>
                Record stock movement for {selectedItem?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Transaction Type *</Label>
                <Select value={transactionData.transaction_type} onValueChange={(value) => setTransactionData({ ...transactionData, transaction_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transaction type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Stock In</SelectItem>
                    <SelectItem value="out">Stock Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={transactionData.quantity}
                  onChange={(e) => setTransactionData({ ...transactionData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit_price">Unit Price</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={transactionData.unit_price}
                  onChange={(e) => setTransactionData({ ...transactionData, unit_price: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  value={transactionData.reason}
                  onChange={(e) => setTransactionData({ ...transactionData, reason: e.target.value })}
                  placeholder="e.g., Purchase, Sale, Damaged"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  value={transactionData.reference_number}
                  onChange={(e) => setTransactionData({ ...transactionData, reference_number: e.target.value })}
                  placeholder="Invoice/Receipt number"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Record Transaction</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}