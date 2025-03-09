import { NextResponse } from 'next/server';
import apiSchema from '@/lib/openapi';
import { withCors } from '@/lib/cors';

async function getApiSpec() {
  return NextResponse.json(apiSchema);
}

export const GET = withCors(getApiSpec); 