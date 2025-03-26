import { NextRequest, NextResponse } from 'next/server';

// CORS headers for allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  // Production domains
  'https://learn-ledger-api.vercel.app',
  'https://learn-ledger.vercel.app',
  'https://learnledger.xyz',
  'https://www.learnledger.xyz',
  'https://api.learnledger.xyz',
  'https://www.api.learnledger.xyz'
];

type CorsOptions = {
  allowedMethods?: string[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
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
  
  // Default options with expanded headers
  const defaultOptions: Required<CorsOptions> = {
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: [
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
      'Cache-Control'
    ],
    allowCredentials: true,
  };
  
  // Merge provided options with defaults
  const {
    allowedMethods,
    allowedHeaders,
    allowCredentials,
  } = { ...defaultOptions, ...options };

  // Check if the origin is allowed
  const isAllowed = !origin || allowedOrigins.includes(origin);
  
  if (isAllowed) {
    // Set CORS headers with the actual origin if it's allowed
    res.headers.set('Access-Control-Allow-Origin', origin || '*');
    res.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
    res.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    res.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    
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
    const isAllowed = !origin || allowedOrigins.includes(origin);

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      if (!isAllowed) {
        return new Response(null, { status: 403 });
      }

      return new Response(null, { 
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
          'Access-Control-Allow-Headers': [
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
            'Cache-Control'
          ].join(', '),
          'Access-Control-Max-Age': '86400', // 24 hours cache for preflight
          ...(origin && { 'Access-Control-Allow-Credentials': 'true' })
        }
      });
    }
    
    if (!isAllowed) {
      return new Response('Not allowed by CORS', { status: 403 });
    }

    try {
      // Call the original handler
      const response = await handler(req);
      
      // Add CORS headers to the response
      return addCorsHeaders(req, response as NextResponse, options);
    } catch (error) {
      console.error('CORS middleware error:', error);
      
      // Create a standard error response
      const errorResponse = NextResponse.json(
        { 
          isSuccess: false, 
          message: error instanceof Error ? error.message : 'Internal server error' 
        }, 
        { status: 500 }
      );
      
      // Add CORS headers even to error responses
      return addCorsHeaders(req, errorResponse, options);
    }
  };
} 