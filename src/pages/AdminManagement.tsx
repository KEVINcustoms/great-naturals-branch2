import { useState, useEffect } from "react";
import { 
  Users, 
  Shield, 
  CheckCircle,
  AlertTriangle,
  Ban,
  Clock,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  Scissors,
  Palette,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  UserPlus,
  UserMinus,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Database,
  Server,
  HardDrive,
  Cpu,
  Wifi,
  Globe,
  FileText,
  PieChart,
  LineChart,
  Target,
  Zap,
  Star,
  Award,
  Crown,
  Key,
  Bell,
  MessageSquare,
  Archive,
  Trash,
  RotateCcw,
  Save,
  Copy,
  Share,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  X,
  Check,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimePermissions } from "@/hooks/useRealtimePermissions";
import { isAdmin } from "@/utils/permissions";
import { formatCurrency } from "@/lib/utils";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at?: string;
  is_active: boolean;
  access_level: 'full' | 'restricted' | 'banned';
  last_login?: string;
  login_count?: number;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalServices: number;
  totalRevenue: number;
  systemUptime: string;
  databaseSize: string;
  lastBackup: string;
}

interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  description: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export default function AdminManagement() {
  // Core state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(false);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Dialog states
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
  const [isSystemSettingsOpen, setIsSystemSettingsOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [isRoleChangeDialogOpen, setIsRoleChangeDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  
  // Form states
  const [userFormData, setUserFormData] = useState({
    full_name: "",
    email: "",
    role: "user" as "admin" | "user",
    access_level: "full" as "full" | "restricted" | "banned",
    is_active: true
  });
  
  const [editUserFormData, setEditUserFormData] = useState({
    id: "",
    full_name: "",
    email: "",
    role: "user" as "admin" | "user",
    access_level: "full" as "full" | "restricted" | "banned",
    is_active: true
  });
  
  const [roleChangeData, setRoleChangeData] = useState({
    userId: "",
    userName: "",
    currentRole: "user" as "admin" | "user",
    newRole: "user" as "admin" | "user",
    reason: ""
  });
  
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkReason, setBulkReason] = useState("");
  
  const { profile } = useAuth();
  const { isAdmin: hasAdminAccess, refreshPermissions, testProfileUpdate } = useRealtimePermissions();
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin(profile) || hasAdminAccess) {
      fetchInitialData();
    }
  }, [profile, hasAdminAccess]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchSystemStats(),
        fetchUserActivities(),
        fetchSystemAlerts()
      ]);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const usersWithDefaults = (data || []).map(user => ({
        ...user,
        is_active: user.is_active ?? true,
        access_level: user.access_level ?? 'full' as const,
        last_login: user.last_login ?? null,
        login_count: user.login_count ?? 0
      }));
      
      setUsers(usersWithDefaults);
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  };

  const fetchSystemStats = async () => {
    setIsStatsLoading(true);
    try {
      // Fetch various system statistics
      const [usersResult, servicesResult, revenueResult] = await Promise.all([
        supabase.from("profiles").select("id, is_active, created_at"),
        supabase.from("services").select("id, service_price, created_at"),
        supabase.from("services").select("service_price").eq("status", "completed")
      ]);

      const totalUsers = usersResult.data?.length || 0;
      const activeUsers = usersResult.data?.filter(u => u.is_active).length || 0;
      const totalServices = servicesResult.data?.length || 0;
      const totalRevenue = revenueResult.data?.reduce((sum, s) => sum + (s.service_price || 0), 0) || 0;

      setSystemStats({
        totalUsers,
        activeUsers,
        totalServices,
        totalRevenue,
        systemUptime: "99.9%",
        databaseSize: "2.4 GB",
        lastBackup: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching system stats:", error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const fetchUserActivities = async () => {
    setIsActivitiesLoading(true);
    try {
      // Mock data for now - in real implementation, this would come from an audit log table
      const mockActivities: UserActivity[] = [
        {
          id: "1",
          user_id: "user1",
          action: "login",
          description: "User logged in successfully",
          timestamp: new Date().toISOString(),
          ip_address: "192.168.1.1"
        },
        {
          id: "2", 
          user_id: "user2",
          action: "service_created",
          description: "Created new service: Hair Cut",
          timestamp: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      setUserActivities(mockActivities);
    } catch (error) {
      console.error("Error fetching user activities:", error);
    } finally {
      setIsActivitiesLoading(false);
    }
  };

  const fetchSystemAlerts = async () => {
    try {
      // Mock system alerts
      const mockAlerts: SystemAlert[] = [
        {
          id: "1",
          type: "warning",
          title: "High Memory Usage",
          message: "System memory usage is at 85%",
          timestamp: new Date().toISOString(),
          resolved: false
        },
        {
          id: "2",
          type: "info",
          title: "Scheduled Maintenance",
          message: "System maintenance scheduled for tonight at 2 AM",
          timestamp: new Date().toISOString(),
          resolved: false
        }
      ];
      setSystemAlerts(mockAlerts);
    } catch (error) {
      console.error("Error fetching system alerts:", error);
    }
  };

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
    setActiveTab("users");
  };

  const handleBulkAction = async () => {
    if (selectedUsers.length === 0 || !bulkAction) return;

    try {
      const actionMap = {
        'activate': { access_level: 'full', is_active: true },
        'restrict': { access_level: 'restricted', is_active: true },
        'ban': { access_level: 'banned', is_active: false },
        'delete': null
      };

      const updates = actionMap[bulkAction as keyof typeof actionMap];
      
      if (updates) {
        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .in("id", selectedUsers);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Bulk action completed for ${selectedUsers.length} users`,
      });

      setSelectedUsers([]);
      setIsBulkActionDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditUserFormData({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      access_level: user.access_level,
      is_active: user.is_active
    });
    setIsEditUserDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    try {
      const originalUser = users.find(u => u.id === editUserFormData.id);
      const roleChanged = editUserFormData.role !== originalUser?.role;
      const accessChanged = editUserFormData.access_level !== originalUser?.access_level;
      const statusChanged = editUserFormData.is_active !== originalUser?.is_active;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editUserFormData.full_name,
          email: editUserFormData.email,
          role: editUserFormData.role,
          access_level: editUserFormData.access_level,
          is_active: editUserFormData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq("id", editUserFormData.id);

      if (error) throw error;

      // Log changes and trigger real-time updates
      if (roleChanged) {
        await logRoleChange(editUserFormData.id, editUserFormData.role, editUserFormData.full_name);
      }

      // Trigger real-time updates for permission changes
      if (roleChanged || accessChanged || statusChanged) {
        await triggerUserPermissionUpdate(editUserFormData.id, {
          role: editUserFormData.role,
          access_level: editUserFormData.access_level,
          is_active: editUserFormData.is_active
        });
      }

      toast({
        title: "Success",
        description: "User updated successfully. Changes will take effect immediately.",
      });

      setIsEditUserDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = (user: UserProfile) => {
    setRoleChangeData({
      userId: user.id,
      userName: user.full_name,
      currentRole: user.role,
      newRole: user.role,
      reason: ""
    });
    setIsRoleChangeDialogOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (roleChangeData.currentRole === roleChangeData.newRole) {
      toast({
        title: "No Change",
        description: "Please select a different role",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update user role
      const { error } = await supabase
        .from("profiles")
        .update({
          role: roleChangeData.newRole,
          updated_at: new Date().toISOString()
        })
        .eq("id", roleChangeData.userId);

      if (error) throw error;

      // Log the role change
      await logRoleChange(roleChangeData.userId, roleChangeData.newRole, roleChangeData.userName, roleChangeData.reason);

      // Trigger real-time updates for the affected user
      await triggerUserPermissionUpdate(roleChangeData.userId, {
        role: roleChangeData.newRole,
        access_level: users.find(u => u.id === roleChangeData.userId)?.access_level || 'full',
        is_active: users.find(u => u.id === roleChangeData.userId)?.is_active || true
      });

      toast({
        title: "Success",
        description: `User role changed from ${roleChangeData.currentRole} to ${roleChangeData.newRole}. User will be notified of permission changes.`,
      });

      setIsRoleChangeDialogOpen(false);
      fetchUsers();
      fetchUserActivities(); // Refresh activities to show the role change
    } catch (error) {
      console.error("Error changing user role:", error);
      toast({
        title: "Error",
        description: "Failed to change user role",
        variant: "destructive",
      });
    }
  };

  const logRoleChange = async (userId: string, newRole: string, userName: string, reason?: string) => {
    try {
      // Create an activity log entry for the role change
      const activityDescription = `Role changed from ${roleChangeData.currentRole} to ${newRole}${reason ? ` - Reason: ${reason}` : ''}`;
      
      // In a real implementation, you would insert this into an audit_log table
      // For now, we'll add it to the local activities state
      const newActivity: UserActivity = {
        id: `role_change_${Date.now()}`,
        user_id: userId,
        action: 'role_change',
        description: activityDescription,
        timestamp: new Date().toISOString(),
        ip_address: 'System'
      };

      setUserActivities(prev => [newActivity, ...prev]);
    } catch (error) {
      console.error("Error logging role change:", error);
    }
  };

  const triggerUserPermissionUpdate = async (userId: string, newPermissions: {
    role: string;
    access_level: string;
    is_active: boolean;
  }) => {
    try {
      console.log('🔄 Triggering permission update for user:', userId, newPermissions);

      // Create a system notification for the affected user
      const notification = {
        user_id: userId,
        type: 'permission_change',
        title: 'Account Permissions Updated',
        message: `Your account permissions have been updated. Role: ${newPermissions.role}, Access: ${newPermissions.access_level}, Status: ${newPermissions.is_active ? 'Active' : 'Inactive'}`,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Store notification in localStorage for the affected user
      // In a real implementation, this would be stored in the database
      const existingNotifications = JSON.parse(localStorage.getItem(`notifications_${userId}`) || '[]');
      existingNotifications.unshift(notification);
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(existingNotifications));

      // Trigger a custom event that the user's session can listen to
      window.dispatchEvent(new CustomEvent('userPermissionChanged', {
        detail: {
          userId,
          permissions: newPermissions,
          timestamp: new Date().toISOString()
        }
      }));

      // Also trigger a profile update event for the useAuth hook
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: {
          role: newPermissions.role,
          access_level: newPermissions.access_level,
          is_active: newPermissions.is_active,
          updated_at: new Date().toISOString()
        }
      }));

      // If user is banned or inactive, trigger immediate logout
      if (!newPermissions.is_active || newPermissions.access_level === 'banned') {
        window.dispatchEvent(new CustomEvent('forceLogout', {
          detail: {
            userId,
            reason: newPermissions.access_level === 'banned' ? 'Account has been banned' : 'Account has been deactivated'
          }
        }));
      }

      console.log('✅ Permission update events dispatched');

    } catch (error) {
      console.error("Error triggering permission update:", error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && user.is_active) ||
                         (statusFilter === "inactive" && !user.is_active) ||
                         (statusFilter === "banned" && user.access_level === "banned");
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'full': return 'bg-green-100 text-green-800 border-green-200';
      case 'restricted': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'banned': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'full': return <CheckCircle className="h-4 w-4" />;
      case 'restricted': return <AlertTriangle className="h-4 w-4" />;
      case 'banned': return <Ban className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'success': return 'border-green-200 bg-green-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  // Check if user is admin using real-time permissions
  if (!isAdmin(profile) && !hasAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-100 rounded-full">
                <Shield className="h-10 w-10 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-red-900">Access Denied</CardTitle>
            <CardDescription className="text-red-700 text-lg">
              Administrator privileges required to access this section.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Crown className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-sm text-gray-500">System Management & Control</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchInitialData}
                className="text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshPermissions}
                className="text-blue-600 hover:text-blue-900"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Permissions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={testProfileUpdate}
                className="text-green-600 hover:text-green-900"
              >
                <Activity className="h-4 w-4 mr-2" />
                Test Real-time
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSystemSettingsOpen(true)}
                className="text-gray-600 hover:text-gray-900"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Alerts */}
        {systemAlerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {systemAlerts.map((alert) => (
              <Alert key={alert.id} className={getAlertColor(alert.type)}>
                <div className="flex items-center space-x-2">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm opacity-90">{alert.message}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Alert>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center space-x-2">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Users</p>
                      <p className="text-3xl font-bold text-blue-900">{systemStats?.totalUsers || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm text-blue-700">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>+12% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Active Users</p>
                      <p className="text-3xl font-bold text-green-900">{systemStats?.activeUsers || 0}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm text-green-700">
                    <Activity className="h-4 w-4 mr-1" />
                    <span>Online now</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Total Services</p>
                      <p className="text-3xl font-bold text-purple-900">{systemStats?.totalServices || 0}</p>
                    </div>
                    <Scissors className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm text-purple-700">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>+8% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Total Revenue</p>
                      <p className="text-3xl font-bold text-orange-900">{formatCurrency(systemStats?.totalRevenue || 0)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm text-orange-700">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>+15% from last month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Server className="h-5 w-5 text-blue-600" />
                    <span>System Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">System Uptime</span>
                    <Badge className="bg-green-100 text-green-800">{systemStats?.systemUptime}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Size</span>
                    <span className="text-sm text-gray-600">{systemStats?.databaseSize}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Backup</span>
                    <span className="text-sm text-gray-600">
                      {systemStats?.lastBackup ? formatDate(systemStats.lastBackup) : 'Never'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    <span>Recent Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userActivities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                        <div className="p-1 bg-blue-100 rounded-full">
                          <Activity className="h-3 w-3 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      Manage user accounts, permissions, and access levels
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedUsers.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBulkActionDialogOpen(true)}
                      >
                        <MoreHorizontal className="h-4 w-4 mr-2" />
                        Bulk Actions ({selectedUsers.length})
                      </Button>
                    )}
                    <Button
                      onClick={() => setIsUserDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Administrators</SelectItem>
                      <SelectItem value="user">Users</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Users Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(filteredUsers.map(u => u.id));
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-gray-50">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-full ${
                                user.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {user.role === 'admin' ? <Shield className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{user.full_name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role === 'admin' ? 'Administrator' : 'User'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getAccessLevelColor(user.access_level)}>
                              {getAccessLevelIcon(user.access_level)}
                              <span className="ml-1">
                                {user.access_level === 'full' ? 'Active' : 
                                 user.access_level === 'restricted' ? 'Restricted' : 'Banned'}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {user.last_login ? formatDate(user.last_login) : 'Never'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {formatDate(user.created_at)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUserSelect(user)}
                                className="h-8 w-8 p-0"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                className="h-8 w-8 p-0"
                                title="Edit User"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRoleChange(user)}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                title="Change Role"
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                title="Delete User"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                    <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Activity</CardTitle>
                <CardDescription>
                  Monitor user activities and system events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{activity.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>User ID: {activity.user_id}</span>
                          <span>•</span>
                          <span>{formatDate(activity.timestamp)}</span>
                          {activity.ip_address && (
                            <>
                              <span>•</span>
                              <span>IP: {activity.ip_address}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                      <p>Chart placeholder</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 mx-auto mb-4" />
                      <p>Chart placeholder</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>CPU Usage</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Memory Usage</span>
                      <span>72%</span>
                    </div>
                    <Progress value={72} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Disk Usage</span>
                      <span>38%</span>
                    </div>
                    <Progress value={38} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Database Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection Status</span>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Size</span>
                    <span className="text-sm text-gray-600">{systemStats?.databaseSize}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Backup</span>
                    <span className="text-sm text-gray-600">
                      {systemStats?.lastBackup ? formatDate(systemStats.lastBackup) : 'Never'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-gray-500">Send email alerts for system events</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Auto Backup</h4>
                      <p className="text-sm text-gray-500">Automatically backup data daily</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Maintenance Mode</h4>
                      <p className="text-sm text-gray-500">Put system in maintenance mode</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bulk Action Dialog */}
        <Dialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Actions</DialogTitle>
              <DialogDescription>
                Perform actions on {selectedUsers.length} selected users
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Action</Label>
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activate">Activate Users</SelectItem>
                    <SelectItem value="restrict">Restrict Access</SelectItem>
                    <SelectItem value="ban">Ban Users</SelectItem>
                    <SelectItem value="delete">Delete Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason (Optional)</Label>
                <Textarea
                  placeholder="Enter reason for this action..."
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkActionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkAction} disabled={!bulkAction}>
                Execute Action
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Dialog */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account with appropriate permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({...userFormData, full_name: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={userFormData.role} onValueChange={(value: "admin" | "user") => setUserFormData({...userFormData, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Access Level</Label>
                <Select value={userFormData.access_level} onValueChange={(value: "full" | "restricted" | "banned") => setUserFormData({...userFormData, access_level: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Access</SelectItem>
                    <SelectItem value="restricted">Restricted Access</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button>
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={editUserFormData.full_name}
                  onChange={(e) => setEditUserFormData({...editUserFormData, full_name: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editUserFormData.email}
                  onChange={(e) => setEditUserFormData({...editUserFormData, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={editUserFormData.role} onValueChange={(value: "admin" | "user") => setEditUserFormData({...editUserFormData, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Access Level</Label>
                <Select value={editUserFormData.access_level} onValueChange={(value: "full" | "restricted" | "banned") => setEditUserFormData({...editUserFormData, access_level: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Access</SelectItem>
                    <SelectItem value="restricted">Restricted Access</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={editUserFormData.is_active}
                  onCheckedChange={(checked) => setEditUserFormData({...editUserFormData, is_active: checked})}
                />
                <Label htmlFor="is_active">Active User</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser}>
                Update User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Role Change Dialog */}
        <Dialog open={isRoleChangeDialogOpen} onOpenChange={setIsRoleChangeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span>Change User Role</span>
              </DialogTitle>
              <DialogDescription>
                Change the role for {roleChangeData.userName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Current Role:</span>
                  <Badge className={roleChangeData.currentRole === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                    {roleChangeData.currentRole === 'admin' ? 'Administrator' : 'User'}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label>New Role</Label>
                <Select 
                  value={roleChangeData.newRole} 
                  onValueChange={(value: "admin" | "user") => setRoleChangeData({...roleChangeData, newRole: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Reason for Change (Optional)</Label>
                <Textarea
                  placeholder="Enter reason for role change..."
                  value={roleChangeData.reason}
                  onChange={(e) => setRoleChangeData({...roleChangeData, reason: e.target.value})}
                  rows={3}
                />
              </div>

              {roleChangeData.newRole !== roleChangeData.currentRole && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> Changing user roles will immediately affect their system permissions. 
                    {roleChangeData.newRole === 'admin' 
                      ? ' This user will gain full administrative access to the system.'
                      : ' This user will lose administrative privileges.'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleChangeDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmRoleChange}
                disabled={roleChangeData.newRole === roleChangeData.currentRole}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Shield className="h-4 w-4 mr-2" />
                Change Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}