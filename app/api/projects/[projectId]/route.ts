import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

import { db } from '@/db/db'
import { projectsTable } from '@/db/schema/projects-schema'
import { companyTable } from '@/db/schema/company-schema'
import { getEIP712Domain } from '@/lib/ethereum/signature-utils'

/** GET /api/projects/[projectId] - existing code  **/
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params

    const [row] = await db
      .select({
        id: projectsTable.id,
        projectName: projectsTable.projectName,
        projectDescription: projectsTable.projectDescription,
        prizeAmount: projectsTable.prizeAmount,
        projectStatus: projectsTable.projectStatus,
        projectOwner: projectsTable.projectOwner,
        requiredSkills: projectsTable.requiredSkills,
        completionSkills: projectsTable.completionSkills,
        assignedFreelancer: projectsTable.assignedFreelancer,
        projectRepo: projectsTable.projectRepo,
        createdAt: projectsTable.createdAt,
        updatedAt: projectsTable.updatedAt,
        // Company fields
        companyId: companyTable.id,
        companyName: companyTable.companyName,
      })
      .from(projectsTable)
      .leftJoin(
        companyTable,
        eq(projectsTable.projectOwner, companyTable.walletAddress)
      )
      .where(eq(projectsTable.id, projectId))
      .limit(1)

    if (!row) {
      return NextResponse.json(
        { isSuccess: false, message: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ isSuccess: true, data: row }, { status: 200 })
  } catch (err) {
    console.error('Error in GET /api/projects/[projectId]:', err)
    return NextResponse.json(
      { isSuccess: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/** PUT /api/projects/[projectId] 
 * Updates a project.
 * Request body should contain:
 * - projectName: string (required)
 * - projectDescription?: string
 * - prizeAmount?: number|string
 * - requiredSkills?: string
 * - completionSkills?: string
 * - projectRepo?: string
 * - walletAddress: string (required, must match project owner)
 * - signature?: string (EIP-712 signature)
 * - nonce?: number (timestamp nonce)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId
    const body = await req.json()

    const { 
      projectName, 
      projectDescription, 
      prizeAmount, 
      requiredSkills, 
      completionSkills, 
      projectRepo,
      walletAddress,
      signature,
      nonce
    } = body

    if (!projectName || !walletAddress) {
      return NextResponse.json(
        { isSuccess: false, message: 'Project name and wallet address are required' },
        { status: 400 }
      )
    }
    
    // 1) First check if the project exists and if the requester is the owner
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1)
      
    if (!project) {
      return NextResponse.json(
        { isSuccess: false, message: 'Project not found' },
        { status: 404 }
      )
    }
    
    // Check ownership
    if (project.projectOwner.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { isSuccess: false, message: 'Only the owner can update this project' },
        { status: 403 }
      )
    }

    // 2) Verify signature if provided
    if (signature && nonce) {
      // Define EIP-712 typed data
      const domain = getEIP712Domain()
      
      const types = {
        ProjectUpdate: [
          { name: 'projectId', type: 'string' },
          { name: 'walletAddress', type: 'address' },
          { name: 'projectName', type: 'string' },
          { name: 'nonce', type: 'uint256' }
        ]
      }
      
      const value = {
        projectId,
        walletAddress,
        projectName,
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
      // For backward compatibility, allow updates without signature during development
      console.warn('Project update attempted without signature - this should be disallowed in production')
    }

    // 3) Perform the update
    const [updated] = await db
      .update(projectsTable)
      .set({
        projectName,
        projectDescription,
        prizeAmount: prizeAmount?.toString() || '0',
        requiredSkills,
        completionSkills,
        projectRepo,
        updatedAt: new Date(),
      })
      .where(eq(projectsTable.id, projectId))
      .returning()

    return NextResponse.json({ isSuccess: true, data: updated }, { status: 200 })
  } catch (err) {
    console.error('Error in PUT /api/projects/[projectId]:', err)
    return NextResponse.json(
      { isSuccess: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[projectId]
 * Requires body: 
 * {
 *   walletAddress: string, // must match project owner
 *   signature?: string,   // EIP-712 signature
 *   nonce?: number        // Timestamp nonce
 * }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId
    const body = await req.json()
    const { walletAddress, signature, nonce } = body
    if (!walletAddress) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing walletAddress in request body' },
        { status: 400 }
      )
    }

    // 1) find project
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))

    if (!project) {
      return NextResponse.json(
        { isSuccess: false, message: 'Project not found' },
        { status: 404 }
      )
    }

    // 2) check ownership
    if (project.projectOwner.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { isSuccess: false, message: 'Only the owner can delete this project' },
        { status: 403 }
      )
    }

    // 3) Verify signature if provided
    if (signature && nonce) {
      // Define EIP-712 typed data
      const domain = getEIP712Domain()
      
      const types = {
        ProjectDelete: [
          { name: 'projectId', type: 'string' },
          { name: 'walletAddress', type: 'address' },
          { name: 'nonce', type: 'uint256' }
        ]
      }
      
      const value = {
        projectId,
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
      console.warn('Project deletion attempted without signature - this should be disallowed in production')
    }

    // 4) Delete
    await db.delete(projectsTable).where(eq(projectsTable.id, projectId))

    return NextResponse.json({
      isSuccess: true,
      message: `Project ${projectId} deleted.`,
    })
  } catch (error) {
    console.error('Error in DELETE /api/projects/[projectId]:', error)
    return NextResponse.json(
      { isSuccess: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
