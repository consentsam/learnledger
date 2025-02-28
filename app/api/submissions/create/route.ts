import { NextRequest, NextResponse } from 'next/server'

import { createSubmissionAction } from '@/actions/db/submissions-actions'

/**
 * POST /api/submissions/create
 * JSON body:
 * {
 *   "projectId": string,
 *   "freelancerAddress": string,
 *   "prLink": string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // e.g.: { projectId: "uuid", freelancerAddress: "0x123...", prLink: "https://github.com/owner/repo/pull/123" }

    // Validate:
    if (!body.projectId || !body.freelancerAddress || !body.prLink) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use your existing "createSubmissionAction"
    const result = await createSubmissionAction({
      projectId: body.projectId,
      freelancerAddress: body.freelancerAddress,
      prLink: body.prLink,
    })

    if (!result.isSuccess) {
      return NextResponse.json({ isSuccess: false, message: result.message }, { status: 400 })
    }

    return NextResponse.json({ isSuccess: true, data: result.data }, { status: 200 })
  } catch (error) {
    console.error('Error [POST /api/submissions/create]:', error)
    return NextResponse.json({ isSuccess: false, message: 'Internal server error' }, { status: 500 })
  }
}