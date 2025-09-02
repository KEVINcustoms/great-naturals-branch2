// Security utilities for the salon management system

import { validateAndSanitize, sanitizeString, sanitizeEmail, sanitizePhone, sanitizeNumber } from './validation';
import { z } from 'zod';

// Rate limiting implementation (client-side)
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// Security event logging
export const logSecurityEvent = (event: string, userId: string, details: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    userId,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
  
  // In production, send to monitoring service
  // sendToMonitoringService(logEntry);
};

// Input sanitization wrapper
export const secureInput = {
  string: (input: string): string => sanitizeString(input),
  email: (input: string): string => sanitizeEmail(input),
  phone: (input: string): string => sanitizePhone(input),
  number: (input: string | number): number => sanitizeNumber(input),
};

// XSS protection
export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// CSRF token generation (for future use)
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Secure form submission wrapper
export const secureFormSubmit = async <T>(
  validationSchema: z.ZodSchema<T>,
  formData: unknown,
  submitFunction: (validatedData: T) => Promise<unknown>,
  userId: string
): Promise<unknown> => {
  try {
    // Check rate limiting
    if (!rateLimiter.isAllowed(userId)) {
      throw new Error('Too many requests. Please try again later.');
    }

    // Validate and sanitize input
    const validatedData = validateAndSanitize(validationSchema, formData);
    
    // Log the submission attempt
    logSecurityEvent('FORM_SUBMISSION', userId, {
      formType: 'form_submission',
      timestamp: new Date().toISOString()
    });

    // Execute the submission
    const result = await submitFunction(validatedData as T);
    
    // Log successful submission
    logSecurityEvent('FORM_SUBMISSION_SUCCESS', userId, {
      formType: 'form_submission',
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    // Log failed submission
    logSecurityEvent('FORM_SUBMISSION_FAILED', userId, {
      formType: 'form_submission',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
};

// Password strength checker
export const checkPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password should be at least 8 characters long');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain uppercase letters');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain numbers');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain special characters');
  }

  return { score, feedback };
};

// Session security
export const sessionSecurity = {
  // Check if session is still valid
  isSessionValid: (): boolean => {
    const token = localStorage.getItem('supabase.auth.token');
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  },

  // Clear sensitive data on logout
  clearSensitiveData: (): void => {
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
    // Clear any other sensitive data
  },

  // Set secure session timeout
  setSessionTimeout: (timeoutMs: number = 30 * 60 * 1000): void => {
    setTimeout(() => {
      if (sessionSecurity.isSessionValid()) {
        sessionSecurity.clearSensitiveData();
        window.location.href = '/login';
      }
    }, timeoutMs);
  }
};

// Content Security Policy helper
export const cspViolationHandler = (event: SecurityPolicyViolationEvent) => {
  logSecurityEvent('CSP_VIOLATION', 'system', {
    violatedDirective: event.violatedDirective,
    blockedURI: event.blockedURI,
    sourceFile: event.sourceFile,
    lineNumber: event.lineNumber,
    columnNumber: event.columnNumber
  });
};

// Initialize security measures
export const initializeSecurity = (): void => {
  // Set up CSP violation reporting
  document.addEventListener('securitypolicyviolation', cspViolationHandler);
  
  // Set up session timeout
  sessionSecurity.setSessionTimeout();
  
  // Log security initialization
  logSecurityEvent('SECURITY_INITIALIZED', 'system', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
};

// Export security constants
export const SECURITY_CONSTANTS = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
} as const;
