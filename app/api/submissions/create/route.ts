import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

import { createSubmissionAction } from '@/actions/db/submissions-actions'
import { getEIP712Domain } from '@/lib/ethereum/signature-utils'

/**
 * POST /api/submissions/create
 * JSON body:
 * {
 *   "projectId": string,
 *   "freelancerAddress": string,
 *   "prLink": string,
 *   "signature": string,     // EIP-712 signature
 *   "nonce": number          // Timestamp nonce
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // e.g.: { projectId: "uuid", freelancerAddress: "0x123...", prLink: "https://github.com/owner/repo/pull/123" }
    const { projectId, freelancerAddress, prLink, signature, nonce } = body

    // Validate:
    if (!projectId || !freelancerAddress || !prLink) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify signature if provided
    if (signature && nonce) {
      // Define EIP-712 typed data
      const domain = getEIP712Domain()
      
      const types = {
        SubmissionCreate: [
          { name: 'projectId', type: 'string' },
          { name: 'freelancerAddress', type: 'address' },
          { name: 'prLink', type: 'string' },
          { name: 'nonce', type: 'uint256' }
        ]
      }
      
      const value = {
        projectId,
        freelancerAddress,
        prLink,
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
        if (recoveredAddress.toLowerCase() !== freelancerAddress.toLowerCase()) {
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
      // For backward compatibility, allow submission without signature during development
      console.warn('Submission creation attempted without signature - this should be disallowed in production')
    }

    // Use your existing "createSubmissionAction"
    const result = await createSubmissionAction({
      projectId: projectId,
      freelancerAddress: freelancerAddress,
      prLink: prLink,
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