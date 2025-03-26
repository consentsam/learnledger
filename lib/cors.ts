import { NextRequest, NextResponse } from 'next/server';

// CORS headers for allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  // Add your production domains if needed
  'https://learn-ledger-api.vercel.app',
  'https://learn-ledger.vercel.app',
  // '*', // Allow all origins temporarily for development - REMOVED as it's not needed anymore
  // TODO: Replace the line above with your specific frontend production domains
  // 'https://your-frontend-domain.com',
  'https://learnledger.xyz',
  'https://www.learnledger.xyz',
  'https://api.learnledger.xyz',
  'https://www.api.learnledger.xyz',
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
  const origin = req.headers.get('origin') || '';
  
  // Default options
  const defaultOptions: Required<CorsOptions> = {
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Accept',
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
  
  // Check if the origin is allowed or if we're in development
  const isAllowed = process.env.NODE_ENV === 'development' || 
                  allowedOrigins.includes(origin) ||
                  allowedOrigins.includes('*') ||
                  origin === ''; // Allow requests with no origin (like mobile apps or curl)
  
  if (isAllowed) {
    // Set CORS headers
    // If wildcard is in allowed origins and the specific origin isn't, use wildcard
    const allowedOrigin = allowedOrigins.includes('*') && !allowedOrigins.includes(origin) ? '*' : origin || '*';
    res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    res.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
    res.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    
    if (allowCredentials) {
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
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      // Create a new Response object with no body and 204 status
      // This is the correct way to handle a preflight request
      const response = new Response(null, { status: 204 });
      
      // Add CORS headers directly to the response headers
      const origin = req.headers.get('origin') || '*';
      const defaultOptions: Required<CorsOptions> = {
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
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
      
      // Merge with custom options
      const {
        allowedMethods,
        allowedHeaders,
        allowCredentials,
      } = { ...defaultOptions, ...options };
      
      // Set CORS headers
      // Determine the appropriate Access-Control-Allow-Origin value
      const isAllowed = process.env.NODE_ENV === 'development' || 
                        allowedOrigins.includes(origin) ||
                        allowedOrigins.includes('*') ||
                        origin === '';
                        
      if (isAllowed) {
        const allowedOrigin = allowedOrigins.includes('*') && !allowedOrigins.includes(origin) ? '*' : origin;
        response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
        response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
        response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
        
        if (allowCredentials) {
          response.headers.set('Access-Control-Allow-Credentials', 'true');
        }
        
        return response;
      }
      
      // If origin is not allowed, return 403 Forbidden
      return new Response(null, { status: 403 });
      
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