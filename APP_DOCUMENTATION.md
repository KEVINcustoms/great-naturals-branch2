# Great Naturals Salon Management System

## 📋 Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [System Requirements](#system-requirements)
4. [Installation & Setup](#installation--setup)
5. [User Management](#user-management)
6. [Core Modules](#core-modules)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Security & Permissions](#security--permissions)
10. [Troubleshooting](#troubleshooting)
11. [Future Updates](#future-updates)
12. [Support & Contact](#support--contact)

---

## 🎯 Overview

**Great Naturals Salon Management System** is a comprehensive web-based application designed to streamline salon operations, manage customer relationships, track inventory, and handle service bookings. Built with modern web technologies, it provides an intuitive interface for salon staff and administrators to manage daily operations efficiently.

### Key Benefits
- **Centralized Management**: All salon operations in one platform
- **Real-time Updates**: Live data synchronization across all users
- **Role-based Access**: Secure access control for different user types
- **Mobile Responsive**: Works seamlessly on all devices
- **Professional UI/UX**: Modern, intuitive interface design

---

## ✨ Features

### 🔐 Authentication & User Management
- **Secure Login/Logout**: Email-based authentication with Supabase
- **User Registration**: New user signup with email verification
- **Role-based Access**: Admin and regular user permissions
- **Profile Management**: User profile customization and settings

### 👥 Customer Management
- **Customer Database**: Comprehensive customer information storage
- **Contact Details**: Email, phone, and address management
- **Service History**: Track all services provided to each customer
- **Preferences**: Store hair type, style preferences, and notes
- **Shared Access**: All users can view and manage customer data

### 💇‍♀️ Service Management
- **Service Catalog**: Create and manage service offerings
- **Pricing**: Set and update service prices
- **Categories**: Organize services by type (hair care, styling, etc.)
- **Service Records**: Track completed services with timestamps
- **Receipt Generation**: Professional receipts for customers

### 📦 Inventory Management
- **Stock Tracking**: Monitor inventory levels in real-time
- **Low Stock Alerts**: Automatic notifications for reordering
- **Transaction History**: Track all stock movements
- **Supplier Management**: Store supplier information
- **Expiry Tracking**: Monitor product expiration dates

### 👷‍♀️ Staff Management (Admin Only)
- **Worker Profiles**: Manage salon staff information
- **Performance Tracking**: Monitor staff productivity
- **Access Control**: Manage staff permissions

### 📊 Dashboard & Analytics
- **Real-time Statistics**: Live updates of key metrics
- **Revenue Tracking**: Daily revenue calculations
- **Customer Analytics**: Customer growth and service trends
- **Inventory Insights**: Stock value and movement analysis

### 🔔 Alert System
- **Low Stock Notifications**: Automatic alerts for inventory
- **System Alerts**: Important system notifications
- **Real-time Updates**: Instant notification delivery

---

## 🖥️ System Requirements

### Frontend
- **Browser**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **JavaScript**: ES6+ support required
- **Screen Resolution**: Minimum 1024x768 (responsive design)

### Backend
- **Supabase Account**: Required for database and authentication
- **Internet Connection**: Required for real-time features

### Development
- **Node.js**: Version 16.0 or higher
- **npm/yarn**: Package manager
- **Git**: Version control system

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd groom-stream-ops
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup
Run the following SQL scripts in your Supabase SQL Editor:

#### Create Profiles Table
```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  access_level TEXT DEFAULT 'full' CHECK (access_level IN ('full', 'restricted', 'banned'))
);
```

#### Create Customers Table
```sql
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  hair_type TEXT,
  style_preference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);
```

#### Create Services Table
```sql
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_category TEXT,
  service_price DECIMAL(10,2) NOT NULL,
  staff_member_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending',
  date_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);
```

#### Create Inventory Tables
```sql
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  current_stock INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 10,
  max_stock_level INTEGER DEFAULT 100,
  unit_price DECIMAL(10,2) NOT NULL,
  expiry_date DATE,
  supplier TEXT,
  barcode TEXT,
  category_id UUID REFERENCES inventory_categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT CHECK (transaction_type IN ('stock_in', 'stock_out', 'adjustment')),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  reason TEXT,
  reference_number TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);
```

#### Create Service Products Table
```sql
CREATE TABLE IF NOT EXISTS service_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price_per_unit DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Create Alerts Table
```sql
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Start Development Server
```bash
npm run dev
# or
yarn dev
```

### 6. Access the Application
Open your browser and navigate to `http://localhost:3000`

---

## 👤 User Management

### User Roles

#### Admin Users
- **Full Access**: All features and data
- **User Management**: Create, edit, and manage user accounts
- **System Settings**: Configure application settings
- **Analytics**: Access to comprehensive reports and analytics
- **Staff Management**: Manage salon workers and their permissions

#### Regular Users
- **Service Management**: Create and manage services
- **Customer Management**: Full access to customer data
- **Inventory Access**: View and manage inventory items
- **Basic Reports**: Access to basic operational data

### Access Control
- **Row Level Security (RLS)**: Database-level security policies
- **Feature-based Permissions**: Role-specific feature access
- **Data Isolation**: Users can only access authorized data
- **Session Management**: Secure authentication and logout

---

## 🏗️ Core Modules

### 1. Authentication Module
**File**: `src/hooks/useAuth.tsx`
- **Purpose**: Handle user authentication and session management
- **Features**: Login, logout, profile management, access control
- **Security**: JWT tokens, secure session handling

### 2. Dashboard Module
**File**: `src/pages/Dashboard.tsx`
- **Purpose**: Main application overview and statistics
- **Features**: Real-time metrics, recent activities, quick actions
- **Updates**: Live data synchronization

### 3. Customer Management Module
**File**: `src/pages/Customers.tsx`
- **Purpose**: Manage customer database and relationships
- **Features**: Add, edit, delete customers, service history
- **Search**: Advanced customer search and filtering

### 4. Service Management Module
**File**: `src/pages/Services.tsx`
- **Purpose**: Create and manage salon services
- **Features**: Service creation, product association, pricing
- **Integration**: Links services with customers and inventory

### 5. Inventory Management Module
**File**: `src/pages/Inventory.tsx`
- **Purpose**: Track inventory levels and transactions
- **Features**: Stock management, low stock alerts, transaction history
- **Reports**: Inventory value and movement analytics

### 6. Admin Management Module
**File**: `src/pages/AdminManagement.tsx`
- **Purpose**: User management and system administration
- **Features**: User access control, performance monitoring, system settings
- **Security**: Admin-only access with comprehensive controls

---

## 🗄️ Database Schema

### Core Tables

#### Profiles
- **id**: Unique identifier
- **user_id**: Reference to auth.users
- **email**: User email address
- **full_name**: User's full name
- **role**: User role (admin/user)
- **is_active**: Account status
- **access_level**: Permission level

#### Customers
- **id**: Unique identifier
- **name**: Customer name
- **email**: Customer email
- **phone**: Contact number
- **hair_type**: Hair characteristics
- **style_preference**: Style preferences
- **created_by**: User who created the record

#### Services
- **id**: Unique identifier
- **customer_id**: Reference to customer
- **service_name**: Service description
- **service_category**: Service type
- **service_price**: Service cost
- **status**: Service status
- **date_time**: Service date/time
- **created_by**: User who created the service

#### Inventory Items
- **id**: Unique identifier
- **name**: Product name
- **current_stock**: Available quantity
- **min_stock_level**: Reorder threshold
- **max_stock_level**: Maximum stock capacity
- **unit_price**: Price per unit
- **supplier**: Supplier information
- **category_id**: Product category

### Relationships
- **One-to-Many**: Customer → Services
- **Many-to-Many**: Services ↔ Inventory Items (via service_products)
- **One-to-Many**: User → Created Records
- **Hierarchical**: Categories → Items

---

## 🔌 API Endpoints

### Authentication Endpoints
- **POST** `/auth/signin` - User login
- **POST** `/auth/signup` - User registration
- **POST** `/auth/signout` - User logout
- **GET** `/auth/profile` - Get user profile

### Data Endpoints
- **GET** `/api/customers` - Fetch customers
- **POST** `/api/customers` - Create customer
- **PUT** `/api/customers/:id` - Update customer
- **DELETE** `/api/customers/:id` - Delete customer

- **GET** `/api/services` - Fetch services
- **POST** `/api/services` - Create service
- **PUT** `/api/services/:id` - Update service
- **DELETE** `/api/services/:id` - Delete service

- **GET** `/api/inventory` - Fetch inventory items
- **POST** `/api/inventory` - Create inventory item
- **PUT** `/api/inventory/:id` - Update inventory item
- **DELETE** `/api/inventory/:id` - Delete inventory item

### Real-time Subscriptions
- **Customers**: Live updates for customer changes
- **Services**: Real-time service updates
- **Inventory**: Live stock level changes
- **Alerts**: Instant notification delivery

---

## 🔒 Security & Permissions

### Authentication Security
- **JWT Tokens**: Secure session management
- **Email Verification**: Required for new accounts
- **Password Policies**: Strong password requirements
- **Session Timeout**: Automatic session expiration

### Data Security
- **Row Level Security (RLS)**: Database-level access control
- **Input Validation**: Sanitized user inputs
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: Content Security Policy

### Access Control
- **Role-based Access**: Admin and user permissions
- **Feature Restrictions**: Role-specific feature access
- **Data Isolation**: User data separation
- **Audit Logging**: Track all user actions

---

## 🛠️ Troubleshooting

### Common Issues

#### 1. Authentication Problems
**Problem**: User can't log in
**Solution**: 
- Check email verification status
- Verify Supabase credentials
- Clear browser cache and cookies
- Check network connectivity

#### 2. Database Connection Issues
**Problem**: Data not loading
**Solution**:
- Verify Supabase URL and keys
- Check database permissions
- Verify RLS policies
- Check network connectivity

#### 3. Real-time Updates Not Working
**Problem**: Live updates not functioning
**Solution**:
- Check WebSocket connection
- Verify Supabase realtime settings
- Check browser console for errors
- Refresh the application

#### 4. Permission Errors
**Problem**: Access denied to features
**Solution**:
- Verify user role and permissions
- Check access level settings
- Contact administrator for access
- Verify user account status

### Error Codes
- **401**: Unauthorized access
- **403**: Forbidden (insufficient permissions)
- **404**: Resource not found
- **500**: Internal server error
- **PGRST116**: Database record not found

### Debug Mode
Enable debug logging by setting environment variables:
```env
NEXT_PUBLIC_DEBUG=true
NEXT_PUBLIC_LOG_LEVEL=debug
```

---

## 🚀 Future Updates

### Planned Features
- **Appointment Scheduling**: Advanced booking system
- **Payment Integration**: Online payment processing
- **Customer Portal**: Self-service customer interface
- **Advanced Analytics**: Comprehensive reporting dashboard
- **Mobile App**: Native mobile applications
- **Multi-location Support**: Chain salon management
- **Inventory Automation**: Automatic reordering system
- **Customer Communication**: SMS and email notifications

### Development Roadmap
- **Phase 1**: Core functionality (Current)
- **Phase 2**: Advanced features and integrations
- **Phase 3**: Mobile applications and APIs
- **Phase 4**: Enterprise features and scaling

### Feature Requests
Submit feature requests through:
- **GitHub Issues**: Technical feature requests
- **Support Portal**: User experience improvements
- **Direct Contact**: Priority feature development

---

## 📞 Support & Contact

### Technical Support
- **Email**: support@devzoratech.com
- **Documentation**: This file and inline code comments
- **GitHub**: Repository issues and discussions
- **Developer Portal**: Supabase documentation and support

### Development Team
- **Company**: Devzora Technologies
- **Website**: https://devzoratech.com
- **Email**: info@devzoratech.com
- **Support Hours**: Monday - Friday, 9:00 AM - 6:00 PM EST

### Getting Help
1. **Check Documentation**: Review this file and inline comments
2. **Search Issues**: Look for similar problems in GitHub
3. **Contact Support**: Reach out to the development team
4. **Community**: Join user forums and discussions

---

## 📝 License & Legal

### Software License
This application is proprietary software developed by Devzora Technologies.

### Usage Terms
- **Internal Use**: Licensed for salon business operations
- **Modifications**: Customization allowed with proper attribution
- **Distribution**: Redistribution not permitted without license
- **Support**: Technical support included with license

### Data Privacy
- **Customer Data**: Protected under data privacy regulations
- **User Information**: Secure storage and access control
- **Compliance**: GDPR and local privacy law compliance
- **Backup**: Regular data backup and recovery procedures

---

## 🔄 Version History

### Current Version: 1.0.0
- **Initial Release**: Core salon management features
- **User Management**: Authentication and role-based access
- **Customer Management**: Comprehensive customer database
- **Service Management**: Service creation and tracking
- **Inventory Management**: Stock tracking and alerts
- **Dashboard**: Real-time analytics and reporting

### Previous Versions
- **Beta 0.9.0**: Feature testing and user feedback
- **Alpha 0.8.0**: Core functionality development
- **Prototype 0.7.0**: Initial concept and design

---

*Last Updated: December 2024*
*Documentation Version: 1.0.0*
*Maintained by: Devzora Technologies*
