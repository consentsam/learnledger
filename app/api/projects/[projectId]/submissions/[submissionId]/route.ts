// File: app/api/projects/[projectId]/submissions/[submissionId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { ethers } from 'ethers'

import { db } from '@/db/db'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { projectsTable } from '@/db/schema/projects-schema'
import { getEIP712Domain } from '@/lib/ethereum/signature-utils'

export async function PATCH(
    req: NextRequest,
    { params }: { params: { projectId: string; submissionId: string } }
  ) {
    try {
      const body = await req.json()
      const { walletAddress, prLink } = body
  
      if (!walletAddress) {
        return NextResponse.json(
          { isSuccess: false, message: 'Missing walletAddress' },
          { status: 400 }
        )
      }
      if (!prLink) {
        return NextResponse.json(
          { isSuccess: false, message: 'No prLink provided' },
          { status: 400 }
        )
      }
  
      // 1) Check submission
      const [submission] = await db
        .select()
        .from(projectSubmissionsTable)
        .where(eq(projectSubmissionsTable.id, params.submissionId))
        .limit(1)
  
      if (!submission) {
        return NextResponse.json(
          { isSuccess: false, message: 'Submission not found' },
          { status: 404 }
        )
      }
  
      // 2) Must be the freelancer who created it 
      //    (or possibly the project owner if you want to allow that).
      //    For now, let's keep it as the original code.
      if (
        submission.freelancerAddress.toLowerCase() !== walletAddress.toLowerCase()
      ) {
        return NextResponse.json(
          {
            isSuccess: false,
            message: 'Only the submission owner can update the PR link.',
          },
          { status: 403 }
        )
      }
  
      // 3) Update
      const [updated] = await db
        .update(projectSubmissionsTable)
        .set({ prLink })
        .where(eq(projectSubmissionsTable.id, params.submissionId))
        .returning()
  
      return NextResponse.json({ isSuccess: true, data: updated })
    } catch (error) {
      console.error('[PATCH submission] error:', error)
      return NextResponse.json(
        { isSuccess: false, message: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  export async function DELETE(
    req: NextRequest,
    { params }: { params: { projectId: string; submissionId: string } }
  ) {
    try {
      const body = await req.json()
      const { walletAddress, signature, nonce } = body
  
      if (!walletAddress) {
        return NextResponse.json(
          { isSuccess: false, message: 'Missing walletAddress in body' },
          { status: 400 }
        )
      }
  
      // 1) find submission
      const [submission] = await db
        .select()
        .from(projectSubmissionsTable)
        .where(eq(projectSubmissionsTable.id, params.submissionId))
        .limit(1)
  
      if (!submission) {
        return NextResponse.json(
          { isSuccess: false, message: 'Submission not found' },
          { status: 404 }
        )
      }
  
      // 2) find project
      const [project] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, params.projectId))
        .limit(1)
  
      if (!project) {
        return NextResponse.json(
          { isSuccess: false, message: 'Project not found' },
          { status: 404 }
        )
      }
  
      const isOwner =
        project.projectOwner.toLowerCase() === walletAddress.toLowerCase()
      const isSubmitter =
        submission.freelancerAddress.toLowerCase() === walletAddress.toLowerCase()
  
      // Decide who can delete this submission:
      if (!isOwner && !isSubmitter) {
        return NextResponse.json(
          { isSuccess: false, message: 'Not authorized to delete this submission' },
          { status: 403 }
        )
      }
  
      // 3) Verify signature if provided
      if (signature && nonce) {
        // Define EIP-712 typed data
        const domain = getEIP712Domain()
        
        const types = {
          SubmissionDelete: [
            { name: 'submissionId', type: 'string' },
            { name: 'projectId', type: 'string' },
            { name: 'walletAddress', type: 'address' },
            { name: 'nonce', type: 'uint256' }
          ]
        }
        
        const value = {
          submissionId: params.submissionId,
          projectId: params.projectId,
          walletAddress,
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
        // For backward compatibility, allow deletion without signature during development
        console.warn('Submission deletion attempted without signature - this should be disallowed in production')
      }
  
      // If you want to block deleting if submission is already merged, do:
      // if (submission.isMerged) {
      //   return NextResponse.json(
      //     { isSuccess: false, message: 'Cannot delete an already approved/merged submission' },
      //     { status: 400 }
      //   )
      // }
  
      // 4) Perform the delete
      await db
        .delete(projectSubmissionsTable)
        .where(eq(projectSubmissionsTable.id, params.submissionId))
  
      return NextResponse.json({
        isSuccess: true,
        message: `Submission ${params.submissionId} deleted successfully`,
      })
    } catch (error) {
      console.error('[DELETE submission] error:', error)
      return NextResponse.json(
        { isSuccess: false, message: 'Internal server error' },
        { status: 500 }
      )
    }
  }

