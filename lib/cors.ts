import { NextRequest, NextResponse } from 'next/server';

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
      // Add production URLs to development config to allow local-to-prod requests
      'https://learn-ledger-api.vercel.app',
      'https://learn-ledger.vercel.app',
      'https://learnledger.xyz',
      'https://www.learnledger.xyz',
      'https://api.learnledger.xyz',
      'https://www.api.learnledger.xyz',
      'https://*.learnledger.xyz'
    ],
    credentials: true
  },
  production: {
    origins: [
      'http://localhost:3000',  // Allow localhost in production for development
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003',
      'https://learn-ledger-api.vercel.app',
      'https://learn-ledger.vercel.app',
      'https://learnledger.xyz',
      'https://www.learnledger.xyz',
      'https://api.learnledger.xyz',
      'https://www.api.learnledger.xyz',
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

type CorsOptions = {
  allowedMethods?: string[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
};

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(
  req: NextRequest,
  res: NextResponse,
  options: CorsOptions = {}
): NextResponse {
  const origin = req.headers.get('origin');
  
  const defaultOptions: Required<CorsOptions> = {
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: DEFAULT_ALLOWED_HEADERS,
    allowCredentials: CORS_CONFIG[process.env.NODE_ENV as keyof typeof CORS_CONFIG]?.credentials ?? true,
    maxAge: 86400 // 24 hours
  };
  
  const {
    allowedMethods,
    allowedHeaders,
    allowCredentials,
    maxAge
  } = { ...defaultOptions, ...options };

  if (isOriginAllowed(origin)) {
    // Set CORS headers
    res.headers.set('Access-Control-Allow-Origin', origin || '*');
    res.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
    res.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    res.headers.set('Access-Control-Max-Age', maxAge.toString());
    res.headers.set('Vary', 'Origin'); // Important for CDN caching
    
    if (allowCredentials && origin) {
      res.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  return res;
}

/**
 * Middleware to handle CORS preflight requests and add CORS headers to responses
 */
export function withCors(
  handler: (req: NextRequest) => Promise<NextResponse | Response>,
  options: CorsOptions = {}
) {
  return async function corsHandler(req: NextRequest) {
    const origin = req.headers.get('origin');

    // Early return if the origin is not allowed
    if (origin && !isOriginAllowed(origin)) {
      return new Response('Not allowed by CORS', { 
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      const defaultOptions: Required<CorsOptions> = {
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
        allowedHeaders: DEFAULT_ALLOWED_HEADERS,
        allowCredentials: CORS_CONFIG[process.env.NODE_ENV as keyof typeof CORS_CONFIG]?.credentials ?? true,
        maxAge: 86400
      };

      const {
        allowedMethods,
        allowedHeaders,
        allowCredentials,
        maxAge
      } = { ...defaultOptions, ...options };

      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': allowedMethods.join(', '),
          'Access-Control-Allow-Headers': allowedHeaders.join(', '),
          'Access-Control-Max-Age': maxAge.toString(),
          'Vary': 'Origin',
          ...(allowCredentials && origin ? { 'Access-Control-Allow-Credentials': 'true' } : {})
        }
      });
    }

    try {
      const response = await handler(req);
      return addCorsHeaders(req, response as NextResponse, options);
    } catch (error) {
      console.error('CORS middleware error:', error);
      
      const errorResponse = NextResponse.json(
        {
          isSuccess: false,
          message: error instanceof Error ? error.message : 'Internal server error'
        },
        { status: 500 }
      );
      
      return addCorsHeaders(req, errorResponse, options);
    }
  };
} 