import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AuthPage } from "@/components/auth/AuthPage";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import Customers from "./pages/Customers";
import Workers from "./pages/Workers";
import Inventory from "./pages/Inventory";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { AccessDenied } from "./components/ui/AccessDenied";
import AdminManagement from "./pages/AdminManagement";
import { EmailConfirmation } from "./components/auth/EmailConfirmation";
import { Profile } from "@/hooks/useAuth";
import { isAdmin } from "@/utils/permissions";
import { AccessControl } from "@/components/ui/AccessControl";
import WorkerPayroll from "./pages/WorkerPayroll";
import FinancialAnalytics from "./pages/FinancialAnalytics";

const queryClient = new QueryClient();

// Protected Route Component for Admin-only access
function AdminRoute({ children, profile }: { children: React.ReactNode; profile: Profile | null }) {
  if (!isAdmin(profile)) {
    return <AccessDenied 
      title="Admin Access Required"
      description="This section is only available to administrators. Regular users can manage services, customers, and inventory."
    />;
  }
  return <>{children}</>;
}

function AppContent() {
  const { user, profile, isLoading } = useAuth();

  // Show loading spinner while authentication is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, show login page
  if (!user) {
    return <AuthPage />;
  }

  // If user exists but no profile yet, keep showing loading until ensured
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparing your account...</p>
        </div>
      </div>
    );
  }

  // User and profile exist, show main app with access control
  return (
    <AccessControl profile={profile}>
      <AppLayout>
        <Routes>
          {/* Admin-only routes */}
          <Route path="/" element={
            <AdminRoute profile={profile}>
              <Dashboard />
            </AdminRoute>
          } />
          <Route path="/workers" element={
            <AdminRoute profile={profile}>
              <Workers />
            </AdminRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute profile={profile}>
              <AdminManagement />
            </AdminRoute>
          } />
          <Route path="/worker-payroll" element={
            <AdminRoute profile={profile}>
              <WorkerPayroll />
            </AdminRoute>
          } />
          <Route path="/financial-analytics" element={
            <AdminRoute profile={profile}>
              <FinancialAnalytics />
            </AdminRoute>
          } />
          <Route path="/settings" element={
            <AdminRoute profile={profile}>
              <Settings />
            </AdminRoute>
          } />
          
          {/* User-accessible routes */}
          <Route path="/services" element={<Services />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/alerts" element={<Alerts />} />
          
          {/* Redirect root to services for non-admin users */}
          <Route path="/dashboard" element={<Navigate to="/services" replace />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </AccessControl>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            {/* Public routes that don't require authentication */}
            <Route path="/auth/confirm" element={<EmailConfirmation />} />
            
            {/* Protected routes */}
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
