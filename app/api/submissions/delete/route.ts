import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { ethers } from 'ethers'

import { db } from '@/db/db'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { projectsTable } from '@/db/schema/projects-schema'
import { getEIP712Domain } from '@/lib/ethereum/signature-utils'

/**
 * POST /api/submissions/delete
 * Body:
 * {
 *   "submissionId": string,
 *   "walletAddress": string,
 *   "signature": string,
 *   "nonce": number
 * }
 *
 * Allows either the projectOwner or the freelancer to delete the submission.
 * Requires a valid EIP-712 signature from the wallet to prove ownership.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { submissionId, walletAddress, signature, nonce } = body

    if (!submissionId || !walletAddress) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing submissionId or walletAddress' },
        { status: 400 }
      )
    }

    if (!signature || !nonce) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing signature or nonce' },
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

    // 3) Verify the signature using EIP-712
    const domain = getEIP712Domain()

    const types = {
      DeleteSubmission: [
        { name: 'submissionId', type: 'string' },
        { name: 'projectId', type: 'string' },
        { name: 'walletAddress', type: 'address' },
        { name: 'nonce', type: 'uint256' }
      ]
    }

    // The data that was signed
    const value = {
      submissionId: submissionId,
      projectId: submission.projectId,
      walletAddress: walletAddress,
      nonce: nonce
    }

    try {
      // Recover the address that signed the data using ethers v6
      const recoveredAddress = ethers.verifyTypedData(
        domain,
        types,
        value,
        signature
      );

      // Check if the recovered address matches the claimed wallet address
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

    // 4) check ownership or submitter
    const isOwner = project.projectOwner.toLowerCase() === walletAddress.toLowerCase()
    const isSubmitter = submission.freelancerAddress.toLowerCase() === walletAddress.toLowerCase()

    if (!isOwner && !isSubmitter) {
      return NextResponse.json(
        { isSuccess: false, message: 'Not authorized to delete this submission' },
        { status: 403 }
      )
    }

    // 5) Perform delete
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