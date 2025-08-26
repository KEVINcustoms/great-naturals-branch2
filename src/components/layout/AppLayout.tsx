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

          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
          
          {/* Footer with Professional Notice */}
          <footer className="bg-gray-50 border-t border-gray-200 py-6 px-6">
            <div className="container mx-auto">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">
                        <strong>Devzora Technologies</strong> - Active system maintenance and future updates
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-blue-600">
                    v1.0.0 • Powered by Devzora
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}