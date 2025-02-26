import { NextRequest, NextResponse } from 'next/server'

import { approveSubmissionAction } from '@/actions/db/projects-actions'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await approveSubmissionAction({
      projectId: body.projectId,
      studentAddress: body.studentAddress,
      walletAddress: body.walletAddress
    })

    if (!result.isSuccess) {
      return NextResponse.json(
        { message: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Approved successfully' },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
} 