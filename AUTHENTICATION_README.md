# Authentication System Documentation

## Overview
The Great Naturals Salon Management System now includes a robust authentication system with email verification and role-based access control.

## Features

### 🔐 User Registration & Authentication
- **Email Verification Required**: New users must verify their email before accessing the system
- **Secure Password Requirements**: Minimum 6 characters with validation
- **Role-Based Access Control**: Admin and User roles with different permissions

### 🛡️ Security Features
- **Admin Email Restriction**: Only `devzoratech@gmail.com` can have admin privileges
- **Email Confirmation**: Prevents unauthorized access until email is verified
- **Session Management**: Secure session handling with Supabase
- **Row Level Security**: Database-level security policies
- **Hybrid Data Access**: Full customer collaboration with service privacy

## User Roles

### 👑 Administrator (`admin`)
- **Email**: `devzoratech@gmail.com` (reserved)
- **Permissions**:
  - Access to all system features
  - Dashboard access with analytics and overview
  - Workers management (staff scheduling, performance tracking)
  - System settings and configuration
  - User management capabilities
  - Full CRUD operations on all data
  - **Data Access**: Can see and manage ALL customer and service data

### 👤 Regular User (`user`)
- **Email**: Any email except `devzoratech@gmail.com`
- **Permissions**:
  - **Services Management**: Can create, edit, delete their own services only
  - **Customer Management**: Full access to manage ALL customer information
  - **Product Management**: Full access to manage salon products
  - **Inventory Management**: Full access to track inventory levels
  - **Alerts & Notifications**: Access to system alerts
  - **Data Access**: 
    - ✅ **ALL customer data** (including from other users)
    - ❌ **Only their own services** (restricted access)
    - ❌ **Only service products for their own services** (restricted access)
  - **No Access To**:
    - Dashboard (analytics and overview)
    - Workers management
    - System settings

## Access Control Matrix

| Feature | Admin | Regular User |
|---------|-------|--------------|
| Dashboard | ✅ Full Access | ❌ No Access |
| **Services** | ✅ Full Access | ✅ **Own Services Only** |
| **Customers** | ✅ Full Access | ✅ **Full Access** |
| Products | ✅ Full Access | ✅ Full Access |
| Inventory | ✅ Full Access | ✅ Full Access |
| Alerts | ✅ Full Access | ✅ Full Access |
| Workers | ✅ Full Access | ❌ No Access |
| Settings | ✅ Full Access | ❌ No Access |

## Data Access Permissions

### 🔓 **Full Customer Collaboration (All Users)**
- **Customer Data**: All users can view, edit, and manage ALL customer information
- **Customer History**: All users can see complete customer interaction history
- **Customer Preferences**: All users can access customer styling preferences and notes
- **Cross-User Access**: Users can see customers created by other staff members

### 🔒 **Service Privacy (User-Restricted)**
- **Service Data**: Users can only see services they created
- **Service Products**: Users can only see products for services they created
- **Service History**: Users can only see their own service records
- **Service Management**: Users can only edit/delete their own services

### 📊 **What This Means**
- **Customer Collaboration**: Multiple users can work on the same customer accounts
- **Service Privacy**: Users maintain privacy over their own service work
- **Team Coordination**: Staff can see all customer information for better service
- **Individual Accountability**: Users are responsible for their own service records
- **Admin Oversight**: Admins can see and manage all data for supervision

### 🎯 **Use Cases**
- **Receptionist**: Can see customer history from all stylists, but only their own appointments
- **Stylist**: Can see customer preferences set by receptionists, but only their own service records
- **Manager**: Can see all customer interactions and all services across the salon
- **New Staff**: Can immediately access all existing customer data for better service
- **Team Handoffs**: Staff can see complete customer context when taking over

## Authentication Flow

### 1. **User Registration**
```
User signs up → Email verification required → 
Role assigned (user) → Profile created → 
Access granted to user features
```

### 2. **Email Verification**
```
User clicks verification link → Email confirmed → 
Account activated → Can now log in
```

