import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NotificationBadge } from "./NotificationBadge";
import { useAuth } from "@/hooks/useAuth";
import { useInventoryAlerts } from "@/hooks/useInventoryAlerts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile } = useAuth();
  
  // Initialize automated inventory alerts
  useInventoryAlerts();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b bg-background px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="font-semibold text-lg hidden sm:block">
                Salon Management System
              </h1>
            </div>
            
            {profile && (
              <div className="flex items-center gap-3">
                <NotificationBadge />
                <Card className="px-3 py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{profile.full_name}</span>
                    <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                      {profile.role}
                    </Badge>
                  </div>
                </Card>
              </div>
            )}
          </header>

          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}