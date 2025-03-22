import { NextRequest, NextResponse } from 'next/server'
import { withCors } from '@/lib/cors'

/**
 * GET /api/freelancer/earnings
 * 
 * Example usage:
 *   GET /api/freelancer/earnings?walletAddress=0xf73b452fa361f3403b20a35c4650f69916c3275a
 */
async function getFreelancerEarnings(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const walletAddress = url.searchParams.get('walletAddress') || ''
    const walletEns = url.searchParams.get('walletEns') || ''

    // In a real scenario, you'd do a DB query to sum all the tokens the user has earned
    // For demonstration, we show static results:
    const mockEarnings = {
      totalEarnings: 3400,
      currency: 'EDU',
      growthPercent: 5,
      earningsHistory: [
        {
          projectId: 'prj_456',
          projectTitle: 'Mobile App development',
          amountEarned: 500,
          payoutDate: new Date(Date.now() - 3_600_000_000).toISOString(), // 1000 hr ago
        },
        {
          projectId: 'prj_789',
          projectTitle: 'Smart Contract Audit',
          amountEarned: 900,
          payoutDate: new Date(Date.now() - 2_600_000_000).toISOString(),
        },
      ]
    }

    return NextResponse.json({
      isSuccess: true,
      data: mockEarnings,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[GET /api/freelancer/earnings] Error:', error)
    return NextResponse.json({
      isSuccess: false,
      message: 'Internal server error',
    }, { status: 500 })
  }
}

export const GET = withCors(getFreelancerEarnings);
export const OPTIONS = withCors(async () => new Response(null, { status: 204 }));