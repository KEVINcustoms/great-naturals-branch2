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
  Scissors,
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
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, color: "from-indigo-500 to-purple-500" },
  { title: "Services", url: "/services", icon: ClipboardList, color: "from-blue-500 to-cyan-500" },
  { title: "Products", url: "/products", icon: ShoppingBag, color: "from-rose-500 to-pink-500" },
  { title: "Customers", url: "/customers", icon: Users, color: "from-purple-500 to-pink-500" },
  { title: "Workers", url: "/workers", icon: UserCheck, color: "from-emerald-500 to-teal-500" },
  { title: "Inventory", url: "/inventory", icon: Package, color: "from-green-500 to-emerald-500" },
  { title: "Alerts", url: "/alerts", icon: AlertTriangle, color: "from-amber-500 to-orange-500" },
];

const adminItems = [
  { title: "Settings", url: "/settings", icon: Settings, color: "from-indigo-500 to-purple-500" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }, color: string) =>
    isActive 
      ? `bg-gradient-to-r ${color} text-white font-medium shadow-lg` 
      : "hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 text-gray-700 hover:text-gray-900";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-gray-200 bg-gradient-to-b from-white to-gray-50/50"
    >
      <SidebarTrigger className="m-2 self-end hover:bg-gray-100 rounded-lg p-1 transition-colors" />

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-600 font-semibold text-sm uppercase tracking-wider px-4 mb-2">
            Salon Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className={({ isActive }) => getNavCls({ isActive }, item.color)}
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

        {profile?.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-600 font-semibold text-sm uppercase tracking-wider px-4 mb-2">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        className={({ isActive }) => getNavCls({ isActive }, item.color)}
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

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button
                    variant="ghost"
                    onClick={signOut}
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Sign Out</span>
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}