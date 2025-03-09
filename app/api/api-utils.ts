import { NextResponse } from 'next/server';

// Standard API response format
export interface ApiResponse<T = any> {
  isSuccess: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
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

// Internal server error helper
export function serverErrorResponse(error: any) {
  console.error('[API Error]:', error);
  return NextResponse.json(
    { 
      isSuccess: false, 
      message: 'Internal server error' 
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