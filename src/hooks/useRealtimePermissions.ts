import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface UserPermissions {
  role: 'admin' | 'user';
  access_level: 'full' | 'restricted' | 'banned';
  is_active: boolean;
  last_updated: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function useRealtimePermissions() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user permissions
  const fetchUserPermissions = async () => {
    if (!user || !profile) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, access_level, is_active, updated_at')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setPermissions({
        role: data.role || 'user',
        access_level: data.access_level || 'full',
        is_active: data.is_active ?? true,
        last_updated: data.updated_at || new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load notifications from localStorage
  const loadNotifications = () => {
    if (!user) return;
    
    try {
      const storedNotifications = localStorage.getItem(`notifications_${user.id}`);
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Check if user has admin access
  const isAdmin = () => {
    return permissions?.role === 'admin' && permissions?.is_active;
  };

  // Check if user has full access
  const hasFullAccess = () => {
    return permissions?.access_level === 'full' && permissions?.is_active;
  };

  // Check if user is banned
  const isBanned = () => {
    return permissions?.access_level === 'banned' || !permissions?.is_active;
  };

  // Check if user can access a specific feature
  const canAccess = (feature: string) => {
    if (!permissions?.is_active) return false;
    if (permissions.access_level === 'banned') return false;
    
    // Admin can access everything
    if (permissions.role === 'admin') return true;
    
    // Define feature permissions for regular users
    const featurePermissions: { [key: string]: string[] } = {
      'inventory': ['full', 'restricted'],
      'customers': ['full', 'restricted'],
      'services': ['full', 'restricted'],
      'workers': ['full'],
      'admin': ['full'], // Only full access users can access admin
      'reports': ['full'],
      'settings': ['full']
    };

    const allowedLevels = featurePermissions[feature] || ['full'];
    return allowedLevels.includes(permissions.access_level);
  };

  // Handle permission changes
  const handlePermissionChange = (event: CustomEvent) => {
    const { userId, permissions: newPermissions } = event.detail;
    
    if (user && userId === user.id) {
      console.log('🔄 Manual permission change received:', newPermissions);
      setPermissions(prev => ({
        ...prev,
        ...newPermissions,
        last_updated: new Date().toISOString()
      }));

      // Show notification to user
      toast({
        title: "Permissions Updated",
        description: `Your account permissions have been updated. Role: ${newPermissions.role}, Access: ${newPermissions.access_level}`,
        duration: 5000,
      });

      // Reload notifications
      loadNotifications();
    }
  };

  // Manual refresh function for when real-time fails
  const refreshPermissions = async () => {
    console.log('🔄 Manually refreshing permissions...');
    await fetchUserPermissions();
  };

  // Handle forced logout
  const handleForceLogout = (event: CustomEvent) => {
    const { userId, reason } = event.detail;
    
    if (user && userId === user.id) {
      toast({
        title: "Account Access Revoked",
        description: reason || "Your account access has been revoked",
        variant: "destructive",
        duration: 10000,
      });

      // Sign out the user
      setTimeout(() => {
        signOut();
      }, 2000);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );

    // Update localStorage
    if (user) {
      const updatedNotifications = notifications.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      );
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updatedNotifications));
    }
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    if (user) {
      localStorage.removeItem(`notifications_${user.id}`);
    }
  };

  useEffect(() => {
    if (user && profile) {
      console.log('🔄 Fetching user permissions for:', user.id);
      fetchUserPermissions();
      loadNotifications();
    }
  }, [user, profile]);

  // Listen for real-time permission changes
  useEffect(() => {
    const handlePermissionChangeEvent = (event: CustomEvent) => handlePermissionChange(event);
    const handleForceLogoutEvent = (event: CustomEvent) => handleForceLogout(event);

    window.addEventListener('userPermissionChanged', handlePermissionChangeEvent as EventListener);
    window.addEventListener('forceLogout', handleForceLogoutEvent as EventListener);

    return () => {
      window.removeEventListener('userPermissionChanged', handlePermissionChangeEvent as EventListener);
      window.removeEventListener('forceLogout', handleForceLogoutEvent as EventListener);
    };
  }, [user]);

  // Set up real-time subscription to profile changes
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscription for user:', user.id);

    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Real-time profile update received:', payload);
          const newData = payload.new as any;
          
          setPermissions(prev => ({
            ...prev,
            role: newData.role || 'user',
            access_level: newData.access_level || 'full',
            is_active: newData.is_active ?? true,
            last_updated: newData.updated_at || new Date().toISOString()
          }));

          // Update the profile object in useAuth hook by triggering a refresh
          // This ensures the old permission system also gets updated
          window.dispatchEvent(new CustomEvent('profileUpdated', {
            detail: {
              role: newData.role || 'user',
              access_level: newData.access_level || 'full',
              is_active: newData.is_active ?? true,
              updated_at: newData.updated_at || new Date().toISOString()
            }
          }));

          // Show notification
          toast({
            title: "Account Updated",
            description: "Your account permissions have been updated",
            duration: 5000,
          });

          // Check if user should be logged out
          if (!newData.is_active || newData.access_level === 'banned') {
            setTimeout(() => {
              signOut();
            }, 2000);
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error');
        }
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user, signOut, toast]);

  // Test function to manually trigger a profile update
  const testProfileUpdate = async () => {
    if (!user) return;
    
    console.log('🧪 Testing profile update...');
    
    // Update the profile with a test timestamp
    const { error } = await supabase
      .from('profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Test update failed:', error);
    } else {
      console.log('✅ Test update successful');
    }
  };

  return {
    permissions,
    notifications,
    isLoading,
    isAdmin: isAdmin(),
    hasFullAccess: hasFullAccess(),
    isBanned: isBanned(),
    canAccess,
    markNotificationAsRead,
    clearAllNotifications,
    refreshPermissions: fetchUserPermissions,
    testProfileUpdate
  };
}
