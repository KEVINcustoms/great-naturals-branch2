import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Package, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";

interface InventoryAvailability {
  item_id: string;
  item_name: string;
  required_quantity: number;
  available_stock: number;
  is_available: boolean;
  shortage: number;
}

interface InventoryAvailabilityCheckProps {
  serviceId: string;
  onAvailabilityConfirmed: () => void;
  onCancel: () => void;
}

export function InventoryAvailabilityCheck({ 
  serviceId, 
  onAvailabilityConfirmed, 
  onCancel 
}: InventoryAvailabilityCheckProps) {
  const [availability, setAvailability] = useState<InventoryAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkInventoryAvailability();
  }, [serviceId]);

  const checkInventoryAvailability = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .rpc('check_service_inventory_availability', { p_service_id: serviceId });

      if (dbError) throw dbError;

      setAvailability(data || []);
    } catch (err) {
      console.error('Error checking inventory availability:', err);
      setError('Failed to check inventory availability');
    } finally {
      setIsLoading(false);
    }
  };

  const allItemsAvailable = availability.length > 0 && availability.every(item => item.is_available);
  const hasShortages = availability.some(item => !item.is_available);

  const getStockStatusBadge = (item: InventoryAvailability) => {
    if (item.is_available) {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Available
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Insufficient Stock
        </Badge>
      );
    }
  };

  const getStockLevelColor = (item: InventoryAvailability) => {
    if (item.is_available) {
      const stockRatio = item.available_stock / item.required_quantity;
      if (stockRatio >= 3) return "text-emerald-600";
      if (stockRatio >= 2) return "text-amber-600";
      return "text-orange-600";
    }
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-lg border-red-200">
        <CardHeader className="bg-red-50 border-b border-red-200">
          <CardTitle className="text-red-800 flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex gap-2">
            <Button onClick={checkInventoryAvailability} variant="outline">
              Retry
            </Button>
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className={`border-b ${
        allItemsAvailable 
          ? 'bg-emerald-50 border-emerald-200' 
          : 'bg-amber-50 border-amber-200'
      }`}>
        <CardTitle className={`flex items-center gap-2 ${
          allItemsAvailable ? 'text-emerald-800' : 'text-amber-800'
        }`}>
          {allItemsAvailable ? (
            <CheckCircle className="h-6 w-6" />
          ) : (
            <AlertTriangle className="h-6 w-6" />
          )}
          Inventory Availability Check
        </CardTitle>
        <CardDescription className={
          allItemsAvailable ? 'text-emerald-700' : 'text-amber-700'
        }>
          {allItemsAvailable 
            ? 'All required inventory items are available for this service'
            : 'Some inventory items have insufficient stock for this service'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{availability.length}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                allItemsAvailable ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {availability.filter(item => item.is_available).length}
              </div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {availability.filter(item => !item.is_available).length}
              </div>
              <div className="text-sm text-gray-600">Shortages</div>
            </div>
          </div>

          {/* Inventory Items Table */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Required Inventory Items
            </h3>
            
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Item</TableHead>
                  <TableHead className="font-semibold text-center">Required</TableHead>
                  <TableHead className="font-semibold text-center">Available</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-center">Stock Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availability.map((item) => (
                  <TableRow key={item.item_id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell className="text-center font-semibold">
                      {item.required_quantity}
                    </TableCell>
                    <TableCell className={`text-center font-semibold ${getStockLevelColor(item)}`}>
                      {item.available_stock}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStockStatusBadge(item)}
                    </TableCell>
                    <TableCell className="text-center">
                      {!item.is_available && (
                        <Badge variant="destructive" className="text-xs">
                          Shortage: {item.shortage}
                        </Badge>
                      )}
                      {item.is_available && (
                        <div className="text-xs text-gray-600">
                          {item.available_stock >= item.required_quantity * 3 && 'High Stock'}
                          {item.available_stock >= item.required_quantity * 2 && item.available_stock < item.required_quantity * 3 && 'Medium Stock'}
                          {item.available_stock < item.required_quantity * 2 && 'Low Stock'}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Warnings */}
          {hasShortages && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-amber-800">Inventory Shortages Detected</h4>
                  <p className="text-amber-700 text-sm">
                    The following items have insufficient stock to complete this service:
                  </p>
                  <ul className="text-amber-700 text-sm list-disc list-inside space-y-1">
                    {availability
                      .filter(item => !item.is_available)
                      .map(item => (
                        <li key={item.item_id}>
                          <strong>{item.item_name}</strong>: Need {item.required_quantity}, 
                          Available {item.available_stock} (Shortage: {item.shortage})
                        </li>
                      ))
                    }
                  </ul>
                  <p className="text-amber-700 text-sm font-medium">
                    Please restock these items before completing the service.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
                         {allItemsAvailable && (
               <Button 
                 onClick={onAvailabilityConfirmed}
                 className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
               >
                 <CheckCircle className="h-4 w-4 mr-2" />
                 ✅ Confirm & Complete Service
               </Button>
             )}
            {hasShortages && (
              <Button 
                onClick={checkInventoryAvailability}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Package className="h-4 w-4 mr-2" />
                Recheck Inventory
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
