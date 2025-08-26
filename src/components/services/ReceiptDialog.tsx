import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import greatNaturalsLogo from "@/assets/great-naturals-logo.jpg";

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
  customers?: { name: string; email: string; phone: string };
  workers?: { name: string };
}

interface ServiceProduct {
  id: string;
  product_id: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  inventory_items: { name: string };
}

interface ReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
}

export function ReceiptDialog({ isOpen, onClose, service }: ReceiptDialogProps) {
  const [serviceProducts, setServiceProducts] = useState<ServiceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (service && isOpen) {
      fetchServiceProducts();
    }
  }, [service, isOpen]);

  const fetchServiceProducts = async () => {
    if (!service) return;
    
    setIsLoading(true);
    try {
      // First get service products
      const { data: products, error: productsError } = await supabase
        .from("service_products")
        .select("*")
        .eq("service_id", service.id);

      if (productsError) throw productsError;

      // Then get inventory item names for each product
      const productsWithNames = await Promise.all(
        (products || []).map(async (product) => {
          const { data: item } = await supabase
            .from("inventory_items")
            .select("name")
            .eq("id", product.product_id)
            .single();
          
          return {
            ...product,
            inventory_items: { name: item?.name || "Unknown Item" }
          };
        })
      );

      setServiceProducts(productsWithNames);
    } catch (error) {
      console.error("Error fetching service products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
    }).format(amount);
  };

  if (!service) return null;

  const totalProductPrice = serviceProducts.reduce((sum, sp) => sum + sp.total_price, 0);
  const grandTotal = service.service_price + totalProductPrice;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center space-y-2">
          <img 
            src={greatNaturalsLogo} 
            alt="Great Naturals" 
            className="mx-auto h-24 w-auto object-contain"
          />
          <DialogTitle className="text-2xl font-bold text-center text-gray-800">Receipt</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 print:text-black">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-primary tracking-wide">GREAT NATURALS</h2>
            <p className="text-sm text-muted-foreground font-medium">To reach your goal</p>
          </div>
          
          <div className="border-t border-b py-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Customer:</span>
              <span>{service.customers?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Service:</span>
              <span>{service.service_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Category:</span>
              <span>{service.service_category}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Service Price:</span>
              <span>{formatCurrency(service.service_price)}</span>
            </div>
            {service.workers?.name && (
              <div className="flex justify-between">
                <span className="font-medium">Attendant:</span>
                <span>{service.workers.name}</span>
              </div>
            )}
          </div>

          {serviceProducts.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Products:</h3>
              {isLoading ? (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                serviceProducts.map((sp, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{sp.inventory_items.name} x {sp.quantity}</span>
                    <span>{formatCurrency(sp.total_price)}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {service.notes && (
            <div className="space-y-1">
              <span className="font-medium">Notes:</span>
              <p className="text-sm text-muted-foreground">{service.notes}</p>
            </div>
          )}

          <div className="space-y-1">
            <span className="font-medium">Date:</span>
            <p className="text-sm">{new Date(service.date_time).toLocaleString()}</p>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground space-y-1 border-t pt-4">
            <p>Thank you for choosing Great Naturals!</p>
            <p>We hope to see you again soon.</p>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button onClick={handlePrint} className="flex items-center space-x-2">
            <Printer className="h-4 w-4" />
            <span>Print Receipt</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}