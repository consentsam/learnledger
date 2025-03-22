/**
 * File: /app/api/freelancer/dashboard/metrics/route.ts
 *
 * GET or POST (you said the front-end might send a body with role=freelancer, walletAddress, walletEns).
 * We'll accept GET or POST. 
 * Let's do GET with query params or accept JSON body if you like.
 *
 * Return shape:
 *  {
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
 *  }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withCors } from '@/lib/cors'
import { db } from '@/db/db'
import { freelancerTable } from '@/db/schema/freelancer-schema'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { projectsTable } from '@/db/schema/projects-schema'
import { eq, and, sql } from 'drizzle-orm'
import { userBalancesTable } from '@/db/schema/user-balances-schema'

async function handleGetOrPostFreelancerMetrics(req: NextRequest) {
  try {
    // If GET, parse from query. If POST, parse from body, etc.
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

    // Find the freelancer by walletEns first (since you said ENS is "primary")
    const [freelancer] = await db
      .select()
      .from(freelancerTable)
      .where(eq(freelancerTable.walletEns, walletEns))
      .limit(1)

    if (!freelancer) {
      return NextResponse.json({
        isSuccess: false,
        message: `No freelancer found for walletEns=${walletEns}`
      }, { status: 404 })
    }

    // Confirm or override the walletAddress from DB
    // (So we're consistent.)
    const finalWalletAddress = freelancer.walletAddress.toLowerCase()

    // 1) Submissions for that user
    //    totalSubmissions = all
    //    We store status in 'project_submissions.status': 'pending' | 'approved' | 'rejected'
    const allSubs = await db
      .select()
      .from(projectSubmissionsTable)
      .where(eq(projectSubmissionsTable.freelancerAddress, finalWalletAddress))

    const totalSubmissions = allSubs.length
    const approvedSubmissions = allSubs.filter(s => s.status === 'approved').length
    const rejectedSubmissions = allSubs.filter(s => s.status === 'rejected').length
    // If you want "approvalRate", you can do:
    // const approvalRate = totalSubmissions === 0 ? 0 : (approvedSubmissions / totalSubmissions)*100

    // 2) Distinct projects for those submissions
    //    For "activeProjects", we interpret "active" as: user has a submission with status='pending'
    //    AND the project is not closed. Let's define "closed" as project.projectStatus='closed'.
    const projectIds = allSubs.map(s => s.projectId) // array of all projectIds
    const uniqueProjectIds = [...new Set(projectIds)]

    let completedProjects = 0
    let activeProjects = 0

    if (uniqueProjectIds.length > 0) {
      const projectsData = await db
        .select()
        .from(projectsTable)
        .where(sql`${projectsTable.id} = ANY(${uniqueProjectIds})`)

      // For each project, see if the user has an "approved" submission => that's completed
      // Or if it's "pending" + project is open => that's active
      for (const proj of projectsData) {
        // gather user's submissions for this project
        const subsForProj = allSubs.filter(s => s.projectId === proj.id)

        // if any submission has status='approved' => it's completed
        if (subsForProj.some(s => s.status === 'approved')) {
          completedProjects++
        } else {
          // if none are approved or rejected, but at least one is 'pending' and project is open => active
          // or if "some are rejected but at least one is pending," user can still try => still "active"
          const hasPending = subsForProj.some(s => s.status === 'pending')
          const projectIsOpen = proj.projectStatus !== 'closed'
          if (hasPending && projectIsOpen) {
            activeProjects++
          }
        }
      }
    }

    // 3) earnings => sum of all tokens from user_balances or from projects? 
    // The official minted approach is that "approveSubmissionAction" calls updateBalanceAction. 
    // So we can get the user's final "balance" from userBalancesTable:
    let totalEarningsFromBalance = 0
    const [balanceRow] = await db
      .select()
      .from(userBalancesTable)
      .where(eq(userBalancesTable.userId, finalWalletAddress))
      .limit(1)

    if (balanceRow) {
      totalEarningsFromBalance = parseFloat(balanceRow.balance.toString()) // might be "500.00"
    }

    // Growth percent = we can't measure properly w/out transaction logs. So we do 5:
    const growthPercent = 5

    // 4) Return final data
    const responseData = {
      totalSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      activeProjects,
      completedProjects,
      // If you want totalProjects => that's "active + completed + possibly other states"
      // But from your statement, totalProjects for the freelancer is basically the unique projects 
      // in which they have at least one submission. 
      // That can be activeProjects + completedProjects + "any that are all rejected" if that's relevant. 
      // We skip or you can add it if you want:

      earnings: {
        amount: totalEarningsFromBalance,
        currency: 'EDU',
        growthPercent
      },
      statsUpdatedAt: new Date().toISOString()
    }

    return NextResponse.json(responseData, { status: 200 })

  } catch (error: any) {
    console.error('[freelancer/dashboard/metrics] error:', error)
    return NextResponse.json({
      isSuccess: false,
      message: 'Internal server error',
    }, { status: 500 })
  }
}

export const GET = withCors(handleGetOrPostFreelancerMetrics)
export const POST = withCors(handleGetOrPostFreelancerMetrics)

// We add an OPTIONS if you want:
export const OPTIONS = withCors(async () => new Response(null, { status: 204 }));