### 3. **User Login**
```
User enters credentials → System validates → 
Checks email verification → Creates session → 
Redirects to appropriate page based on role
```

### 4. **Role-Based Navigation**
```
Admin users → Redirected to Dashboard (/)
Regular users → Redirected to Services (/services)
```

## File Structure

```
src/
├── components/auth/
│   ├── AuthPage.tsx           # Main authentication page
│   ├── LoginForm.tsx          # Login form with verification handling
│   ├── SignUpForm.tsx         # Registration form with role restrictions
│   └── EmailConfirmation.tsx # Email verification confirmation page
├── components/ui/
│   └── AccessDenied.tsx      # Access denied component for restricted features
├── components/layout/
│   └── AppSidebar.tsx        # Navigation sidebar with role-based filtering
├── hooks/
│   └── useAuth.tsx           # Authentication context and logic
├── utils/
│   └── permissions.ts        # Permission checking utilities
└── App.tsx                   # Main app with route protection
```

## Key Components

### AuthProvider
- Manages authentication state
- Handles user sessions
- Provides user context to components
- Handles session management
- Ensures profile creation for new users

### AppSidebar
- Dynamically filters navigation items based on user role
- Shows user profile information
- Hides restricted features from non-admin users
- Provides clear visual indicators of user role

### AccessDenied Component
- Shows when users try to access restricted features
- Explains what features are available to regular users
- Provides navigation options to accessible features
- Professional and user-friendly error presentation

## Database Schema

### Profiles Table
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  role app_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Row Level Security (RLS)
- **Customers**: All authenticated users can see all customers
- **Services**: Users can only see their own services
- **Service Products**: Users can only see products for their own services
- **Admin Override**: Admins can see and manage all data

## Usage Examples

### Check User Permissions
```typescript
import { useAuth } from '@/hooks/useAuth';
import { canAccessFeature } from '@/utils/permissions';

function MyComponent() {
  const { profile } = useAuth();
  
  if (canAccessFeature(profile, 'reports')) {
    // Show reports
  }
}
```

### Protect Admin Routes
```typescript
import { isAdmin } from '@/utils/permissions';

function AdminOnlyComponent({ profile }) {
  if (!isAdmin(profile)) {
    return <AccessDenied title="Admin Access Required" />;
  }
  
  return <div>Admin content here</div>;
}
```

### Filter Navigation Items
```typescript
import { canManageWorkers } from '@/utils/permissions';

const menuItems = allMenuItems.filter(item => 
  !item.adminOnly || canManageWorkers(profile)
);
```

## Error Handling

### Common Scenarios
1. **Email Not Verified**: Clear message to check email
2. **Invalid Credentials**: Specific error messages
3. **Admin Email Attempt**: Clear restriction message
4. **Verification Failed**: Retry mechanism
5. **Access Denied**: Clear explanation of available features

### User Experience
- Clear error messages
- Helpful guidance for next steps
- Professional access denied screens

## Security Considerations

### Authentication Security
- Email verification required
- Secure password requirements
- Session management
- Input validation and sanitization
- Rate limiting on authentication attempts
- Route-level access control
- Component-level permission checks

### Data Protection
- Row Level Security (RLS)
- Role-based data access
- User isolation where appropriate
- Regular security audits
- Compliance with data protection regulations
- Role-based data access control

## Troubleshooting

### Common Issues
1. **Can't sign up**: Check email format and password requirements
2. **Can't log in**: Ensure email is verified first
3. **Login issues**: Ensure email is verified first
4. **Permission denied**: Check user role and feature access
5. **Can't see certain tabs**: Verify user role and permissions

### Support
1. Check email verification status
2. Verify user role assignment
3. Use resend verification if needed
4. Contact system administrator for role issues
5. Check available features based on their role

## Future Enhancements

### Planned Features
- Advanced user management
- Role customization
- Audit logging
- Multi-tenant support
- Social login integration
- Advanced role hierarchy system
- Custom permission sets

### Scalability
- Performance optimization
- Caching strategies
- API rate limiting
- Advanced security monitoring
- Feature-based access control
- Granular permissions per module
