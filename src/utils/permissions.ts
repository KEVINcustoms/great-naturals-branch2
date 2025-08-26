import { Profile } from "@/hooks/useAuth";

/**
 * Check if a user has admin permissions
 * @param profile - User profile object
 * @returns boolean indicating if user is admin
 */
export const isAdmin = (profile: Profile | null): boolean => {
  return profile?.role === 'admin';
};

/**
 * Check if a user has user permissions (non-admin)
 * @param profile - User profile object
 * @returns boolean indicating if user is regular user
 */
export const isUser = (profile: Profile | null): boolean => {
  return profile?.role === 'user';
};

/**
 * Check if a user can perform admin actions
 * @param profile - User profile object
 * @returns boolean indicating if user can perform admin actions
 */
export const canPerformAdminAction = (profile: Profile | null): boolean => {
  return isAdmin(profile);
};

/**
 * Check if a user can view admin-only content
 * @param profile - User profile object
 * @returns boolean indicating if user can view admin content
 */
export const canViewAdminContent = (profile: Profile | null): boolean => {
  return isAdmin(profile);
};

/**
 * Get user role display name
 * @param profile - User profile object
 * @returns string representation of user role
 */
export const getUserRoleDisplay = (profile: Profile | null): string => {
  if (!profile) return 'Unknown';
  return profile.role === 'admin' ? 'Administrator' : 'User';
};

/**
 * Check if user can access a specific feature based on role
 * @param profile - User profile object
 * @param feature - Feature name to check
 * @returns boolean indicating if user can access the feature
 */
export const canAccessFeature = (profile: Profile | null, feature: string): boolean => {
  if (!profile) return false;
  
  // Define feature permissions
  const featurePermissions: Record<string, string[]> = {
    // Admin-only features
    'dashboard': ['admin'],
    'workers_management': ['admin'],
    'system_settings': ['admin'],
    'user_management': ['admin'],
    
    // User-accessible features
    'services': ['admin', 'user'],
    'customers': ['admin', 'user'],
    'inventory': ['admin', 'user'],
    'alerts': ['admin', 'user'],
    'reports': ['admin', 'user'],
    'basic_operations': ['admin', 'user'],
    
    // Data access permissions (hybrid approach)
    'view_all_customers': ['admin', 'user'],        // ✅ All users can see all customers
    'view_own_services': ['admin', 'user'],         // ✅ Users can see their own services
    'view_all_services': ['admin'],                 // ❌ Only admins can see all services
    'view_own_service_products': ['admin', 'user'], // ✅ Users can see products for their own services
    'view_all_service_products': ['admin'],         // ❌ Only admins can see all service products
    'edit_all_customers': ['admin', 'user'],        // ✅ All users can edit any customer
    'edit_own_services': ['admin', 'user'],         // ✅ Users can edit their own services
    'edit_all_services': ['admin'],                 // ❌ Only admins can edit all services
  };
  
  const requiredRoles = featurePermissions[feature] || ['user'];
  return requiredRoles.includes(profile.role);
};

/**
 * Check if user can access dashboard
 * @param profile - User profile object
 * @returns boolean indicating if user can access dashboard
 */
export const canAccessDashboard = (profile: Profile | null): boolean => {
  return canAccessFeature(profile, 'dashboard');
};

/**
 * Check if user can manage workers
 * @param profile - User profile object
 * @returns boolean indicating if user can manage workers
 */
export const canManageWorkers = (profile: Profile | null): boolean => {
  return canAccessFeature(profile, 'workers_management');
};

/**
 * Check if user can manage services
 * @param profile - User profile object
 * @returns boolean indicating if user can manage services
 */
export const canManageServices = (profile: Profile | null): boolean => {
  return canAccessFeature(profile, 'services');
};

/**
 * Check if user can manage customers
 * @param profile - User profile object
 * @returns boolean indicating if user can manage customers
 */
export const canManageCustomers = (profile: Profile | null): boolean => {
  return canAccessFeature(profile, 'customers');
};



/**
 * Check if user can manage inventory
 * @param profile - User profile object
 * @returns boolean indicating if user can manage inventory
 */
export const canManageInventory = (profile: Profile | null): boolean => {
  return canAccessFeature(profile, 'inventory');
};

/**
 * Check if user can view all customer data (including from other users)
 * @param profile - User profile object
 * @returns boolean indicating if user can view all customer data
 */
export const canViewAllCustomers = (profile: Profile | null): boolean => {
  return canAccessFeature(profile, 'view_all_customers');
};

/**
 * Check if user can view their own services only
 * @param profile - User profile object
 * @returns boolean indicating if user can view their own services
 */
export const canViewOwnServices = (profile: Profile | null): boolean => {
  return canAccessFeature(profile, 'view_own_services');
};

/**
 * Check if user can view all service data (admin only)
 * @param profile - User profile object
 * @returns boolean indicating if user can view all service data
 */
export const canViewAllServices = (profile: Profile | null): boolean => {
  return canAccessFeature(profile, 'view_all_services');
};

/**
 * Check if user can view service products for their own services only
 * @param profile - User profile object
 * @returns boolean indicating if user can view their own service products
 */
export const canViewOwnServiceProducts = (profile: Profile | null): boolean => {
  return canAccessFeature(profile, 'view_own_service_products');
};

/**
 * Check if user can view all service products (admin only)
 * @param profile - User profile object
 * @returns boolean indicating if user can view all service products
 */
export const canViewAllServiceProducts = (profile: Profile | null): boolean => {
  return canAccessFeature(profile, 'view_all_service_products');
};

/**
 * Check if user can edit any customer data (including from other users)
 * @param profile - User profile object
 * @returns boolean indicating if user can edit any customer data
 */
export const canEditAnyCustomer = (profile: Profile | null): boolean => {
  return canAccessFeature(profile, 'edit_all_customers');
};

/**
 * Check if user can edit their own services only
 * @param profile - User profile object
 * @returns boolean indicating if user can edit their own services
 */
export const canEditOwnServices = (profile: Profile | null): boolean => {
  return canAccessFeature(profile, 'edit_own_services');
};

/**
 * Check if user can edit any service data (admin only)
 * @param profile - User profile object
 * @returns boolean indicating if user can edit any service data
 */
export const canEditAllServices = (profile: Profile | null): boolean => {
  return canAccessFeature(profile, 'edit_all_services');
};
