import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, TrendingUp, TrendingDown, Box, DollarSign, Calendar, Tag, BarChart3, Receipt } from "lucide-react";
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
import { InventoryReceiptDialog } from "@/components/inventory/InventoryReceiptDialog";

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
  created_at: string;
  inventory_items: { name: string; unit_price: number; supplier: string | null };
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
  
  // Receipt dialog state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
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
          inventory_items(name, unit_price, supplier)
        `).order("created_at", { ascending: false }).limit(50)
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
      const isStockIn = transactionData.transaction_type === 'stock_in';
      const newStock = isStockIn 
        ? selectedItem.current_stock + quantity 
        : selectedItem.current_stock - quantity;

      if (!isStockIn && newStock < 0) {
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
          transaction_type: transactionData.transaction_type, // 'stock_in' | 'stock_out'
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

      // Get the created transaction to show receipt
      const { data: newTransaction, error: fetchError } = await supabase
        .from("inventory_transactions")
        .select(`
          *,
          inventory_items(name, unit_price, supplier)
        `)
        .eq("item_id", selectedItem.id)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        console.warn("Could not fetch transaction for receipt:", fetchError);
      } else {
        // Show receipt for the new transaction
        setSelectedTransaction(newTransaction);
        setIsReceiptOpen(true);
      }

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

  const openReceipt = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsReceiptOpen(true);
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

  const getStockStatusBadge = (currentStock: number, minStock: number) => {
    if (currentStock <= 0) {
      return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">Out of Stock</Badge>;
    } else if (currentStock <= minStock) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200">Low Stock</Badge>;
    } else {
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">In Stock</Badge>;
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'stock_in':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">📥 Stock In</Badge>;
      case 'stock_out':
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">📤 Stock Out</Badge>;
      case 'adjustment':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200">⚖ Adjustment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getCategoryBadge = (categoryName: string) => {
    const categoryColors: { [key: string]: string } = {
      'hair care': 'bg-purple-100 text-purple-800 border-purple-200',
      'styling': 'bg-pink-100 text-pink-800 border-pink-200',
      'tools': 'bg-blue-100 text-blue-800 border-blue-200',
      'chemicals': 'bg-orange-100 text-orange-800 border-orange-200',
      'accessories': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'supplies': 'bg-green-100 text-green-800 border-green-200',
    };
    
    const colorClass = categoryColors[categoryName.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
    return <Badge className={`${colorClass} hover:opacity-80`}>{categoryName}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Inventory
          </h1>
          <p className="text-muted-foreground">Manage salon inventory, stock levels, and transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => setIsTransactionDialogOpen(true)}
            className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Record Transaction
          </Button>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1">
          <TabsTrigger 
            value="inventory" 
            className="data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm"
          >
            <Package className="mr-2 h-4 w-4" />
            Inventory Items
          </TabsTrigger>
          <TabsTrigger 
            value="transactions" 
            className="data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50/50">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
              <CardTitle className="text-green-800">Inventory Management</CardTitle>
              <CardDescription className="text-green-600">
                Monitor stock levels, add new items, and manage your inventory
              </CardDescription>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-green-500" />
                <Input
                  placeholder="Search inventory..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm border-green-200 focus:border-green-400 focus:ring-green-400"
                />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-green-50 to-emerald-50 hover:bg-gradient-to-r hover:from-green-100 hover:to-emerald-100">
                      <TableHead className="text-green-800 font-semibold">Item</TableHead>
                      <TableHead className="text-green-800 font-semibold">Category</TableHead>
                      <TableHead className="text-green-800 font-semibold">Stock Level</TableHead>
                      <TableHead className="text-green-800 font-semibold">Status</TableHead>
                      <TableHead className="text-green-800 font-semibold">Unit Price</TableHead>
                      <TableHead className="text-green-800 font-semibold">Expiry Date</TableHead>
                      <TableHead className="text-green-800 font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-green-50/50 transition-colors duration-200">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            {item.supplier && (
                              <div className="text-sm text-gray-500 flex items-center gap-2">
                                <Tag className="h-3 w-3 text-blue-500" />
                                {item.supplier}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.category_id ? (
                            getCategoryBadge(categories.find(c => c.id === item.category_id)?.name || 'Unknown')
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              {item.current_stock} / {item.max_stock_level}
                            </div>
                            <div className="text-xs text-gray-500">
                              Min: {item.min_stock_level}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStockStatusBadge(item.current_stock, item.min_stock_level)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                            <span className="font-semibold text-emerald-700">{formatCurrency(item.unit_price)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.expiry_date ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-500" />
                              <span className="text-sm text-gray-700">{formatDate(item.expiry_date)}</span>
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
                              onClick={() => {
                                setSelectedItem(item);
                                setIsTransactionDialogOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingItem(item);
                                setIsDialogOpen(true);
                              }}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                          <div className="flex flex-col items-center gap-2">
                            <Box className="h-12 w-12 text-gray-300" />
                            <p>No inventory items found</p>
                            <p className="text-sm">Start by adding your first inventory item</p>
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

        <TabsContent value="transactions" className="mt-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
              <CardTitle className="text-blue-800">Transaction History</CardTitle>
              <CardDescription className="text-blue-600">
                View all inventory transactions and stock movements
              </CardDescription>
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
                      <TableHead className="text-blue-800 font-semibold">Date</TableHead>
                      <TableHead className="text-blue-800 font-semibold">Item</TableHead>
                      <TableHead className="text-blue-800 font-semibold">Type</TableHead>
                      <TableHead className="text-blue-800 font-semibold">Quantity</TableHead>
                      <TableHead className="text-blue-800 font-semibold">Unit Price</TableHead>
                      <TableHead className="text-blue-800 font-semibold">Total Amount</TableHead>
                      <TableHead className="text-blue-800 font-semibold">Reason</TableHead>
                      <TableHead className="text-blue-800 font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-blue-50/50 transition-colors duration-200">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-gray-700">{formatDate(transaction.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">{transaction.inventory_items.name}</TableCell>
                        <TableCell>
                          {getTransactionTypeBadge(transaction.transaction_type)}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">{transaction.quantity}</TableCell>
                        <TableCell>
                          {transaction.unit_price ? (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-emerald-500" />
                              <span className="text-sm text-gray-700">{formatCurrency(transaction.unit_price)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.total_amount ? (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-emerald-500" />
                              <span className="font-semibold text-emerald-700">{formatCurrency(transaction.total_amount)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.reason ? (
                            <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{transaction.reason}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openReceipt(transaction)}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <BarChart3 className="h-12 w-12 text-gray-300" />
                            <p>No transactions found</p>
                            <p className="text-sm">Transactions will appear here once recorded</p>
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
                    <SelectItem value="stock_in">Stock In</SelectItem>
                    <SelectItem value="stock_out">Stock Out</SelectItem>
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

      {/* Inventory Receipt Dialog */}
      <InventoryReceiptDialog
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        transaction={selectedTransaction}
      />
    </div>
  );
}