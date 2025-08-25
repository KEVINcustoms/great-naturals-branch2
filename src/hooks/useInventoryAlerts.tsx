import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useInventoryAlerts() {
  const { toast } = useToast();

  const checkLowStockItems = useCallback(async () => {
    try {
      // Fetch items and filter client-side because PostgREST cannot compare column to column
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('id, name, current_stock, min_stock_level');

      if (error) throw error;

      const lowStockItems = (items || []).filter(
        (item) => typeof item.current_stock === 'number' && typeof item.min_stock_level === 'number' && item.current_stock <= item.min_stock_level
      );

      if (lowStockItems.length > 0) {
        const cutoffIso = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
        const entityIds = lowStockItems.map(item => item.id);

        // Fetch recent or unread alerts for these items
        const { data: recentAlerts, error: alertError } = await supabase
          .from('alerts')
          .select('entity_id, is_read, created_at')
          .eq('type', 'low_stock')
          .in('entity_id', entityIds)
          .order('created_at', { ascending: false });

        if (alertError) throw alertError;

        // Build a map of the latest alert per entity
        const latestByEntity = new Map<string, { is_read: boolean; created_at: string }>();
        (recentAlerts || []).forEach(a => {
          if (!latestByEntity.has(a.entity_id)) {
            latestByEntity.set(a.entity_id, { is_read: a.is_read as boolean, created_at: a.created_at as string });
          }
        });

        // Create alerts only if no unread exists and last alert is older than 5 days (or none)
        const itemsNeedingAlerts = lowStockItems.filter(item => {
          const last = latestByEntity.get(item.id);
          if (!last) return true;
          if (last.is_read === false) return false; // unread alert exists
          return new Date(last.created_at).getTime() < new Date(cutoffIso).getTime();
        });

        if (itemsNeedingAlerts.length > 0) {
          const alerts = itemsNeedingAlerts.map(item => ({
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `Item "${item.name}" is running low. Current stock: ${item.current_stock}, Minimum: ${item.min_stock_level}`,
            severity: item.current_stock === 0 ? 'error' : 'warning',
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
        const cutoffIso = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
        const entityIds = expiringItems.map(item => item.id);

        // Fetch recent or unread alerts for these items
        const { data: recentAlerts, error: alertError } = await supabase
          .from('alerts')
          .select('entity_id, is_read, created_at')
          .eq('type', 'expiring_soon')
          .in('entity_id', entityIds)
          .order('created_at', { ascending: false });

        if (alertError) throw alertError;

        const latestByEntity = new Map<string, { is_read: boolean; created_at: string }>();
        (recentAlerts || []).forEach(a => {
          if (!latestByEntity.has(a.entity_id)) {
            latestByEntity.set(a.entity_id, { is_read: a.is_read as boolean, created_at: a.created_at as string });
          }
        });

        const itemsNeedingAlerts = expiringItems.filter(item => {
          const last = latestByEntity.get(item.id);
          if (!last) return true;
          if (last.is_read === false) return false;
          return new Date(last.created_at).getTime() < new Date(cutoffIso).getTime();
        });

        if (itemsNeedingAlerts.length > 0) {
          const alerts = itemsNeedingAlerts.map(item => {
            const expiryDate = new Date(item.expiry_date!);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            
            return {
              type: 'expiring_soon',
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

  // Optionally toast when checks run (debug)
  useEffect(() => {
    toast({ title: 'Inventory checks active', description: 'Automated alerts are running in the background.' });
    // only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}