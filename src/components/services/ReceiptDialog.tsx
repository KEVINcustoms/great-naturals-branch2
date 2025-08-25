import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Receipt, User, Scissors, Calendar, DollarSign, Package } from "lucide-react";
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
  products: { name: string };
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
      const { data, error } = await supabase
        .from("service_products")
        .select(`
          *,
          products (name)
        `)
        .eq("service_id", service.id);

      if (error) throw error;
      setServiceProducts(data || []);
    } catch (error) {
      console.error("Error fetching service products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!service) return null;

  const totalProductPrice = serviceProducts.reduce((sum, sp) => sum + sp.total_price, 0);
  const grandTotal = service.service_price + totalProductPrice;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-gradient-to-br from-white to-blue-50/50">
        <DialogHeader className="text-center space-y-2 bg-gradient-to-r from-blue-50 to-cyan-50 p-6 -m-6 mb-6 rounded-t-lg border-b border-blue-100">
          <img 
            src={greatNaturalsLogo} 
            alt="Great Naturals" 
            className="mx-auto h-16 w-auto object-contain"
          />
          <DialogTitle className="text-xl font-bold text-center text-blue-800 flex items-center justify-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            Service Receipt
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 print:text-black">
          <div className="text-center space-y-2 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
            <h2 className="text-lg font-semibold text-blue-800">GREAT NATURALS</h2>
            <p className="text-sm text-blue-600">To reach your goal</p>
          </div>
          
          <div className="space-y-4">
            <div className="grid gap-3 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-blue-500" />
                <div className="flex-1">
                  <span className="text-sm text-gray-600">Customer:</span>
                  <p className="font-medium text-gray-900">{service.customers?.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Scissors className="h-4 w-4 text-emerald-500" />
                <div className="flex-1">
                  <span className="text-sm text-gray-600">Service:</span>
                  <p className="font-medium text-gray-900">{service.service_name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-purple-500" />
                <div className="flex-1">
                  <span className="text-sm text-gray-600">Category:</span>
                  <p className="font-medium text-gray-900 capitalize">{service.service_category.replace('_', ' ')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <div className="flex-1">
                  <span className="text-sm text-gray-600">Service Price:</span>
                  <p className="font-medium text-emerald-700">${service.service_price.toFixed(2)}</p>
                </div>
              </div>
              
              {service.workers?.name && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-indigo-500" />
                  <div className="flex-1">
                    <span className="text-sm text-gray-600">Attendant:</span>
                    <p className="font-medium text-gray-900">{service.workers.name}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-amber-500" />
                <div className="flex-1">
                  <span className="text-sm text-gray-600">Date:</span>
                  <p className="font-medium text-gray-900">{new Date(service.date_time).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {serviceProducts.length > 0 && (
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-500" />
                  Products Used
                </h3>
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {serviceProducts.map((sp, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">{sp.products.name}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">x{sp.quantity}</span>
                        </div>
                        <span className="font-medium text-emerald-700">${sp.total_price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {service.notes && (
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Notes:</h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">{service.notes}</p>
              </div>
            )}

            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div className="flex justify-between items-center text-lg font-bold text-emerald-800">
                <span>Total Amount:</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 space-y-1 border-t border-gray-200 pt-4">
            <p>Thank you for choosing Great Naturals!</p>
            <p>We hope to see you again soon.</p>
          </div>
        </div>

        <div className="flex justify-center pt-6">
          <Button 
            onClick={handlePrint} 
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Printer className="h-4 w-4 mr-2" />
            <span>Print Receipt</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}