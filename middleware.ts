import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware runs on the edge and ensures proper handling of API routes
export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add CORS headers to all API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Get the origin from the request
    const origin = request.headers.get('origin') || '*'
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      // Add your production domains here when ready
    ]
    
    // Check if origin is allowed or if we're in development mode
    const isAllowedOrigin = allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development'
    
    // Set the appropriate Access-Control-Allow-Origin header
    response.headers.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin : allowedOrigins[0])
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    response.headers.set('Access-Control-Allow-Headers', 
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    
    // Log all API requests
    console.log(`[Middleware] ${request.method} ${request.nextUrl.pathname}`)
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 
            'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
  }

  return response
}

// Configure the paths where middleware will be invoked
export const config = {
  matcher: [
    '/api/:path*',
  ],
} 