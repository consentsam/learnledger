import { NextRequest, NextResponse } from 'next/server';
import apiSchema from '@/lib/openapi';
import { withCors } from '@/lib/cors';

async function getApiDocs(req: NextRequest) {
  return NextResponse.json(apiSchema);
}

// Apply CORS to route handler
export const GET = withCors(getApiDocs);
export const OPTIONS = withCors(async () => {
  return new Response(null, { status: 204 });
}); 