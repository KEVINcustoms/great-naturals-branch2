import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Package, Calendar, DollarSign, Hash } from "lucide-react";
import greatNaturalsLogo from "@/assets/great-naturals-logo.jpg";

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  unit_price: number;
  supplier: string | null;
  category_id: string | null;
}

interface InventoryTransaction {
  id: string;
  item_id: string;
  transaction_type: string;
  quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  reason: string | null;
  reference_number: string | null;
  created_at: string;
  inventory_items: InventoryItem;
}

interface InventoryReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: InventoryTransaction | null;
}

export function InventoryReceiptDialog({ isOpen, onClose, transaction }: InventoryReceiptDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  if (!transaction) return null;

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'stock_in':
        return 'Stock In';
      case 'stock_out':
        return 'Stock Out';
      case 'adjustment':
        return 'Adjustment';
      default:
        return type;
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'stock_in':
        return '📥';
      case 'stock_out':
        return '📤';
      case 'adjustment':
        return '⚖';
      default:
        return '📋';
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
          <DialogTitle className="text-2xl font-bold text-center text-gray-800">Inventory Transaction Receipt</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 print:text-black">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-primary tracking-wide">GREAT NATURALS</h2>
            <p className="text-sm text-muted-foreground font-medium">To reach your goal</p>
          </div>
          
          <div className="border-t border-b py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Item:
              </span>
              <span className="font-semibold">{transaction.inventory_items.name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-medium flex items-center gap-2">
                {getTransactionTypeIcon(transaction.transaction_type)}
                Type:
              </span>
              <span className={`font-semibold ${
                transaction.transaction_type === 'stock_in' ? 'text-green-600' : 
                transaction.transaction_type === 'stock_out' ? 'text-red-600' : 'text-blue-600'
              }`}>
                {getTransactionTypeLabel(transaction.transaction_type)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-medium flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Quantity:
              </span>
              <span className="font-semibold">{transaction.quantity}</span>
            </div>
            
            {transaction.unit_price && (
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Unit Price:
                </span>
                <span className="font-semibold">{formatCurrency(transaction.unit_price)}</span>
              </div>
            )}
            
            {transaction.total_amount && (
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Amount:
                </span>
                <span className="font-semibold text-lg">{formatCurrency(transaction.total_amount)}</span>
              </div>
            )}
            
            {transaction.reason && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Reason:</span>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded">{transaction.reason}</span>
              </div>
            )}
            
            {transaction.reference_number && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Reference:</span>
                <span className="font-mono text-sm">{transaction.reference_number}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date:
              </span>
              <span className="text-sm">{formatDate(transaction.created_at)}</span>
            </div>
          </div>
          
          {transaction.inventory_items.supplier && (
            <div className="text-center py-2 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Supplier:</span> {transaction.inventory_items.supplier}
              </p>
            </div>
          )}
          
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>Thank you for your business!</p>
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
