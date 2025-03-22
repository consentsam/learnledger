// file: /app/api/submissions/approve/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { approveSubmissionAction } from '@/actions/db/projects-actions'
import { db } from '@/db/db'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { projectsTable } from '@/db/schema/projects-schema'

/**
 * POST /api/submissions/approve
 * Body:
 * {
 *   "submissionId": string,
 *   "companyWallet": string  // must match the project owner
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { submissionId, companyWallet } = body

    if (!submissionId || !companyWallet) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing submissionId or companyWallet' },
        { status: 400 }
      )
    }

    // 1) Fetch the submission
    const [submission] = await db
      .select()
      .from(projectSubmissionsTable)
      .where(eq(projectSubmissionsTable.id, submissionId))
      .limit(1)

    if (!submission) {
      return NextResponse.json(
        { isSuccess: false, message: 'Submission not found' },
        { status: 404 }
      )
    }

    // 2) Approve
    const result = await approveSubmissionAction({
      projectId: submission.projectId,
      freelancerAddress: submission.freelancerAddress, // keep internal name
      companyWallet: companyWallet
    })

    if (!result.isSuccess) {
      return NextResponse.json(
        { isSuccess: false, message: result.message },
        { status: 400 }
      )
    }

    // 3) Mark submission as merged
    await db
      .update(projectSubmissionsTable)
      .set({ isMerged: true })
      .where(eq(projectSubmissionsTable.id, submissionId))

    return NextResponse.json(
      { isSuccess: true, message: 'Submission approved successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[POST /api/submissions/approve] Error:', error)
    return NextResponse.json(
      { isSuccess: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}