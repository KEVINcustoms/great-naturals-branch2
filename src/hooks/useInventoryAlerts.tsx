import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useInventoryAlerts() {
  const { toast } = useToast();

  const checkLowStockItems = useCallback(async () => {
    try {
      // Get items that are at or below minimum stock level
      const { data: lowStockItems, error } = await supabase
        .from('inventory_items')
        .select('id, name, current_stock, min_stock_level')
        .lte('current_stock', 'min_stock_level');

      if (error) throw error;

      if (lowStockItems && lowStockItems.length > 0) {
        // Check if alerts already exist for these items
        const { data: existingAlerts, error: alertError } = await supabase
          .from('alerts')
          .select('entity_id')
          .eq('type', 'low_stock')
          .eq('is_read', false)
          .in('entity_id', lowStockItems.map(item => item.id));

        if (alertError) throw alertError;

        const existingEntityIds = existingAlerts?.map(alert => alert.entity_id) || [];
        
        // Create alerts for items that don't already have unread low stock alerts
        const itemsNeedingAlerts = lowStockItems.filter(
          item => !existingEntityIds.includes(item.id)
        );

        if (itemsNeedingAlerts.length > 0) {
          const alerts = itemsNeedingAlerts.map(item => ({
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `Item "${item.name}" is running low. Current stock: ${item.current_stock}, Minimum: ${item.min_stock_level}`,
            severity: item.current_stock === 0 ? 'critical' : 'warning',
            entity_type: 'inventory_item',
            entity_id: item.id,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }));

          const { error: insertError } = await supabase
            .from('alerts')
            .insert(alerts);

          if (insertError) throw insertError;

          console.log(`Created ${alerts.length} new low stock alerts`);
        }
      }
    } catch (error) {
      console.error('Error checking low stock items:', error);
    }
  }, []);

  const checkExpiringItems = useCallback(async () => {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: expiringItems, error } = await supabase
        .from('inventory_items')
        .select('id, name, expiry_date, current_stock')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gt('current_stock', 0);

      if (error) throw error;

      if (expiringItems && expiringItems.length > 0) {
        // Check if alerts already exist
        const { data: existingAlerts, error: alertError } = await supabase
          .from('alerts')
          .select('entity_id')
          .eq('type', 'expiring_stock')
          .eq('is_read', false)
          .in('entity_id', expiringItems.map(item => item.id));

        if (alertError) throw alertError;

        const existingEntityIds = existingAlerts?.map(alert => alert.entity_id) || [];
        const itemsNeedingAlerts = expiringItems.filter(
          item => !existingEntityIds.includes(item.id)
        );

        if (itemsNeedingAlerts.length > 0) {
          const alerts = itemsNeedingAlerts.map(item => {
            const expiryDate = new Date(item.expiry_date!);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            
            return {
              type: 'expiring_stock',
              title: 'Item Expiring Soon',
              message: `Item "${item.name}" expires in ${daysUntilExpiry} days (${item.expiry_date}). Current stock: ${item.current_stock}`,
              severity: daysUntilExpiry <= 7 ? 'error' : 'warning',
              entity_type: 'inventory_item',
              entity_id: item.id,
              expires_at: expiryDate.toISOString(),
            };
          });

          const { error: insertError } = await supabase
            .from('alerts')
            .insert(alerts);

          if (insertError) throw insertError;

          console.log(`Created ${alerts.length} new expiring item alerts`);
        }
      }
    } catch (error) {
      console.error('Error checking expiring items:', error);
    }
  }, []);

  const runInventoryChecks = useCallback(async () => {
    await Promise.all([
      checkLowStockItems(),
      checkExpiringItems()
    ]);
  }, [checkLowStockItems, checkExpiringItems]);

  // Run checks every 5 minutes
  useEffect(() => {
    // Run once on mount
    runInventoryChecks();
    
    // Set up periodic checking
    const interval = setInterval(runInventoryChecks, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [runInventoryChecks]);

  // Listen for inventory changes to trigger immediate checks
  useEffect(() => {
    const subscription = supabase
      .channel('inventory_alerts_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_items'
      }, () => {
        // Debounce the checks to avoid too many calls
        setTimeout(runInventoryChecks, 2000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [runInventoryChecks]);

  return {
    runInventoryChecks,
    checkLowStockItems,
    checkExpiringItems
  };
}