import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/db/db'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'

/**
 * POST /api/submissions/read
 * 
 * Body can optionally include:
 * {
 *   "submissionId": string  // if provided, fetch a single submission
 * }
 * 
 * If "submissionId" is provided, returns just that submission.
 * Otherwise returns all.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // If user provides a "submissionId", we fetch only that one:
    if (body.submissionId) {
      const [submission] = await db
        .select()
        .from(projectSubmissionsTable)
        .where(eq(projectSubmissionsTable.id, body.submissionId))
        .limit(1)

      if (!submission) {
        return NextResponse.json(
          { isSuccess: false, message: 'Submission not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ isSuccess: true, data: submission })
    } else {
      // otherwise, return all
      const allSubs = await db
        .select()
        .from(projectSubmissionsTable)

      return NextResponse.json({ isSuccess: true, data: allSubs })
    }
  } catch (error) {
    console.error('Error [POST /api/submissions/read]:', error)
    return NextResponse.json({ isSuccess: false, message: 'Internal server error' }, { status: 500 })
  }
}