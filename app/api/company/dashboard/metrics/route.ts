/**
 * File: /app/api/company/dashboard/metrics/route.ts
 * 
 * For the payload:
 *  {
 *    "role": "company",
 *    "walletAddress": "0x...",
 *    "walletEns": "consentsam",
 *    "timeframe": "24h"
 *  }
 * 
 * Return shape:
 *  {
 *    "totalSubmissions": number,
 *    "approvedSubmissions": number,
 *    "rejectedSubmissions": number,
 *    "totalProjects": number,
 *    "activeProjects": number,
 *    "closedProjects": number,
 *    "pullRequests": {
 *      "timeFrame": "24h",
 *      "count": number,
 *      "growthPercent": number
 *    },
 *    "statsUpdatedAt": string
 *  }
 */
import { NextRequest, NextResponse } from 'next/server'
import { withCors } from '@/lib/cors'
import { db } from '@/db/db'
import { companyTable } from '@/db/schema/company-schema'
import { projectsTable } from '@/db/schema/projects-schema'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { eq, and, sql } from 'drizzle-orm'

async function handleCompanyDashboardMetrics(req: NextRequest) {
  try {
    let walletEns = ''
    let walletAddress = ''
    let timeframe = '24h'

    if (req.method === 'GET') {
      const url = new URL(req.url)
      walletEns = (url.searchParams.get('walletEns') || '').toLowerCase().trim()
      walletAddress = (url.searchParams.get('walletAddress') || '').toLowerCase().trim()
      timeframe = url.searchParams.get('timeframe') || '24h'
    } else {
      const body = await req.json()
      walletEns = (body.walletEns || '').toLowerCase().trim()
      walletAddress = (body.walletAddress || '').toLowerCase().trim()
      timeframe = body.timeframe || '24h'
    }

    // 1) find the company
    const [company] = await db
      .select()
      .from(companyTable)
      .where(eq(companyTable.walletEns, walletEns))
      .limit(1)

    if (!company) {
      return NextResponse.json({
        isSuccess: false,
        message: `No company found for walletEns=${walletEns}`
      }, { status: 404 })
    }

    // final wallet address from DB
    const finalWalletAddress = company.walletAddress.toLowerCase()

    // 2) find all projects owned by that company
    const allProjects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.projectOwner, finalWalletAddress))

    const totalProjects = allProjects.length
    const closedProjects = allProjects.filter(p => p.projectStatus === 'closed').length
    const activeProjects = allProjects.filter(p => p.projectStatus === 'open').length

    // 3) find all submissions that belong to these projects
    if (totalProjects === 0) {
      // no projects => trivial
      return NextResponse.json({
        totalSubmissions: 0,
        approvedSubmissions: 0,
        rejectedSubmissions: 0,
        totalProjects,
        activeProjects,
        closedProjects,
        pullRequests: {
          timeFrame: timeframe,
          count: 0,
          growthPercent: 0,
        },
        statsUpdatedAt: new Date().toISOString()
      })
    }

    const projectIds = allProjects.map(p => p.id)
    const submissions = await db
      .select()
      .from(projectSubmissionsTable)
      .where(sql`${projectSubmissionsTable.projectId} IN (${projectIds})`)

    const totalSubmissions = submissions.length
    const approvedSubmissions = submissions.filter(s => s.status === 'approved').length
    const rejectedSubmissions = submissions.filter(s => s.status === 'rejected').length

    // 4) "pullRequests": count how many submissions were created in the last X timeframe
    // e.g. timeframe=24h => createdAt >= (NOW() - '24 hours')
    // We do a quick DB query:
    let hours = 24
    if (timeframe.endsWith('h')) {
      const val = parseInt(timeframe, 10)
      hours = isNaN(val) ? 24 : val
    } else if (timeframe.endsWith('d')) {
      // convert days to hours if you want
      const val = parseInt(timeframe, 10)
      hours = isNaN(val) ? 24 : val * 24
    }
    // Drizzle doesn't have a built in date arithmetic, so use raw SQL
    const now = new Date()
    const dateCutoff = new Date(now.getTime() - hours * 3600 * 1000)

    const recentSubs = submissions.filter(s => s.createdAt > dateCutoff)

    // If you want to get the previous period count for "growthPercent," we do a second block of 24h prior:
    // For example, from (now - 2*hours) to (now - hours).
    const prevPeriodStart = new Date(now.getTime() - 2*hours * 3600 * 1000)
    const prevPeriodEnd   = dateCutoff
    const prevSubs = submissions.filter(s => s.createdAt >= prevPeriodStart && s.createdAt <= prevPeriodEnd)

    const pullRequestsCount = recentSubs.length
    let growthPercent = 0
    if (prevSubs.length > 0) {
      growthPercent = ((pullRequestsCount - prevSubs.length) / prevSubs.length) * 100
    }

    // 5) Return
    const responseData = {
      totalSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      totalProjects,
      activeProjects,
      closedProjects,
      pullRequests: {
        timeFrame: timeframe,
        count: pullRequestsCount,
        growthPercent: Math.round(growthPercent),
      },
      statsUpdatedAt: new Date().toISOString()
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error('[company/dashboard/metrics] error:', error)
    return NextResponse.json({
      isSuccess: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export const GET = withCors(handleCompanyDashboardMetrics)
export const POST = withCors(handleCompanyDashboardMetrics)
export const OPTIONS = withCors(async () => new Response(null, { status: 204 }));