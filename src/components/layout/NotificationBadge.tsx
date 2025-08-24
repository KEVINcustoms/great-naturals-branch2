import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    
    // Set up real-time subscription for alert updates
    const subscription = supabase
      .channel('notification_badge')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts'
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('id', { count: 'exact' })
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching unread alerts count:', error);
    }
  };

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <a href="/alerts">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </a>
    </Button>
  );
}