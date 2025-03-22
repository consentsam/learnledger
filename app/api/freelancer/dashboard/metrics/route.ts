import { NextRequest, NextResponse } from 'next/server'
import { withCors } from '@/lib/cors'

/**
 * GET /api/freelancer/dashboard/metrics
 * 
 * Example usage:
 *   GET /api/freelancer/dashboard/metrics?walletAddress=0xf73b452fa361f3403b20a35c4650f69916c3275a
 */
async function getFreelancerDashboardMetrics(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const walletAddress = url.searchParams.get('walletAddress') || ''
    const walletEns = url.searchParams.get('walletEns') || ''

    // In a real scenario, query DB for number of open submissions, 
    // how many are approved, how many are in progress, etc.
    const mockMetrics = {
      totalSubmissions: 12,
      approvedSubmissions: 9,
      rejectedSubmissions: 3,
      approvalRate: 75,
      activeProjects: 2,
      completedProjects: 5,
      statsUpdatedAt: new Date().toISOString(),
    }

    return NextResponse.json({
      isSuccess: true,
      data: mockMetrics,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[GET /api/freelancer/dashboard/metrics] Error:', error)
    return NextResponse.json({
      isSuccess: false,
      message: 'Internal server error',
    }, { status: 500 })
  }
}

export const GET = withCors(getFreelancerDashboardMetrics);
export const OPTIONS = withCors(async () => new Response(null, { status: 204 }));