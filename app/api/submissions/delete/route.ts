import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/db/db'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { projectsTable } from '@/db/schema/projects-schema'

/**
 * POST /api/submissions/delete
 * Body:
 * {
 *   "submissionId": string,
 *   "walletAddress": string
 * }
 *
 * Allows either the projectOwner or the freelancer to delete the submission.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { submissionId, walletAddress } = body
    // const walletAddressLower = walletAddress.toLowerCase()

    if (!submissionId || !walletAddress) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing submissionId or walletAddress' },
        { status: 400 }
      )
    }

    // 1) find the submission
    const [submission] = await db
      .select()
      .from(projectSubmissionsTable)
      .where(eq(projectSubmissionsTable.id, submissionId))
      .limit(1)
    if (!submission) {
      return NextResponse.json({ isSuccess: false, message: 'Submission not found' }, { status: 404 })
    }

    // 2) find the project
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, submission.projectId))
      .limit(1)
    if (!project) {
      return NextResponse.json({ isSuccess: false, message: 'Project not found' }, { status: 404 })
    }

    // 3) check ownership or submitter
    const isOwner = project.projectOwner.toLowerCase() === walletAddress.toLowerCase()
    const isSubmitter = submission.freelancerAddress.toLowerCase() === walletAddress.toLowerCase()

    if (!isOwner && !isSubmitter) {
      return NextResponse.json(
        { isSuccess: false, message: 'Not authorized to delete this submission' },
        { status: 403 }
      )
    }

    // Optional: block if isMerged => already approved
    // if (submission.isMerged) {
    //   return NextResponse.json(
    //     { isSuccess: false, message: 'Cannot delete an already merged submission' },
    //     { status: 400 }
    //   )
    // }

    // 4) Perform delete
    await db
      .delete(projectSubmissionsTable)
      .where(eq(projectSubmissionsTable.id, submissionId))

    return NextResponse.json(
      { isSuccess: true, message: 'Submission deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error [POST /api/submissions/delete]:', error)
    return NextResponse.json({ isSuccess: false, message: 'Internal server error' }, { status: 500 })
  }
}