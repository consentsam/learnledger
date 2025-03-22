// File: /Users/sattu/Library/CloudStorage/Dropbox/blockchain/teachnook/api_for_fe/app/api/company/dashboard/metrics/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { withCors } from '@/lib/cors'

/**
 * GET /api/company/dashboard/metrics
 * 
 * Example usage:
 *   GET /api/company/dashboard/metrics?walletAddress=0xf73b452fa361f3403b20a35c4650f69916c3275a&walletEns=consentsam
 */
async function getCompanyDashboardMetrics(req: NextRequest) {
  try {
    // Parse query params if needed
    const url = new URL(req.url)
    const walletAddress = url.searchParams.get('walletAddress') || ''
    const walletEns = url.searchParams.get('walletEns') || ''

    // In real usage, we'd do a DB query to gather stats like total projects, 
    // approved submissions, total employees, etc. 
    // For demonstration, we just mock data:
    const metrics = {
      totalSubmissions: 48,
      approvedSubmissions: 7,
      rejectedSubmissions: 41,
      totalProjects: 16,
      activeProjects: 7,
      closedProjects: 9,
      earnings: {
        amount: 12500,
        currency: 'EDU',
        growthPercent: 5,
      },
      statsUpdatedAt: new Date().toISOString(),
    }

    return NextResponse.json({
      isSuccess: true,
      data: metrics,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[GET /api/company/dashboard/metrics] Error:', error)
    return NextResponse.json({
      isSuccess: false,
      message: 'Internal server error',
    }, { status: 500 })
  }
}

export const GET = withCors(getCompanyDashboardMetrics);
export const OPTIONS = withCors(async () => new Response(null, { status: 204 }));
