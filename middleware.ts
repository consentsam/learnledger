import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Environment-based CORS configuration
const CORS_CONFIG = {
  development: {
    origins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003',
    ],
    credentials: true
  },
  production: {
    origins: [
      'https://learn-ledger-api.vercel.app',
      'https://learn-ledger.vercel.app',
      'https://learnledger.xyz',
      'https://www.learnledger.xyz',
      'https://api.learnledger.xyz',
      'https://www.api.learnledger.xyz',
      // Add subdomains to handle all possible variations
      'https://*.learnledger.xyz'
    ],
    credentials: true
  }
};

// Get allowed origins based on environment
const getAllowedOrigins = () => {
  const env = process.env.NODE_ENV || 'development';
  return CORS_CONFIG[env as keyof typeof CORS_CONFIG].origins;
};

// Check if origin matches including wildcard support
const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return true; // Allow requests with no origin
  
  const allowedOrigins = getAllowedOrigins();
  
  return allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin === origin) return true;
    if (allowedOrigin.includes('*')) {
      const pattern = new RegExp('^' + allowedOrigin.replace('*.', '([^.]+\\.)+') + '$');
      return pattern.test(origin);
    }
    return false;
  });
};

// Comprehensive list of allowed headers
const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Accept-Version',
  'Content-Length',
  'Content-MD5',
  'Date',
  'X-Api-Version',
  'Origin',
  'Cache-Control',
  'If-Match',
  'If-None-Match',
  'If-Modified-Since',
  'If-Unmodified-Since',
  'X-Requested-With',
  // Client Hints headers
  'Sec-CH-UA',
  'Sec-CH-UA-Platform',
  'Sec-CH-UA-Platform-Version',
  'Sec-CH-UA-Mobile',
  'Sec-CH-UA-Model',
  'Sec-CH-UA-Full-Version',
  'Sec-CH-UA-Full-Version-List',
  // Custom headers if needed
  'X-Custom-Header'
];

// This middleware runs on the edge and ensures proper handling of API routes
export async function middleware(request: NextRequest) {
  // Log all API requests
  console.log(`[Middleware] ${request.method} ${request.nextUrl.pathname}`)
  
  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    
    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
          'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS.join(', '),
          'Access-Control-Max-Age': '86400', // 24 hours
          'Vary': 'Origin',
          ...(origin && isOriginAllowed(origin) ? { 'Access-Control-Allow-Credentials': 'true' } : {})
        },
      });
    }
    
    // For non-OPTIONS methods, continue but add CORS headers to the response
    const response = NextResponse.next();
    
    if (isOriginAllowed(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
      response.headers.set('Access-Control-Allow-Headers', DEFAULT_ALLOWED_HEADERS.join(', '));
      response.headers.set('Vary', 'Origin');
      
      if (origin) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
    }
    
    return response;
  }

  // Pass through for non-API routes
  return NextResponse.next();
}

// Configure the paths where middleware will be invoked
export const config = {
  matcher: [
    '/api/:path*',
  ],
} 