# 🔒 Security Implementation Example

This document shows how to implement the security measures in your existing forms.

## 📋 Before vs After Implementation

### ❌ Before (Vulnerable)
```typescript
// Current vulnerable implementation in Customers.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) return;

  try {
    const { error } = await supabase
      .from("customers")
      .insert({
        name: formData.name, // No validation - SQL injection risk
        email: formData.email, // No validation - XSS risk
        phone: formData.phone, // No validation - injection risk
        hair_type: formData.hair_type,
        style_preference: formData.style_preference,
        notes: formData.notes,
        created_by: user.id,
      });
  } catch (error) {
    // Basic error handling
  }
};
```

### ✅ After (Secure)
```typescript
// Secure implementation with validation
import { customerValidation, secureFormSubmit } from '@/utils/validation';
import { logSecurityEvent } from '@/utils/security';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) return;

  try {
    // Use secure form submission wrapper
    await secureFormSubmit(
      customerValidation,
      formData,
      async (validatedData) => {
        const { error } = await supabase
          .from("customers")
          .insert({
            name: validatedData.name, // Validated and sanitized
            email: validatedData.email || null,
            phone: validatedData.phone || null,
            hair_type: validatedData.hair_type || null,
            style_preference: validatedData.style_preference || null,
            notes: validatedData.notes || null,
            created_by: user.id,
          });
        
        if (error) throw error;
        return { success: true };
      },
      user.id
    );

    toast({ title: "Success", description: "Customer created successfully" });
    setIsDialogOpen(false);
    setFormData({ name: "", email: "", phone: "", hair_type: "", style_preference: "", notes: "" });
    fetchCustomers();
  } catch (error) {
    console.error("Error saving customer:", error);
    toast({
      title: "Error",
      description: error.message || "Failed to save customer",
      variant: "destructive",
    });
  }
};
```

## 🛠️ Step-by-Step Implementation

### Step 1: Install Dependencies
```bash
npm install zod
```

### Step 2: Update Form Components

#### Customer Form (Customers.tsx)
```typescript
// Add imports
import { customerValidation, CustomerFormData } from '@/utils/validation';
import { secureFormSubmit, secureInput } from '@/utils/security';

// Update form data type
const [formData, setFormData] = useState<CustomerFormData>({
  name: "",
  email: "",
  phone: "",
  hair_type: "",
  style_preference: "",
  notes: "",
});

// Update input handlers with sanitization
const handleInputChange = (field: keyof CustomerFormData, value: string) => {
  let sanitizedValue = value;
  
  switch (field) {
    case 'name':
      sanitizedValue = secureInput.string(value);
      break;
    case 'email':
      sanitizedValue = secureInput.email(value);
      break;
    case 'phone':
      sanitizedValue = secureInput.phone(value);
      break;
    default:
      sanitizedValue = secureInput.string(value);
  }
  
  setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
};

// Update form inputs
<Input
  id="name"
  value={formData.name}
  onChange={(e) => handleInputChange('name', e.target.value)}
  required
  className="border-gray-200 focus:border-purple-400 focus:ring-purple-400"
/>
```

#### Worker Form (Workers.tsx)
```typescript
// Add imports
import { workerValidation, WorkerFormData } from '@/utils/validation';
import { secureFormSubmit, secureInput } from '@/utils/security';

// Update form data type
const [formData, setFormData] = useState<WorkerFormData>({
  name: "",
  email: "",
  phone: "",
  role: "",
  salary: 0,
  payment_type: 'monthly',
  commission_rate: 6,
  payment_status: "pending",
  hire_date: "",
});

// Update submit handler
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) return;

  try {
    await secureFormSubmit(
      workerValidation,
      formData,
      async (validatedData) => {
        const { error } = await supabase
          .from("workers")
          .insert({
            name: validatedData.name,
            email: validatedData.email || null,
            phone: validatedData.phone || null,
            role: validatedData.role,
            salary: validatedData.salary || 0,
            payment_type: validatedData.payment_type,
            commission_rate: validatedData.commission_rate || 0,
            payment_status: validatedData.payment_status,
            hire_date: validatedData.hire_date,
            created_by: user.id,
          });
        
        if (error) throw error;
        return { success: true };
      },
      user.id
    );

    toast({ title: "Success", description: "Worker created successfully" });
    // ... rest of success handling
  } catch (error) {
    toast({
      title: "Error",
      description: error.message || "Failed to save worker",
      variant: "destructive",
    });
  }
};
```

