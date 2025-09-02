import { z } from 'zod';

// Customer validation schema
export const customerValidation = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Name can only contain letters, spaces, hyphens, apostrophes, and periods"),
  email: z.string()
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  phone: z.string()
    .regex(/^[\+]?[\d\s\-\(\)]{7,20}$/, "Invalid phone number format")
    .max(20, "Phone number must be less than 20 characters")
    .optional()
    .or(z.literal("")),
  hair_type: z.string()
    .max(50, "Hair type must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Hair type can only contain letters and spaces")
    .optional()
    .or(z.literal("")),
  style_preference: z.string()
    .max(100, "Style preference must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  notes: z.string()
    .max(500, "Notes must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});

// Worker validation schema
export const workerValidation = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Name can only contain letters, spaces, hyphens, apostrophes, and periods"),
  email: z.string()
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  phone: z.string()
    .regex(/^[\+]?[\d\s\-\(\)]{7,20}$/, "Invalid phone number format")
    .max(20, "Phone number must be less than 20 characters")
    .optional()
    .or(z.literal("")),
  role: z.string()
    .min(1, "Role is required")
    .max(50, "Role must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Role can only contain letters and spaces"),
  salary: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseFloat(val) || 0 : val)
    .refine((val) => val >= 0, "Salary must be positive")
    .refine((val) => val <= 999999.99, "Salary must be less than 1,000,000")
    .optional(),
  payment_type: z.enum(['monthly', 'commission'], {
    errorMap: () => ({ message: "Payment type must be either 'monthly' or 'commission'" })
  }),
  commission_rate: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseFloat(val) || 0 : val)
    .refine((val) => val >= 0, "Commission rate must be positive")
    .refine((val) => val <= 100, "Commission rate cannot exceed 100%")
    .optional(),
  payment_status: z.enum(['pending', 'paid', 'overdue'], {
    errorMap: () => ({ message: "Payment status must be 'pending', 'paid', or 'overdue'" })
  }),
  hire_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .refine((date) => {
      const hireDate = new Date(date);
      const today = new Date();
      return hireDate <= today;
    }, "Hire date cannot be in the future"),
});

