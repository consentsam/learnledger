/**
 * @file app/api/freelancer/dashboard/metrics/route.ts
 *
 * @description
 * Provides an API endpoint to fetch "freelancer" dashboard metrics, either via GET
 * query parameters or POST JSON body. We treat `walletEns` as the primary key
 * for the freelancer. If not found by `walletEns`, we fallback to `walletAddress`.
 *
 * Example requests:
 *   -- GET --
 *   GET /api/freelancer/dashboard/metrics?walletEns=someEns&walletAddress=0xABC
 *
 *   -- POST --
 *   POST /api/freelancer/dashboard/metrics
 *   {
 *     "role": "freelancer",
 *     "walletEns": "someEns",
 *     "walletAddress": "0xABC"
 *   }
 *
 * Return shape (example):
 * {
 *    "isSuccess": true,
 *    "totalSubmissions": number,
 *    "approvedSubmissions": number,
 *    "rejectedSubmissions": number,
 *    "activeProjects": number,
 *    "completedProjects": number,
 *    "earnings": {
 *      "amount": number,
 *      "currency": "EDU",
 *      "growthPercent": number
 *    },
 *    "statsUpdatedAt": string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withCors } from '@/lib/cors'
import { db } from '@/db/db'
import { freelancerTable } from '@/db/schema/freelancer-schema'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { projectsTable } from '@/db/schema/projects-schema'
import { userBalancesTable } from '@/db/schema/user-balances-schema'
import { eq, sql } from 'drizzle-orm'

async function handleFreelancerMetrics(req: NextRequest) {
  try {
    let walletEns = ''
    let walletAddress = ''

    // 1) Parse from GET or POST
    if (req.method === 'GET') {
      const url = new URL(req.url)
      walletEns = (url.searchParams.get('walletEns') || '').trim().toLowerCase()
      walletAddress = (url.searchParams.get('walletAddress') || '').trim().toLowerCase()
    } else {
      // POST
      try {
        const body = await req.json()
        console.log('[Freelancer Metrics] Received body:', JSON.stringify(body))
        walletEns = (body.walletEns || '').trim().toLowerCase()
        walletAddress = (body.walletAddress || '').trim().toLowerCase()
      } catch (parseError) {
        console.error('[Freelancer Metrics] Error parsing request body:', parseError)
        return NextResponse.json({
          isSuccess: false,
          message: 'Invalid request body format'
        }, { status: 400 })
      }
    }

    // If you see this logs empty, check what's actually being passed
    console.log('[Freelancer Metrics] walletEns:', walletEns, ' walletAddress:', walletAddress)

    // Check if either walletEns or walletAddress is provided
    if (!walletEns && !walletAddress) {
      return NextResponse.json({
        isSuccess: false,
        message: 'Either walletEns or walletAddress must be provided'
      }, { status: 400 })
    }

    // 2) Attempt to find the freelancer row (ENS first, fallback to address)
    let freelancerRecord: any = null

    if (walletEns) {
      const [byEns] = await db
        .select()
        .from(freelancerTable)
        .where(eq(freelancerTable.walletEns, walletEns))
        .limit(1)
      freelancerRecord = byEns || null
    }

    if (!freelancerRecord && walletAddress) {
      const [byAddr] = await db
        .select()
        .from(freelancerTable)
        .where(eq(freelancerTable.walletAddress, walletAddress))
        .limit(1)
      if (byAddr) {
        freelancerRecord = byAddr
      }
    }

    // If still none found => 404
    if (!freelancerRecord) {
      return NextResponse.json({
        isSuccess: false,
        message: `No freelancer found for walletEns=${walletEns || ''} or walletAddress=${walletAddress || ''}`
      }, { status: 404 })
    }

    // 3) final wallet address from DB row (since the DB row might differ from the request)
    const finalWalletAddress = freelancerRecord.walletAddress.toLowerCase()

    // 4) Submissions: only real DB query
    const allSubs = await db
      .select()
      .from(projectSubmissionsTable)
      .where(eq(projectSubmissionsTable.freelancerAddress, finalWalletAddress))

    const totalSubmissions = allSubs.length
    const approvedSubmissions = allSubs.filter(s => s.status === 'approved').length
    const rejectedSubmissions = allSubs.filter(s => s.status === 'rejected').length

    // 5) Distinct project IDs from those submissions
    const projectIds = [...new Set(allSubs.map(s => s.projectId))]
    let activeProjects = 0
    let completedProjects = 0

    if (projectIds.length > 0) {
      // fetch relevant projects
      const projectRows = await db
        .select()
        .from(projectsTable)
        .where(sql`${projectsTable.id} = ANY(${projectIds})`)

      for (const proj of projectRows) {
        // gather submissions for this project
        const subsForProj = allSubs.filter(s => s.projectId === proj.id)
        // if any submission has status='approved' => that project is "completed"
        if (subsForProj.some(s => s.status === 'approved')) {
          completedProjects++
        } else {
          // if there's at least one 'pending' and project is not closed => "active"
          const hasPending = subsForProj.some(s => s.status === 'pending')
          const isProjectOpen = (proj.projectStatus !== 'closed')
          if (hasPending && isProjectOpen) {
            activeProjects++
          }
        }
      }
    }

    // 6) total earnings from userBalancesTable
    let totalEarningsFromBalance = 0
    const [balanceRow] = await db
      .select()
      .from(userBalancesTable)
      .where(eq(userBalancesTable.userId, finalWalletAddress))
      .limit(1)
    if (balanceRow) {
      totalEarningsFromBalance = parseFloat(balanceRow.balance.toString()) || 0
    }

    // 7) Growth percent is a placeholder
    const growthPercent = 5

    // 8) Return final JSON
    return NextResponse.json({
      isSuccess: true,
      totalSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      activeProjects,
      completedProjects,
      earnings: {
        amount: totalEarningsFromBalance,
        currency: 'EDU',
        growthPercent
      },
      statsUpdatedAt: new Date().toISOString()
    }, { status: 200 })

  } catch (error: any) {
    console.error('[freelancer/dashboard/metrics] error:', error)
    return NextResponse.json({
      isSuccess: false,
      message: 'Internal server error',
    }, { status: 500 })
  }
}

// Export with CORS
export const GET = withCors(handleFreelancerMetrics)
export const POST = withCors(handleFreelancerMetrics)
export const OPTIONS = withCors(async () => new Response(null, { status: 204 }))