// app/api/userProfile/route.ts
import { NextRequest, NextResponse } from 'next/server'

import { getUserProfileAction } from '@/actions/db/user-profile-actions'

// We import the DB and tables to do manual updates and deletes:
import { db } from '@/db/db'
import { companyTable } from '@/db/schema/company-schema'
import { freelancerTable } from '@/db/schema/freelancer-schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/userProfile?wallet=0x...&role=company|freelancer
 * (already exists in your code)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')?.toLowerCase()
    const role = searchParams.get('role') // "company" or "freelancer"

    if (!wallet || !role) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing wallet or role param' },
        { status: 400 }
      )
    }

    const result = await getUserProfileAction({
      walletAddress: wallet,
      role: role as 'company' | 'freelancer',
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('[GET userProfile] Error:', error)
    return NextResponse.json(
      { isSuccess: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/userProfile
 * Update a user profile.
 * 
 * Body JSON should contain:
 * {
 *   "role": "company" or "freelancer",
 *   "walletAddress": "0xYourAddress",
 *   ...fields to update...
 * }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { role, walletAddress } = body

    if (!role || !walletAddress) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing role or walletAddress' },
        { status: 400 }
      )
    }
    const lowerWallet = walletAddress.toLowerCase()

    // We'll do a quick check if user already exists
    if (role === 'company') {
      const [existing] = await db
        .select()
        .from(companyTable)
        .where(eq(companyTable.walletAddress, lowerWallet))

      if (!existing) {
        return NextResponse.json(
          { isSuccess: false, message: 'No matching company profile found' },
          { status: 404 }
        )
      }

      // Prepare an object of updated fields
      // (only update if present in body)
      const updateData: Record<string, any> = {}
      if (typeof body.companyName === 'string') {
        updateData.companyName = body.companyName
      }
      if (typeof body.shortDescription === 'string') {
        updateData.shortDescription = body.shortDescription
      }
      if (typeof body.logoUrl === 'string') {
        updateData.logoUrl = body.logoUrl
      }

      // If nothing to update, bail out
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { isSuccess: false, message: 'No valid fields provided' },
          { status: 400 }
        )
      }

      // Perform update
      const [updated] = await db
        .update(companyTable)
        .set(updateData)
        .where(eq(companyTable.walletAddress, lowerWallet))
        .returning()

      return NextResponse.json({ isSuccess: true, data: updated })
    } else {
      // role = 'freelancer'
      const [existing] = await db
        .select()
        .from(freelancerTable)
        .where(eq(freelancerTable.walletAddress, lowerWallet))

      if (!existing) {
        return NextResponse.json(
          { isSuccess: false, message: 'No matching freelancer profile found' },
          { status: 404 }
        )
      }

      const updateData: Record<string, any> = {}
      if (typeof body.freelancerName === 'string') {
        updateData.freelancerName = body.freelancerName
      }
      if (typeof body.skills === 'string') {
        updateData.skills = body.skills
      }
      if (typeof body.profilePicUrl === 'string') {
        updateData.profilePicUrl = body.profilePicUrl
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { isSuccess: false, message: 'No valid fields provided' },
          { status: 400 }
        )
      }

      const [updated] = await db
        .update(freelancerTable)
        .set(updateData)
        .where(eq(freelancerTable.walletAddress, lowerWallet))
        .returning()

      return NextResponse.json({ isSuccess: true, data: updated })
    }
  } catch (error) {
    console.error('[PUT userProfile] Error:', error)
    return NextResponse.json(
      { isSuccess: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/userProfile
 * 
 * Body JSON:
 * {
 *   "role": "company" | "freelancer",
 *   "walletAddress": "0x..."
 * }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { role, walletAddress } = body

    if (!role || !walletAddress) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing role or walletAddress' },
        { status: 400 }
      )
    }
    const lowerWallet = walletAddress.toLowerCase()

    if (role === 'company') {
      // check existence
      const [existing] = await db
        .select()
        .from(companyTable)
        .where(eq(companyTable.walletAddress, lowerWallet))

      if (!existing) {
        return NextResponse.json(
          { isSuccess: false, message: 'No matching company found' },
          { status: 404 }
        )
      }

      // delete
      await db
        .delete(companyTable)
        .where(eq(companyTable.walletAddress, lowerWallet))

      return NextResponse.json({ isSuccess: true, message: 'Company profile deleted' })
    } else {
      // role = 'freelancer'
      const [existing] = await db
        .select()
        .from(freelancerTable)
        .where(eq(freelancerTable.walletAddress, lowerWallet))

      if (!existing) {
        return NextResponse.json(
          { isSuccess: false, message: 'No matching freelancer found' },
          { status: 404 }
        )
      }

      await db
        .delete(freelancerTable)
        .where(eq(freelancerTable.walletAddress, lowerWallet))

      return NextResponse.json({ isSuccess: true, message: 'Freelancer profile deleted' })
    }
  } catch (error) {
    console.error('[DELETE userProfile] Error:', error)
    return NextResponse.json(
      { isSuccess: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
