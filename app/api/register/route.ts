// app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { registerUserProfileAction } from '@/actions/db/user-profile-actions'
import { getEIP712Domain } from '@/lib/ethereum/signature-utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.walletAddress || !body.role) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing walletAddress or role' },
        { status: 400 }
      )
    }

    // Verify signature if provided
    if (body.signature && body.nonce) {
      const { walletAddress, role, signature, nonce } = body

      // Define EIP-712 typed data
      const domain = getEIP712Domain()
      
      const types = {
        UserRegistration: [
          { name: 'walletAddress', type: 'address' },
          { name: 'role', type: 'string' },
          { name: 'nonce', type: 'uint256' }
        ]
      }
      
      const value = {
        walletAddress,
        role,
        nonce
      }

      try {
        // Recover the signer's address from the signature
        const recoveredAddress = ethers.verifyTypedData(
          domain,
          types,
          value,
          signature
        )

        // Verify the recovered address matches the claimed wallet address
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          return NextResponse.json(
            { isSuccess: false, message: 'Invalid signature' },
            { status: 403 }
          )
        }
      } catch (error) {
        console.error('Signature verification failed:', error)
        return NextResponse.json(
          { isSuccess: false, message: 'Invalid signature format' },
          { status: 403 }
        )
      }
    } else {
      // For backward compatibility, allow registration without signature during development
      console.warn('Registration attempted without signature - this should be disallowed in production')
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

    // Return the new row's id so the client can redirect properly
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