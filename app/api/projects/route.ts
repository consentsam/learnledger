// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { db } from '@/db/db'
import { projectsTable } from '@/db/schema/projects-schema'
import { eq, and, sql } from 'drizzle-orm'
import { SQL } from 'drizzle-orm/sql'

import { createProjectAction } from '@/actions/db/projects-actions'
import { getEIP712Domain } from '@/lib/ethereum/signature-utils'

/**
 * GET /api/projects
 * Fetches (optionally filtered) projects, e.g. ?status=open&skill=React&minPrize=100&maxPrize=1000
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const skill = searchParams.get('skill')
    const minPrize = searchParams.get('minPrize')
    const maxPrize = searchParams.get('maxPrize')

    const conditions: SQL[] = []

    if (status) {
      conditions.push(eq(projectsTable.projectStatus, status))
    }
    if (minPrize) {
      conditions.push(sql`${projectsTable.prizeAmount} >= ${minPrize}`)
    }
    if (maxPrize) {
      conditions.push(sql`${projectsTable.prizeAmount} <= ${maxPrize}`)
    }
    if (skill) {
      // e.g. where required_skills ilike '%React%'
      conditions.push(sql`${projectsTable.requiredSkills} ILIKE ${'%' + skill + '%'}`)
    }

    const rows = await (conditions.length === 0
      ? db.select().from(projectsTable)
      : db.select().from(projectsTable).where(conditions.length === 1
          ? conditions[0]
          : and(...conditions)))

    return NextResponse.json({ isSuccess: true, data: rows })
  } catch (err) {
    console.error('GET /api/projects error:', err)
    return NextResponse.json(
      { isSuccess: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects
 * Creates a new project. Body should contain:
 * {
 *   walletAddress: string
 *   projectName: string
 *   projectDescription?: string
 *   projectRepo?: string
 *   prizeAmount?: number
 *   requiredSkills?: string
 *   completionSkills?: string
 *   signature?: string // EIP-712 signature
 *   nonce?: number // Timestamp nonce
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      walletAddress, 
      projectName, 
      projectDescription, 
      prizeAmount, 
      signature, 
      nonce 
    } = body

    // Basic validation
    if (!walletAddress || !projectName) {
      return NextResponse.json(
        { isSuccess: false, message: 'Missing required fields: walletAddress or projectName' },
        { status: 400 }
      )
    }

    // Verify signature if provided
    if (signature && nonce) {
      // Define EIP-712 typed data
      const domain = getEIP712Domain()
      
      const types = {
        ProjectCreation: [
          { name: 'walletAddress', type: 'address' },
          { name: 'projectName', type: 'string' },
          { name: 'projectDescription', type: 'string' },
          { name: 'prizeAmount', type: 'string' },
          { name: 'nonce', type: 'uint256' }
        ]
      }
      
      const value = {
        walletAddress,
        projectName,
        projectDescription: projectDescription || '',
        prizeAmount: (prizeAmount || 0).toString(),
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
      // For backward compatibility, allow creation without signature during development
      console.warn('Project creation attempted without signature - this should be disallowed in production')
    }

    // Instead of direct DB insert, call your server action for consistency
    const result = await createProjectAction(body)

    if (!result.isSuccess) {
      return NextResponse.json(
        { isSuccess: false, message: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { isSuccess: true, data: result.data },
      { status: 200 }
    )
  } catch (err) {
    console.error('POST /api/projects error:', err)
    return NextResponse.json(
      { isSuccess: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}