import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package, Tag, DollarSign, Calendar, Box } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Product {
  id: string;
  name: string;
  category: string;
  unit_price: number;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit_price: "",
    description: "",
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
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
      const productData = {
        name: formData.name,
        category: formData.category,
        unit_price: parseFloat(formData.unit_price) || 0,
        description: formData.description || null,
        created_by: user.id,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast({ title: "Success", description: "Product updated successfully" });
      } else {
        const { error } = await supabase
          .from("products")
          .insert(productData);

        if (error) throw error;
        toast({ title: "Success", description: "Product created successfully" });
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      setFormData({ name: "", category: "", unit_price: "", description: "" });
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Product deleted successfully" });
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const getCategoryBadge = (category: string) => {
    const categoryColors: { [key: string]: string } = {
      'hair care': 'bg-purple-100 text-purple-800 border-purple-200',
      'styling': 'bg-pink-100 text-pink-800 border-pink-200',
      'tools': 'bg-blue-100 text-blue-800 border-blue-200',
      'chemicals': 'bg-orange-100 text-orange-800 border-orange-200',
      'accessories': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'supplies': 'bg-green-100 text-green-800 border-green-200',
      'treatments': 'bg-teal-100 text-teal-800 border-teal-200',
      'extensions': 'bg-rose-100 text-rose-800 border-rose-200',
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
    });
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
            Products
          </h1>
          <p className="text-muted-foreground">Manage salon products and pricing</p>
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-rose-50/50">
        <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100">
          <CardTitle className="text-rose-800">Product Catalog</CardTitle>
          <CardDescription className="text-rose-600">
            View and manage all salon products and their details
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-rose-500" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm border-rose-200 focus:border-rose-400 focus:ring-rose-400"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-rose-50 to-pink-50 hover:bg-gradient-to-r hover:from-rose-100 hover:to-pink-100">
                  <TableHead className="text-rose-800 font-semibold">Product</TableHead>
                  <TableHead className="text-rose-800 font-semibold">Category</TableHead>
                  <TableHead className="text-rose-800 font-semibold">Price</TableHead>
                  <TableHead className="text-rose-800 font-semibold">Description</TableHead>
                  <TableHead className="text-rose-800 font-semibold">Created</TableHead>
                  <TableHead className="text-rose-800 font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-rose-50/50 transition-colors duration-200">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <Tag className="h-3 w-3 text-blue-500" />
                          Product ID: {product.id.slice(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getCategoryBadge(product.category)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        <span className="font-semibold text-emerald-700">{formatCurrency(product.unit_price)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.description ? (
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {product.description.length > 50 
                            ? `${product.description.substring(0, 50)}...` 
                            : product.description
                          }
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-rose-500" />
                        <span className="text-sm text-gray-700">{formatDate(product.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingProduct(product);
                            setIsDialogOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Box className="h-12 w-12 text-gray-300" />
                        <p>No products found</p>
                        <p className="text-sm">Start by adding your first product</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="bg-gradient-to-r from-rose-50 to-pink-50 p-6 -m-6 mb-6 rounded-t-lg">
              <DialogTitle className="text-rose-800">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription className="text-rose-600">
                {editingProduct ? "Update product information" : "Create a new product for your salon"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-gray-700 font-medium">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="border-gray-200 focus:border-rose-400 focus:ring-rose-400"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category" className="text-gray-700 font-medium">Category *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  placeholder="e.g., Hair Care, Styling, Tools"
                  className="border-gray-200 focus:border-rose-400 focus:ring-rose-400"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit_price" className="text-gray-700 font-medium">Unit Price *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  required
                  className="border-gray-200 focus:border-rose-400 focus:ring-rose-400"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-gray-700 font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description and details..."
                  rows={3}
                  className="border-gray-200 focus:border-rose-400 focus:ring-rose-400"
                />
              </div>
            </div>
            <DialogFooter className="bg-gray-50 p-6 -m-6 mt-6 rounded-b-lg">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-gray-300">
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white"
              >
                {editingProduct ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}