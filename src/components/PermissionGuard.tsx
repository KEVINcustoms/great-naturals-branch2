import { ReactNode } from 'react';
import { useRealtimePermissions } from '@/hooks/useRealtimePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock, AlertTriangle, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface PermissionGuardProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'user';
  requiredAccess?: 'full' | 'restricted' | 'banned';
  requiredFeature?: string;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
}

export function PermissionGuard({
  children,
  requiredRole,
  requiredAccess,
  requiredFeature,
  fallback,
  showAccessDenied = true
}: PermissionGuardProps) {
  const { permissions, isLoading, isAdmin, hasFullAccess, isBanned, canAccess } = useRealtimePermissions();
  const { signOut } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user is banned or inactive
  if (isBanned) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-red-900">Account Suspended</CardTitle>
          <CardDescription className="text-red-700">
            Your account has been suspended or banned. Please contact an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={signOut} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Check role requirement
  if (requiredRole && permissions?.role !== requiredRole) {
    if (requiredRole === 'admin' && !isAdmin) {
      return showAccessDenied ? (
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-blue-900">Admin Access Required</CardTitle>
            <CardDescription className="text-blue-700">
              This section requires administrator privileges.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : fallback || null;
    }
  }

  // Check access level requirement
  if (requiredAccess && permissions?.access_level !== requiredAccess) {
    if (requiredAccess === 'full' && !hasFullAccess) {
      return showAccessDenied ? (
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Lock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <CardTitle className="text-yellow-900">Access Restricted</CardTitle>
            <CardDescription className="text-yellow-700">
              You don't have the required access level to view this content.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : fallback || null;
    }
  }

  // Check feature access
  if (requiredFeature && !canAccess(requiredFeature)) {
    return showAccessDenied ? (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-orange-100 rounded-full">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-orange-900">Feature Not Available</CardTitle>
          <CardDescription className="text-orange-700">
            You don't have permission to access this feature. Please contact an administrator.
          </CardDescription>
        </CardHeader>
      </Card>
    ) : fallback || null;
  }

  // All checks passed, render children
  return <>{children}</>;
}

// Higher-order component for easier usage
export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<PermissionGuardProps, 'children'>
) {
  return function GuardedComponent(props: P) {
    return (
      <PermissionGuard {...guardProps}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}
