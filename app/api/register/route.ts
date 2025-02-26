// app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { registerUserProfileAction } from '@/actions/db/user-profile-actions'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.walletAddress || !body.role) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing walletAddress or role' },
        { status: 400 }
      )
    }

    // This calls our updated user-profile-actions code
    const result = await registerUserProfileAction({
      role: body.role,
      walletAddress: body.walletAddress,
      companyName: body.companyName,
      shortDescription: body.shortDescription,
      logoUrl: body.logoUrl,
      freelancerName: body.freelancerName,
      skills: body.skills,
      profilePicUrl: body.profilePicUrl,
    })

    if (!result.isSuccess || !result.data) {
      return NextResponse.json(
        { isSuccess: false, message: result.message || 'Failed to register user profile' },
        { status: 400 }
      )
    }

    // Return the new row’s id so the client can redirect properly
    return NextResponse.json(
      { isSuccess: true, data: result.data.id },
      { status: 200 }
    )
  } catch (error) {
    console.error('[POST /api/register] Error:', error)
    return NextResponse.json(
      { isSuccess: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}