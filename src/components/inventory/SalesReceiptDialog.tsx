import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Package, Calendar, DollarSign, Hash, User, CreditCard } from "lucide-react";
import greatNaturalsLogo from "@/assets/great-naturals-logo.jpg";
import { formatCurrency } from "@/lib/utils";

interface CartItem {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  current_stock: number;
  supplier: string | null;
  category_id: string | null;
}

interface SalesReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: {
    items: CartItem[];
    total: number;
    customerName: string;
    customerPhone?: string;
    paymentMethod: string;
    referenceNumber?: string;
    saleDate: string;
  } | null;
}

export function SalesReceiptDialog({ isOpen, onClose, saleData }: SalesReceiptDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  if (!saleData) return null;

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'card':
        return 'Card';
      case 'mobile_money':
        return 'Mobile Money';
      case 'bank_transfer':
        return 'Bank Transfer';
      default:
        return method;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return '💵';
      case 'card':
        return '💳';
      case 'mobile_money':
        return '📱';
      case 'bank_transfer':
        return '🏦';
      default:
        return '💰';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center space-y-2">
          <img 
            src={greatNaturalsLogo} 
            alt="Great Naturals" 
            className="mx-auto h-24 w-auto object-contain"
          />
          <DialogTitle className="text-2xl font-bold text-center text-gray-800">Sales Receipt</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 print:text-black">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-primary tracking-wide">GREAT NATURALS</h2>
            <p className="text-sm text-muted-foreground font-medium">To reach your goal</p>
          </div>
          
          <div className="border-t border-b py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer:
              </span>
              <span className="font-semibold">{saleData.customerName}</span>
            </div>
            
            {saleData.customerPhone && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Phone:</span>
                <span className="font-semibold">{saleData.customerPhone}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="font-medium flex items-center gap-2">
                {getPaymentMethodIcon(saleData.paymentMethod)}
                Payment:
              </span>
              <span className="font-semibold">{getPaymentMethodLabel(saleData.paymentMethod)}</span>
            </div>
            
            {saleData.referenceNumber && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Reference:</span>
                <span className="font-mono text-sm">{saleData.referenceNumber}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date:
              </span>
              <span className="text-sm">{new Date(saleData.saleDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium text-lg border-b pb-2">Items Purchased</h3>
            {saleData.items.map((item, index) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    {item.quantity} x {formatCurrency(item.unit_price)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(item.unit_price * item.quantity)}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total Amount:</span>
              <span className="text-green-600">{formatCurrency(saleData.total)}</span>
            </div>
          </div>
          
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>Thank you for your purchase!</p>
            <p>This receipt serves as proof of transaction</p>
          </div>
        </div>
        
        <div className="flex justify-center pt-4 print:hidden">
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


