import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware runs on the edge and ensures proper handling of API routes
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add CORS headers to all API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  return response
}

// Configure the paths where middleware will be invoked
export const config = {
  matcher: [
    '/api/:path*',
  ],
} 