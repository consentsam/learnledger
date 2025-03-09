import { NextRequest, NextResponse } from 'next/server';

// CORS headers for allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  // Add your production domains if needed
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
                   allowedOrigins.includes(origin);
  
  if (isAllowed) {
    // Set CORS headers
    res.headers.set('Access-Control-Allow-Origin', origin);
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
  handler: (req: NextRequest) => Promise<NextResponse>, 
  options: CorsOptions = {}
) {
  return async function corsHandler(req: NextRequest) {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      // Create a proper response for OPTIONS preflight
      const preflightResponse = NextResponse.json({}, { status: 204 });
      return addCorsHeaders(req, preflightResponse, options);
    }
    
    try {
      // Call the original handler
      const response = await handler(req);
      
      // Add CORS headers to the response
      return addCorsHeaders(req, response, options);
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