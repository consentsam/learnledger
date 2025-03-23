import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware runs on the edge and ensures proper handling of API routes
export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add CORS headers to all API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    
    // Log all API requests
    console.log(`[Middleware] ${request.method} ${request.nextUrl.pathname}`)
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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