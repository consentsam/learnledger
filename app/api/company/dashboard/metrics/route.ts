/**
 * @file app/api/company/dashboard/metrics/route.ts
 *
 * @description
 * Provides an API endpoint to fetch "company" dashboard metrics, either via GET
 * query parameters or POST JSON body. We treat `walletEns` as the primary key
 * for the company. If no matching row by `walletEns` is found, we fallback to
 * matching by `walletAddress`.
 *
 * Example requests:
 *   -- GET --
 *   GET /api/company/dashboard/metrics?walletEns=someEns&walletAddress=0xABC
 *
 *   -- POST --
 *   POST /api/company/dashboard/metrics
 *   {
 *     "role": "company",
 *     "walletEns": "someEns",
 *     "walletAddress": "0xABC",
 *     "timeframe": "24h"
 *   }
 *
 * Return shape (example):
 * {
 *   "isSuccess": true,
 *   "totalSubmissions": number,
 *   "approvedSubmissions": number,
 *   "rejectedSubmissions": number,
 *   "totalProjects": number,
 *   "activeProjects": number,
 *   "closedProjects": number,
 *   "pullRequests": {
 *     "timeFrame": "24h",
 *     "count": number,
 *     "growthPercent": number
 *   },
 *   "statsUpdatedAt": string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withCors } from '@/lib/cors'
import { db } from '@/db/db'
import { companyTable } from '@/db/schema/company-schema'
import { projectsTable } from '@/db/schema/projects-schema'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { eq, sql } from 'drizzle-orm'

async function handleCompanyDashboardMetrics(req: NextRequest) {
  try {
    let walletEns = ''
    let walletAddress = ''
    let timeframe = '24h'

    // 1) parse from GET or POST
    if (req.method === 'GET') {
      const url = new URL(req.url)
      walletEns = (url.searchParams.get('walletEns') || '').trim().toLowerCase()
      walletAddress = (url.searchParams.get('walletAddress') || '').trim().toLowerCase()
      timeframe = (url.searchParams.get('timeframe') || '24h').toLowerCase().trim()
    } else {
      // POST
      try {
        const body = await req.json()
        console.log('[Company Metrics] Received body:', JSON.stringify(body))
        walletEns = (body.walletEns || '').trim().toLowerCase()
        walletAddress = (body.walletAddress || '').trim().toLowerCase()
        timeframe = (body.timeframe || '24h').toLowerCase().trim()
      } catch (parseError) {
        console.error('[Company Metrics] Error parsing request body:', parseError)
        return NextResponse.json({
          isSuccess: false,
          message: 'Invalid request body format'
        }, { status: 400 })
      }
    }

    console.log('[Company Metrics] walletEns:', walletEns, ' walletAddress:', walletAddress)

    // Check if either walletEns or walletAddress is provided
    if (!walletEns && !walletAddress) {
      return NextResponse.json({
        isSuccess: false,
        message: 'Either walletEns or walletAddress must be provided'
      }, { status: 400 })
    }

    // 2) Find the company by ENS first
    let companyRecord: any = null

    if (walletEns) {
      const [byEns] = await db
        .select()
        .from(companyTable)
        .where(eq(companyTable.walletEns, walletEns))
        .limit(1)
      if (byEns) {
        companyRecord = byEns
      }
    }

    // fallback if not found or empty
    if (!companyRecord && walletAddress) {
      const [byAddr] = await db
        .select()
        .from(companyTable)
        .where(eq(companyTable.walletAddress, walletAddress))
        .limit(1)
      if (byAddr) {
        companyRecord = byAddr
      }
    }

    // If still no record => 404
    if (!companyRecord) {
      return NextResponse.json({
        isSuccess: false,
        message: `No company found for walletEns=${walletEns || ''} or walletAddress=${walletAddress || ''}`
      }, { status: 404 })
    }

    const finalWalletAddress = companyRecord.walletAddress.toLowerCase()

    // 3) find all projects
    const allProjects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.projectOwner, finalWalletAddress))

    const totalProjects = allProjects.length
    const closedProjects = allProjects.filter(p => p.projectStatus === 'closed').length
    const activeProjects = allProjects.filter(p => p.projectStatus === 'open').length

    if (totalProjects === 0) {
      // trivial
      return NextResponse.json({
        isSuccess: true,
        totalSubmissions: 0,
        approvedSubmissions: 0,
        rejectedSubmissions: 0,
        totalProjects,
        activeProjects,
        closedProjects,
        pullRequests: {
          timeFrame: timeframe,
          count: 0,
          growthPercent: 0
        },
        statsUpdatedAt: new Date().toISOString()
      }, { status: 200 })
    }

    // 4) find all submissions for these projects
    const projectIds = allProjects.map(p => p.id)
    const submissions = await db
      .select()
      .from(projectSubmissionsTable)
      .where(sql`${projectSubmissionsTable.projectId} = ANY(${projectIds})`)

    const totalSubmissions = submissions.length
    const approvedSubmissions = submissions.filter(s => s.status === 'approved').length
    const rejectedSubmissions = submissions.filter(s => s.status === 'rejected').length

    // 5) timeframe logic: parse "24h" -> hours
    let hours = 24
    if (timeframe.endsWith('h')) {
      const val = parseInt(timeframe, 10)
      hours = isNaN(val) ? 24 : val
    } else if (timeframe.endsWith('d')) {
      const val = parseInt(timeframe, 10)
      hours = isNaN(val) ? 24 : val * 24
    }

    const now = new Date()
    const dateCutoff = new Date(now.getTime() - hours * 3600_000)
    const recentSubs = submissions.filter(s => s.createdAt > dateCutoff)

    // growth comparison: previous hours
    const prevPeriodStart = new Date(now.getTime() - 2 * hours * 3600_000)
    const prevPeriodEnd = dateCutoff
    const prevSubs = submissions.filter(s => s.createdAt >= prevPeriodStart && s.createdAt <= prevPeriodEnd)

    const pullRequestsCount = recentSubs.length
    let growthPercent = 0
    if (prevSubs.length > 0) {
      growthPercent = ((pullRequestsCount - prevSubs.length) / prevSubs.length) * 100
    }

    // 6) Return final JSON
    return NextResponse.json({
      isSuccess: true,
      totalSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      totalProjects,
      activeProjects,
      closedProjects,
      pullRequests: {
        timeFrame: timeframe,
        count: pullRequestsCount,
        growthPercent: Math.round(growthPercent)
      },
      statsUpdatedAt: new Date().toISOString()
    }, { status: 200 })
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
export const OPTIONS = withCors(async () => new Response(null, { status: 204 }))