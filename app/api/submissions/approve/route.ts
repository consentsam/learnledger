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
 *   "walletAddress": string  // must match projectOwner
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { submissionId, walletAddress } = body

    if (!submissionId || !walletAddress) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing submissionId or walletAddress' },
        { status: 400 }
      )
    }

    // 1) Fetch submission
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

    // 2) Fetch project
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, submission.projectId))
      .limit(1)
    if (!project) {
      return NextResponse.json(
        { isSuccess: false, message: 'Project not found' },
        { status: 404 }
      )
    }

    // 3) Must match projectOwner
    if (project.projectOwner.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { isSuccess: false, message: 'Only the project owner can approve' },
        { status: 403 }
      )
    }

    // 4) Check if already closed or merged
    if (project.projectStatus === 'closed') {
      return NextResponse.json(
        { isSuccess: false, message: 'Project is already closed.' },
        { status: 400 }
      )
    }
    if (submission.isMerged) {
      return NextResponse.json(
        { isSuccess: false, message: 'Submission is already merged/approved.' },
        { status: 400 }
      )
    }

    // 5) Do the approval (awards tokens & skills, closes project)
    const result = await approveSubmissionAction({
      projectId: project.id,
      freelancerAddress: submission.freelancerAddress,
      walletAddress: walletAddress,
    })

    if (!result.isSuccess) {
      return NextResponse.json(
        { isSuccess: false, message: result.message },
        { status: 400 }
      )
    }

    // 6) Mark submission as isMerged = true
    await db
      .update(projectSubmissionsTable)
      .set({ isMerged: true })
      .where(eq(projectSubmissionsTable.id, submissionId))

    return NextResponse.json(
      { isSuccess: true, message: 'Submission approved successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error [POST /api/submissions/approve]:', error)
    return NextResponse.json(
      { isSuccess: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}