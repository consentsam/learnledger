// app/api/userProfile/route.ts
import { NextRequest, NextResponse } from 'next/server'

import { getUserProfileAction } from '@/actions/db/user-profile-actions'

export async function GET(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url)
      const wallet = searchParams.get('wallet')
      const role = searchParams.get('role') // "company" or "freelancer"
  
      if (!wallet || !role) {
        return NextResponse.json(
          { isSuccess: false, message: 'Missing wallet or role param' },
          { status: 400 }
        )
      }
  
      // Call the server action that we just verified is actually exported
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