### Step 3: Add Security Headers

#### Create security headers configuration
```typescript
// src/utils/headers.ts
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https:;
    connect-src 'self' https://*.supabase.co;
    font-src 'self' https://fonts.gstatic.com;
  `.replace(/\s+/g, ' ').trim()
};
```

### Step 4: Initialize Security

#### Update App.tsx
```typescript
// Add to App.tsx
import { initializeSecurity } from '@/utils/security';

function App() {
  useEffect(() => {
    // Initialize security measures
    initializeSecurity();
  }, []);

  // ... rest of your app
}
```

### Step 5: Add Rate Limiting

#### Create rate limiting hook
```typescript
// src/hooks/useRateLimit.ts
import { useState, useCallback } from 'react';
import { rateLimiter } from '@/utils/security';

export const useRateLimit = (userId: string) => {
  const [isLimited, setIsLimited] = useState(false);

  const checkRateLimit = useCallback(() => {
    const allowed = rateLimiter.isAllowed(userId);
    setIsLimited(!allowed);
    return allowed;
  }, [userId]);

  const getRemainingRequests = useCallback(() => {
    return rateLimiter.getRemainingRequests(userId);
  }, [userId]);

  return {
    isLimited,
    checkRateLimit,
    getRemainingRequests
  };
};
```

## 🔍 Security Testing

### Test SQL Injection Protection
```typescript
// Test malicious input
const maliciousInput = {
  name: "'; DROP TABLE customers; --",
  email: "test@test.com",
  phone: "1234567890"
};

// This should be sanitized and rejected by validation
try {
  const validated = customerValidation.parse(maliciousInput);
  console.log('Validation passed:', validated);
} catch (error) {
  console.log('Validation blocked malicious input:', error.message);
}
```

### Test XSS Protection
```typescript
// Test XSS input
const xssInput = {
  name: "<script>alert('XSS')</script>",
  email: "test@test.com",
  phone: "1234567890"
};

// This should be sanitized
const sanitized = secureInput.string(xssInput.name);
console.log('Sanitized name:', sanitized); // Should not contain script tags
```

## 📊 Security Monitoring

### Add Security Dashboard
```typescript
// src/components/SecurityDashboard.tsx
import { useState, useEffect } from 'react';

export const SecurityDashboard = () => {
  const [securityEvents, setSecurityEvents] = useState([]);

  useEffect(() => {
    // Fetch security events from your monitoring system
    // This is a placeholder - implement based on your monitoring solution
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Security Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-100 p-4 rounded-lg">
          <h3 className="font-semibold text-red-800">Failed Logins</h3>
          <p className="text-2xl font-bold text-red-600">0</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-800">Rate Limit Hits</h3>
          <p className="text-2xl font-bold text-yellow-600">0</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Security Score</h3>
          <p className="text-2xl font-bold text-green-600">95%</p>
        </div>
      </div>
    </div>
  );
};
```

## 🚨 Emergency Response

### Security Incident Response Plan
1. **Immediate Response**:
   - Disable affected accounts
   - Block suspicious IP addresses
   - Review security logs

2. **Investigation**:
   - Analyze attack vectors
   - Determine scope of breach
   - Document findings

3. **Recovery**:
   - Patch vulnerabilities
   - Update security measures
   - Notify affected users

4. **Prevention**:
   - Review security policies
   - Update training materials
   - Implement additional safeguards

## 📈 Security Metrics

### Key Performance Indicators
- **Failed Login Attempts**: Track and alert on suspicious activity
- **Rate Limit Violations**: Monitor for potential attacks
- **Input Validation Failures**: Track malicious input attempts
- **Session Timeouts**: Monitor for unusual session patterns
- **CSP Violations**: Track content security policy violations

## 🎯 Implementation Priority

### High Priority (Implement First)
1. ✅ Input validation with Zod
2. ✅ Input sanitization
3. ✅ Security logging
4. ✅ Rate limiting

### Medium Priority
1. 🔄 Content Security Policy
2. 🔄 Security headers
3. 🔄 Session management improvements
4. 🔄 Password strength requirements

### Low Priority (Future Enhancements)
1. 🔄 Two-factor authentication
2. 🔄 Advanced threat detection
3. 🔄 Security dashboard
4. 🔄 Automated security testing

---

*This implementation example provides a solid foundation for securing your salon management system. Start with the high-priority items and gradually implement the remaining security measures.*


