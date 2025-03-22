/**
 * File: /app/api/freelancer/earnings/route.ts
 * 
 * POST or GET body:
 * {
 *   "role": "freelancer",
 *   "walletAddress": "...",
 *   "walletEns": "consentsam"
 * }
 *
 * Return:
 * {
 *   "totalEarnings": number,
 *   "currency": "EDU",
 *   "growthPercent": 5,
 *   "earningsHistory": [
 *     {
 *       "projectId": string,
 *       "projectTitle": string,
 *       "amountEarned": number,
 *       "payoutDate": string
 *     },
 *     ...
 *   ]
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { withCors } from '@/lib/cors'
import { db } from '@/db/db'
import { freelancerTable } from '@/db/schema/freelancer-schema'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { projectsTable } from '@/db/schema/projects-schema'
import { eq, and, sql } from 'drizzle-orm'

async function handleFreelancerEarnings(req: NextRequest) {
  try {
    let walletEns = ''
    let walletAddress = ''

    if (req.method === 'GET') {
      const url = new URL(req.url)
      walletEns = (url.searchParams.get('walletEns') || '').toLowerCase().trim()
      walletAddress = (url.searchParams.get('walletAddress') || '').toLowerCase().trim()
    } else {
      const body = await req.json()
      walletEns = (body.walletEns || '').toLowerCase().trim()
      walletAddress = (body.walletAddress || '').toLowerCase().trim()
    }

    // find freelancer
    const [freelancer] = await db
      .select()
      .from(freelancerTable)
      .where(eq(freelancerTable.walletEns, walletEns))
      .limit(1)

    if (!freelancer) {
      return NextResponse.json({
        isSuccess: false,
        message: `Freelancer not found for walletEns=${walletEns}`
      }, { status: 404 })
    }

    const finalWalletAddress = freelancer.walletAddress.toLowerCase()

    // fetch all submissions with status='approved'
    const subs = await db
      .select()
      .from(projectSubmissionsTable)
      .where(
        and(
          eq(projectSubmissionsTable.freelancerAddress, finalWalletAddress),
          eq(projectSubmissionsTable.status, 'approved')
        )
      )

    if (subs.length === 0) {
      // no approved submissions => zero
      return NextResponse.json({
        totalEarnings: 0,
        currency: 'EDU',
        growthPercent: 0,
        earningsHistory: []
      }, { status: 200 })
    }

    // get relevant projects
    const uniqueProjectIds = [...new Set(subs.map(s => s.projectId))]
    const projectsData = await db
      .select()
      .from(projectsTable)
      .where(sql`${projectsTable.id} IN (${uniqueProjectIds.join(',')})`)

    // build a quick map: projectId => project
    const projectMap = new Map<string, typeof projectsData[0]>()
    projectsData.forEach(p => projectMap.set(p.id, p))

    // Build an earningsHistory array
    // We do each submission => the project => use that project's prizeAmount as "amountEarned"
    // If a user has multiple approved submissions for the same project, you might want to 
    // only count the first one. But let's just do a sum for them. 
    // Typically a user shouldn't get multiple payouts from the same project. 
    // For demonstration, we do 1-to-1:
    const earningsHistory = subs.map(s => {
      const proj = projectMap.get(s.projectId)
      const amountEarned = proj ? parseFloat(proj.prizeAmount.toString()) : 0
      return {
        projectId: s.projectId,
        projectTitle: proj ? proj.projectName : '',
        amountEarned,
        payoutDate: s.updatedAt.toISOString(), // or new Date(s.updatedAt).toISOString()
      }
    })

    // totalEarnings => sum of all the amounts from each project. 
    // If you only want unique projects, you can do a reduce by projectId. 
    let totalEarnings = 0
    earningsHistory.forEach(e => { totalEarnings += e.amountEarned })

    // growthPercent => if you do not have a transaction log or date-based approach, do a naive approach:
    const growthPercent = 5

    const responseData = {
      totalEarnings,
      currency: 'EDU',
      growthPercent,
      earningsHistory
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error('[freelancer/earnings] error:', error)
    return NextResponse.json({
      isSuccess: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export const GET = withCors(handleFreelancerEarnings)
export const POST = withCors(handleFreelancerEarnings)
export const OPTIONS = withCors(async () => new Response(null, { status: 204 }));