// Service validation schema
export const serviceValidation = z.object({
  service_name: z.string()
    .min(1, "Service name is required")
    .max(100, "Service name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-&]+$/, "Service name can only contain letters, spaces, hyphens, and ampersands"),
  service_category: z.string()
    .min(1, "Service category is required")
    .max(50, "Service category must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Service category can only contain letters and spaces"),
  service_price: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseFloat(val) || 0 : val)
    .refine((val) => val >= 0.01, "Service price must be greater than 0")
    .refine((val) => val <= 9999.99, "Service price must be less than 10,000"),
  customer_id: z.string()
    .uuid("Invalid customer ID format"),
  staff_member_id: z.string()
    .uuid("Invalid staff member ID format")
    .optional(),
  notes: z.string()
    .max(500, "Notes must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});

// Extended service validation schema for the Services form
export const extendedServiceValidation = z.object({
  customer_id: z.string()
    .uuid("Invalid customer ID format"),
  customer_name: z.string()
    .min(1, "Customer name is required")
    .max(100, "Customer name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Customer name can only contain letters, spaces, hyphens, apostrophes, and periods"),
  customer_email: z.string()
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  customer_phone: z.string()
    .regex(/^[\+]?[\d\s\-\(\)]{7,20}$/, "Invalid phone number format")
    .max(20, "Phone number must be less than 20 characters")
    .optional()
    .or(z.literal("")),
  service_name: z.string()
    .min(1, "Service name is required")
    .max(100, "Service name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-&]+$/, "Service name can only contain letters, spaces, hyphens, and ampersands"),
  service_category: z.string()
    .min(1, "Service category is required")
    .max(50, "Service category must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Service category can only contain letters and spaces"),
  service_price: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseFloat(val) || 0 : val)
    .refine((val) => val >= 0.01, "Service price must be greater than 0")
    .refine((val) => val <= 9999.99, "Service price must be less than 10,000"),
  staff_member_id: z.string()
    .uuid("Invalid staff member ID format")
    .optional()
    .or(z.literal("")),
  status: z.enum(['pending', 'completed', 'cancelled'], {
    errorMap: () => ({ message: "Status must be 'pending', 'completed', or 'cancelled'" })
  }),
  date_time: z.string()
    .min(1, "Date and time is required"),
  notes: z.string()
    .max(500, "Notes must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  commission_rate: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseFloat(val) || 0 : val)
    .refine((val) => val >= 0, "Commission rate must be positive")
    .refine((val) => val <= 100, "Commission rate cannot exceed 100%")
    .optional(),
});

// Inventory item validation schema
export const inventoryItemValidation = z.object({
  name: z.string()
    .min(1, "Item name is required")
    .max(100, "Item name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-&]+$/, "Item name can only contain letters, numbers, spaces, hyphens, and ampersands"),
  current_stock: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseInt(val) || 0 : val)
    .refine((val) => Number.isInteger(val), "Stock must be a whole number")
    .refine((val) => val >= 0, "Stock cannot be negative")
    .refine((val) => val <= 999999, "Stock must be less than 1,000,000"),
  min_stock_level: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseInt(val) || 0 : val)
    .refine((val) => Number.isInteger(val), "Minimum stock must be a whole number")
    .refine((val) => val >= 0, "Minimum stock cannot be negative")
    .refine((val) => val <= 999999, "Minimum stock must be less than 1,000,000"),
  max_stock_level: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseInt(val) || 0 : val)
    .refine((val) => Number.isInteger(val), "Maximum stock must be a whole number")
    .refine((val) => val >= 0, "Maximum stock cannot be negative")
    .refine((val) => val <= 999999, "Maximum stock must be less than 1,000,000"),
  unit_price: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseFloat(val) || 0 : val)
    .refine((val) => val >= 0, "Unit price must be positive")
    .refine((val) => val <= 9999.99, "Unit price must be less than 10,000"),
  supplier: z.string()
    .max(100, "Supplier name must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  barcode: z.string()
    .max(50, "Barcode must be less than 50 characters")
    .optional()
    .or(z.literal("")),
  category_id: z.string()
    .uuid("Invalid category ID format")
    .optional()
    .or(z.literal("")),
  expiry_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .or(z.literal("")),
});

// Expense validation schema
export const expenseValidation = z.object({
  name: z.string()
    .min(1, "Expense name is required")
    .max(100, "Expense name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-&]+$/, "Expense name can only contain letters, numbers, spaces, hyphens, and ampersands"),
  category: z.string()
    .min(1, "Category is required")
    .max(50, "Category must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Category can only contain letters and spaces"),
  amount: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseFloat(val) || 0 : val)
    .refine((val) => val >= 0.01, "Amount must be greater than 0")
    .refine((val) => val <= 999999.99, "Amount must be less than 1,000,000"),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .refine((date) => {
      const expenseDate = new Date(date);
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      return expenseDate >= oneYearAgo && expenseDate <= today;
    }, "Date must be within the last year and not in the future"),
});

// Utility function to validate and sanitize data
export const validateAndSanitize = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => err.message).join(', ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    throw error;
  }
};

// Sanitization helper functions
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

export const sanitizeNumber = (input: string | number): number => {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number format');
  }
  return num;
};

export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const sanitizePhone = (phone: string): string => {
  return phone.replace(/[^\d\+\-\(\)\s]/g, '').trim();
};

// Type exports for use in components
export type CustomerFormData = z.infer<typeof customerValidation>;
export type WorkerFormData = z.infer<typeof workerValidation>;
export type ServiceFormData = z.infer<typeof serviceValidation>;
export type ExtendedServiceFormData = z.infer<typeof extendedServiceValidation>;
export type InventoryItemFormData = z.infer<typeof inventoryItemValidation>;
export type ExpenseFormData = z.infer<typeof expenseValidation>;
