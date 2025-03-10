import { NextResponse } from 'next/server';

// Standard API response format
export interface ApiResponse<T = any> {
  isSuccess: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  debugInfo?: any; // Add debug info field
}

// Success response helper
export function successResponse<T>(data?: T, message?: string, status = 200) {
  return NextResponse.json(
    { 
      isSuccess: true, 
      message, 
      data 
    } as ApiResponse<T>,
    { status }
  );
}

// Error response helper
export function errorResponse(message: string, status = 400, errors?: Record<string, string[]>) {
  return NextResponse.json(
    { 
      isSuccess: false, 
      message, 
      errors 
    } as ApiResponse,
    { status }
  );
}

// Custom debug info interface
export interface ErrorDetails {
  message?: string;
  code?: string;
  name?: string;
  stack?: string;
  dbURL?: string;
  env?: string;
  vercelEnv?: string;
  [key: string]: any; // Allow additional properties
}

// Internal server error helper (with optional custom debug info)
export function serverErrorResponse(error: any, customDetails?: ErrorDetails) {
  // Default error details
  const defaultDetails = {
    message: error?.message || 'Unknown error',
    code: error?.code,
    name: error?.name,
    stack: error?.stack, // Include stack trace for Vercel logs
    dbURL: process.env.DATABASE_URL 
      ? `${process.env.DATABASE_URL.split('@')[0].split(':')[0]}:****@${process.env.DATABASE_URL.split('@')[1]}`
      : 'DATABASE_URL not set',
    env: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  };
  
  // Merge default and custom details
  const errorDetails = customDetails ? { ...defaultDetails, ...customDetails } : defaultDetails;
  
  console.error('[API Error]:', JSON.stringify(errorDetails, null, 2));
  
  return NextResponse.json(
    { 
      isSuccess: false, 
      message: customDetails?.message || 'Internal server error',
      // Always include debug info for now until we fix the issue
      debugInfo: errorDetails
    } as ApiResponse,
    { status: 500 }
  );
}

// Validator helper for checking required fields
export function validateRequiredFields<T extends Record<string, any>>(
  body: T,
  requiredFields: (keyof T)[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => !body[field]);
  return {
    isValid: missingFields.length === 0,
    missingFields: missingFields as string[]
  };
}

// Rate limiting helper (placeholder for now)
export function checkRateLimit(ip: string, endpoint: string): boolean {
  // Implement rate limiting logic
  return true; // Always allowed for now
}

// Log API requests for debugging and analytics
export function logApiRequest(method: string, path: string, ip: string, body?: any) {
  console.log(`[${new Date().toISOString()}] ${method} ${path} from ${ip}`);
  // Optional: log to a database or monitoring service
} 