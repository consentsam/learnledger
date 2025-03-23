import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/db/db'
import { projectsTable } from '@/db/schema/projects-schema'

/**
 * GET /api/company/my-projects?walletEns={walletEns}&walletAddress={walletAddress}
 * 
 * Returns projects where the specified wallet is the owner.
 * Either walletEns or walletAddress is required.
 */
export async function GET(req: NextRequest) {
  try {
    console.log('[GET /api/company/my-projects] Request received');
    
    // Get query parameters
    const url = new URL(req.url);
    const walletEns = url.searchParams.get('walletEns');
    const walletAddress = url.searchParams.get('walletAddress');
    
    console.log('Query parameters:', { walletEns, walletAddress });
    
    // Validate required parameters
    if (!walletEns && !walletAddress) {
      console.error('Missing required query parameters: walletEns or walletAddress');
      return NextResponse.json({
        isSuccess: false,
        message: 'Either walletEns or walletAddress is required'
      }, { status: 400 });
    }
    
    // Validate wallet address format if provided
    if (walletAddress && !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json({
        isSuccess: false,
        message: 'Invalid wallet address format'
      }, { status: 400 });
    }

    // Query projects where the user is the owner
    type ProjectResult = typeof projectsTable.$inferSelect;
    let projects: ProjectResult[] = [];
    
    if (walletEns && walletAddress) {
      // If both are provided, search for either match
      projects = await db
        .select()
        .from(projectsTable)
        .where(
          eq(projectsTable.projectOwnerWalletEns, walletEns)
        )
        .unionAll(
          db
            .select()
            .from(projectsTable)
            .where(
              eq(projectsTable.projectOwnerWalletAddress, walletAddress)
            )
        );
    } else if (walletEns) {
      // Only ENS provided
      projects = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.projectOwnerWalletEns, walletEns));
    } else if (walletAddress) {
      // Only wallet address provided
      projects = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.projectOwnerWalletAddress, walletAddress));
    }
    
    return NextResponse.json({
      isSuccess: true,
      message: 'Projects retrieved successfully',
      data: projects
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({
      isSuccess: false,
      message: 'Internal server error',
      debugInfo: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : { error: String(error) }
    }, { status: 500 });
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 