import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Package,
  AlertTriangle,
  Settings,
  LogOut,
  ClipboardList,
  ShoppingBag,
  Shield,
  User,
  DollarSign,
  BarChart3,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimePermissions } from "@/hooks/useRealtimePermissions";
import { Button } from "@/components/ui/button";
import { getUserRoleDisplay, isAdmin } from "@/utils/permissions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// All available menu items with permission requirements
const allMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, requiredFeature: "dashboard" },
  { title: "Services", url: "/services", icon: ClipboardList, requiredFeature: "services" },
  { title: "Customers", url: "/customers", icon: Users, requiredFeature: "customers" },
  { title: "Workers", url: "/workers", icon: UserCheck, requiredFeature: "workers" },
  { title: "Inventory", url: "/inventory", icon: Package, requiredFeature: "inventory" },
  { title: "Alerts", url: "/alerts", icon: AlertTriangle, requiredFeature: "alerts" },
];

const adminItems = [
  { title: "Admin Management", url: "/admin", icon: Shield, requiredRole: "admin" },
  { title: "Worker Payroll", url: "/worker-payroll", icon: DollarSign, requiredFeature: "workers" },
  { title: "Financial Analytics", url: "/financial-analytics", icon: BarChart3, requiredFeature: "reports" },
  { title: "Settings", url: "/settings", icon: Settings, requiredFeature: "settings" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, signOut, isSigningOut } = useAuth();
  const { canAccess, isAdmin: hasAdminAccess, isBanned } = useRealtimePermissions();
  const currentPath = location.pathname;

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      signOut();
    }
  };

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => {
    if (item.requiredFeature) {
      return canAccess(item.requiredFeature);
    }
    return true;
  });

  // Filter admin items based on permissions
  const filteredAdminItems = adminItems.filter(item => {
    if (item.requiredRole === 'admin') {
      return hasAdminAccess;
    }
    if (item.requiredFeature) {
      return canAccess(item.requiredFeature);
    }
    return true;
  });

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50";

  return (
    <Sidebar
      collapsible="icon"
    >
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        {/* User Profile Section */}
        {profile && (
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isAdmin(profile) ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                {isAdmin(profile) ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile.full_name}
                </p>
                <p className="text-xs text-sidebar-muted-foreground">
                  {getUserRoleDisplay(profile)}
                </p>
              </div>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Salon Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className={({ isActive }) => getNavCls({ isActive })}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filteredAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        className={({ isActive }) => getNavCls({ isActive })}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="mt-auto p-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningOut ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  <span className="ml-2">
                    {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sign out of your account</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}