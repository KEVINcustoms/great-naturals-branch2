import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, TrendingUp, TrendingDown, Box, DollarSign, Calendar, Tag, BarChart3, Receipt, RefreshCw, ShoppingCart, X, Minus, CreditCard } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";
import { inventoryItemValidation, InventoryItemFormData } from "@/utils/validation";
import { secureFormSubmit, secureInput } from "@/utils/security";

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
  inventory_items: {
    id: string;
    name: string;
    unit_price: number;
    supplier: string | null;
    current_stock: number;
    category_id: string | null;
  };
}

// Cart interfaces
interface CartItem {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  current_stock: number;
  supplier: string | null;
  category_id: string | null;
}

interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export default function Inventory() {
  // Add CSS animations for cart
  useEffect(() => {
    // Add custom CSS for cart animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInFromRight {
        0% {
          opacity: 0;
          transform: translateX(100%);
        }
        100% {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slideOutToRight {
        0% {
          opacity: 1;
          transform: translateX(0);
        }
        100% {
          opacity: 0;
          transform: translateX(100%);
        }
      }
      
      .cart-item-enter {
        animation: slideInFromRight 0.3s ease-out forwards;
      }
      
      .cart-item-exit {
        animation: slideOutToRight 0.3s ease-out forwards;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("shop");
  
  // Cart state with persistence
  const [cart, setCart] = useState<Cart>(() => {
    // Load cart from localStorage on component mount
    const savedCart = localStorage.getItem('salon-cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        // Validate the saved cart structure and remove timestamp
        if (parsedCart.items && Array.isArray(parsedCart.items)) {
          const { lastUpdated, ...cartData } = parsedCart;
          return cartData;
        }
      } catch (error) {
        console.error('Error parsing saved cart:', error);
      }
    }
    return { items: [], total: 0, itemCount: 0 };
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    customerName: "",
    customerPhone: "",
    paymentMethod: "cash",
    referenceNumber: "",
  });
  
  const [formData, setFormData] = useState<InventoryItemFormData>({
    name: "",
    current_stock: "0",
    min_stock_level: "0",
    max_stock_level: "0",
    unit_price: "0",
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

  // Secure input handler with sanitization
  const handleInputChange = (field: keyof InventoryItemFormData, value: string | number) => {
    let sanitizedValue = value;
    
    if (typeof value === 'string') {
      switch (field) {
        case 'name':
        case 'supplier':
        case 'barcode':
          sanitizedValue = secureInput.string(value);
          break;
        case 'expiry_date':
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

  useEffect(() => {
    fetchData();
    
    // Validate cart items against current inventory after data loads
    if (cart.items.length > 0) {
      validateCartItems();
    }

    // Set up real-time subscriptions for automatic updates
    const inventoryItemsSubscription = supabase
      .channel('inventory_items_changes')
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

    const serviceProductsSubscription = supabase
      .channel('service_products_changes_inventory')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_products'
        },
        (payload) => {
          console.log('Service products table changed (inventory):', payload);
          // Refresh inventory data when service products change
          fetchData();
        }
      )
      .subscribe();

    const servicesSubscription = supabase
      .channel('services_changes_inventory')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services'
        },
        (payload) => {
          console.log('Services table changed (inventory):', payload);
          // Refresh inventory data when services change
          fetchData();
        }
      )
      .subscribe();

    // Listen for custom events from other pages that indicate inventory data changes
    const handleInventoryDataChanged = (event: CustomEvent) => {
      console.log('Inventory data change detected:', event.detail);
      // Refresh inventory data when services are updated
      fetchData();
    };

    window.addEventListener('inventory-data-changed', handleInventoryDataChanged as EventListener);

    // Cleanup subscriptions and event listeners on unmount
    return () => {
      inventoryItemsSubscription.unsubscribe();
      inventoryTransactionsSubscription.unsubscribe();
      serviceProductsSubscription.unsubscribe();
      servicesSubscription.unsubscribe();
      window.removeEventListener('inventory-data-changed', handleInventoryDataChanged as EventListener);
    };
  }, []);

  // Clean up expired cart data (older than 7 days)
  useEffect(() => {
    const cleanupExpiredCart = () => {
      const cartData = localStorage.getItem('salon-cart');
      if (cartData) {
        try {
          const parsedCart = JSON.parse(cartData);
          // If cart is older than 7 days, clear it
          const cartAge = Date.now() - new Date(parsedCart.lastUpdated || 0).getTime();
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          
          if (cartAge > sevenDays) {
            localStorage.removeItem('salon-cart');
            setCart({ items: [], total: 0, itemCount: 0 });
          }
        } catch (error) {
          console.error('Error checking cart age:', error);
          localStorage.removeItem('salon-cart');
        }
      }
    };

    cleanupExpiredCart();
    // Check every hour
    const interval = setInterval(cleanupExpiredCart, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [itemsResponse, categoriesResponse, transactionsResponse] = await Promise.all([
        supabase.from("inventory_items").select("*").order("created_at", { ascending: false }),
        supabase.from("inventory_categories").select("*").order("name"),
        supabase.from("inventory_transactions").select(`
          *,
          inventory_items(id, name, unit_price, supplier, current_stock, category_id)
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
        current_stock: parseInt(formData.current_stock.toString()) || 0,
        min_stock_level: parseInt(formData.min_stock_level.toString()) || 0,
        max_stock_level: parseInt(formData.max_stock_level.toString()) || 100,
        unit_price: parseFloat(formData.unit_price.toString()) || 0,
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
        current_stock: "0",
        min_stock_level: "0",
        max_stock_level: "0",
        unit_price: "0",
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
          inventory_items(id, name, unit_price, supplier, current_stock, category_id)
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
        unit_price: "0",
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

  // Cart persistence helper
  const saveCartToStorage = (cartData: Cart) => {
    try {
      const cartWithTimestamp = {
        ...cartData,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('salon-cart', JSON.stringify(cartWithTimestamp));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  };

  // Validate cart items against current inventory
  const validateCartItems = () => {
    if (items.length === 0 || cart.items.length === 0) return;
    
    let cartUpdated = false;
    const validatedItems = cart.items.filter(cartItem => {
      const inventoryItem = items.find(item => item.id === cartItem.id);
      
      if (!inventoryItem) {
        // Item no longer exists in inventory
        cartUpdated = true;
        return false;
      }
      
      if (inventoryItem.current_stock < cartItem.quantity) {
        // Adjust quantity to available stock
        cartUpdated = true;
        return true; // Keep item but will update quantity
      }
      
      return true;
    }).map(cartItem => {
      const inventoryItem = items.find(item => item.id === cartItem.id);
      if (inventoryItem && inventoryItem.current_stock < cartItem.quantity) {
        // Adjust quantity to available stock
        return { ...cartItem, quantity: inventoryItem.current_stock };
      }
      return cartItem;
    });
    
    if (cartUpdated) {
      const newTotal = validatedItems.reduce((sum, cartItem) => 
        sum + (cartItem.unit_price * cartItem.quantity), 0
      );
      
      const newCart = {
        items: validatedItems,
        total: newTotal,
        itemCount: validatedItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0)
      };
      
      setCart(newCart);
      saveCartToStorage(newCart);
      
      if (validatedItems.length < cart.items.length) {
        toast({
          title: "Cart Updated",
          description: "Some items were removed or quantities adjusted due to stock changes",
          variant: "destructive",
        });
      }
    }
  };

  // Cart functions
  const addToCart = (item: InventoryItem) => {
    if (item.current_stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${item.name} is currently out of stock`,
        variant: "destructive",
      });
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.items.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        // Check if adding more would exceed stock
        if (existingItem.quantity + 1 > item.current_stock) {
          toast({
            title: "Stock Limit Reached",
            description: `Cannot add more ${item.name}. Only ${item.current_stock} available.`,
            variant: "destructive",
          });
          return prevCart;
        }
        
        // Update existing item quantity
        const updatedItems = prevCart.items.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
        
        const newTotal = updatedItems.reduce((sum, cartItem) => 
          sum + (cartItem.unit_price * cartItem.quantity), 0
        );
        
        const newCart = {
          items: updatedItems,
          total: newTotal,
          itemCount: updatedItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0)
        };
        saveCartToStorage(newCart);
        return newCart;
      } else {
        // Add new item to cart
        const newItem: CartItem = {
          id: item.id,
          name: item.name,
          unit_price: item.unit_price,
          quantity: 1,
          current_stock: item.current_stock,
          supplier: item.supplier,
          category_id: item.category_id,
        };
        
        const newItems = [...prevCart.items, newItem];
        const newTotal = newItems.reduce((sum, cartItem) => 
          sum + (cartItem.unit_price * cartItem.quantity), 0
        );
        
        const newCart = {
          items: newItems,
          total: newTotal,
          itemCount: newItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0)
        };
        saveCartToStorage(newCart);
        return newCart;
      }
    });

    toast({
      title: "Added to Cart",
      description: `${item.name} added to cart`,
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => {
      const updatedItems = prevCart.items.filter(item => item.id !== itemId);
      const newTotal = updatedItems.reduce((sum, cartItem) => 
        sum + (cartItem.unit_price * cartItem.quantity), 0
      );
      
      const newCart = {
        items: updatedItems,
        total: newTotal,
        itemCount: updatedItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0)
      };
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  const updateCartItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(prevCart => {
      const updatedItems = prevCart.items.map(item => {
        if (item.id === itemId) {
          // Check if new quantity exceeds stock
          if (newQuantity > item.current_stock) {
            toast({
              title: "Stock Limit Reached",
              description: `Cannot add more ${item.name}. Only ${item.current_stock} available.`,
              variant: "destructive",
            });
            return item; // Keep current quantity
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
      
      const newTotal = updatedItems.reduce((sum, cartItem) => 
        sum + (cartItem.unit_price * cartItem.quantity), 0
      );
      
      const newCart = {
        items: updatedItems,
        total: newTotal,
        itemCount: updatedItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0)
      };
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  const clearCart = () => {
    const emptyCart = { items: [], total: 0, itemCount: 0 };
    setCart(emptyCart);
    saveCartToStorage(emptyCart);
    toast({
      title: "Cart Cleared",
      description: "All items removed from cart",
    });
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }

    if (!checkoutData.customerName.trim()) {
      toast({
        title: "Customer Name Required",
        description: "Please enter customer name",
        variant: "destructive",
      });
      return;
    }

    try {
      // Process each item in cart
      for (const cartItem of cart.items) {
        // Create inventory transaction for stock out
        const { error: transactionError } = await supabase
          .from("inventory_transactions")
          .insert({
            item_id: cartItem.id,
            transaction_type: 'stock_out',
            quantity: cartItem.quantity,
            unit_price: cartItem.unit_price,
            total_amount: cartItem.unit_price * cartItem.quantity,
            reason: `Sale to ${checkoutData.customerName}`,
            reference_number: checkoutData.referenceNumber || `SALE-${Date.now()}`,
            created_by: user?.id,
          });

        if (transactionError) throw transactionError;

        // Update inventory stock
        const { error: updateError } = await supabase
          .from("inventory_items")
          .update({ 
            current_stock: cartItem.current_stock - cartItem.quantity 
          })
          .eq("id", cartItem.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Sale Completed",
        description: `Successfully sold ${cart.itemCount} items for ${formatCurrency(cart.total)}`,
      });

      // Clear cart and close checkout
      clearCart();
      setIsCheckoutOpen(false);
      setCheckoutData({
        customerName: "",
        customerPhone: "",
        paymentMethod: "cash",
        referenceNumber: "",
      });

      // Refresh inventory data
      fetchData();

    } catch (error) {
      console.error("Error during checkout:", error);
      toast({
        title: "Checkout Error",
        description: "Failed to complete sale. Please try again.",
        variant: "destructive",
      });
    }
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
            onClick={() => {
              fetchData();
              toast({
                title: "🔄 Refreshed",
                description: "Inventory data refreshed successfully",
              });
            }}
            variant="outline"
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsTransactionDialogOpen(true)}
            className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Record Transaction
          </Button>
          
          {/* Shopping Cart Button */}
          <Button 
            onClick={() => setIsCartOpen(true)}
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50 relative"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Cart
            {cart.itemCount > 0 && (
              <Badge className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                {cart.itemCount}
              </Badge>
            )}
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
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1">
          <TabsTrigger 
            value="inventory" 
            className="data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm"
          >
            <Package className="mr-2 h-4 w-4" />
            Inventory Items
          </TabsTrigger>
          <TabsTrigger 
            value="shop" 
            className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Shop
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
                            {/* Add to Cart Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addToCart(item)}
                              disabled={item.current_stock <= 0}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={item.current_stock <= 0 ? "Out of Stock" : "Add to Cart"}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
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

        <TabsContent value="shop" className="mt-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
              <CardTitle className="text-blue-800">Product Shop</CardTitle>
              <CardDescription className="text-blue-600">
                Browse and purchase products from your inventory
              </CardDescription>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-blue-500" />
                <Input
                  placeholder="Search products..."
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 text-lg">{item.name}</h3>
                          {item.supplier && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {item.supplier}
                            </p>
                          )}
                        </div>
                        {item.category_id && (
                          <div className="ml-2">
                            {getCategoryBadge(categories.find(c => c.id === item.category_id)?.name || 'Unknown')}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-blue-600">{formatCurrency(item.unit_price)}</span>
                          {getStockStatusBadge(item.current_stock, item.min_stock_level)}
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <p>Available: {item.current_stock} units</p>
                          {item.expiry_date && (
                            <p>Expires: {new Date(item.expiry_date).toLocaleDateString()}</p>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => addToCart(item)}
                          disabled={item.current_stock <= 0}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          {item.current_stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredItems.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <ShoppingCart className="h-12 w-12 text-gray-300" />
                        <p>No products found</p>
                        <p className="text-sm">Try adjusting your search or add new inventory items</p>
                      </div>
                    </div>
                  )}
                </div>
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
                  onChange={(e) => handleInputChange('name', e.target.value)}
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
                    onChange={(e) => handleInputChange('current_stock', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="min_stock_level">Min Stock</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => handleInputChange('min_stock_level', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="max_stock_level">Max Stock</Label>
                  <Input
                    id="max_stock_level"
                    type="number"
                    value={formData.max_stock_level}
                    onChange={(e) => handleInputChange('max_stock_level', parseInt(e.target.value) || 0)}
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
                  onChange={(e) => handleInputChange('unit_price', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => handleInputChange('supplier', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => handleInputChange('expiry_date', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
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

      {/* Shopping Cart Sidebar */}
      <div className={`fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Cart Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Shopping Cart</h2>
              <p className="text-sm text-gray-600">
                {cart.itemCount} items • {formatCurrency(cart.total)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cart.items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
              >
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCartOpen(false)}
              className="h-8 w-8 p-0 hover:bg-blue-100"
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Cart Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {cart.items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-4">
                <div className="relative">
                  <ShoppingCart className="h-20 w-20 text-gray-300 mx-auto" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xs text-gray-500">0</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 text-lg font-medium">Your cart is empty</p>
                  <p className="text-gray-400 text-sm">Add some products to get started</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsCartOpen(false)}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  Start Shopping
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {cart.items.length > 5 && (
                  <div className="text-xs text-gray-500 text-center py-2 bg-blue-50 rounded-lg mb-2">
                    Scroll to see all {cart.items.length} items
                  </div>
                )}
                {cart.items.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-200 flex-shrink-0"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'slideInFromRight 0.3s ease-out forwards'
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm leading-tight truncate">{item.name}</h3>
                        {item.supplier && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate">
                            <Tag className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{item.supplier}</span>
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 -mt-1 -mr-1 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-blue-600">{formatCurrency(item.unit_price)}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                          Stock: {item.current_stock}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                            className="h-6 w-6 p-0 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium text-gray-900 text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                            className="h-6 w-6 p-0 border-gray-300 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50"
                            disabled={item.quantity >= item.current_stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">{formatCurrency(item.unit_price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cart Footer */}
              <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3 flex-shrink-0">
                {/* Subtotal and Total */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal ({cart.itemCount} items):</span>
                    <span>{formatCurrency(cart.total)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-blue-600 text-xl">{formatCurrency(cart.total)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Proceed to Checkout
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    Continue shopping to add more items
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cart Overlay */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Checkout
            </DialogTitle>
            <DialogDescription>
              Complete your sale by providing customer information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={checkoutData.customerName}
                onChange={(e) => setCheckoutData({ ...checkoutData, customerName: e.target.value })}
                placeholder="Enter customer name"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="customerPhone">Phone Number</Label>
              <Input
                id="customerPhone"
                value={checkoutData.customerPhone}
                onChange={(e) => setCheckoutData({ ...checkoutData, customerPhone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select 
                value={checkoutData.paymentMethod} 
                onValueChange={(value) => setCheckoutData({ ...checkoutData, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                value={checkoutData.referenceNumber}
                onChange={(e) => setCheckoutData({ ...checkoutData, referenceNumber: e.target.value })}
                placeholder="Invoice/Receipt number (optional)"
              />
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Order Summary</h4>
              <div className="space-y-2 text-sm">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.name} x {item.quantity}</span>
                    <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 font-medium">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="text-blue-600">{formatCurrency(cart.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckout} className="bg-green-600 hover:bg-green-700">
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}