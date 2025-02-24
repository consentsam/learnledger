/**
 * @file route.ts
 *
 * @description
 * A Next.js API route to create a project in our "projects" table.
 * It receives a JSON POST body with the following fields:
 *   - walletAddress
 *   - projectName
 *   - projectDescription
 *   - prizeAmount
 *   - requiredSkills
 *
 * Then it calls the existing `createProjectAction` server action to insert a record.
 *
 * Key features:
 * - Validates required fields (walletAddress, projectName)
 * - Calls server action for DB insert
 * - Returns HTTP status 200 with the inserted record on success, or 400/500 on failure
 *
 * @dependencies
 * - createProjectAction from "@/actions/db/projects-actions"
 * - Next.js Request/Response types from "next/server"
 *
 * @notes
 * - This is a minimal API route with basic error handling and field checks.
 * - The client form in `create-project-form.tsx` posts to this route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createProjectAction } from '@/actions/db/projects-actions'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Basic validations
    if (!body.walletAddress || !body.projectName) {
      return NextResponse.json(
        { message: 'Missing required fields (walletAddress, projectName)' },
        { status: 400 }
      )
    }

    const result = await createProjectAction({
      walletAddress: body.walletAddress,
      projectName: body.projectName,
      projectDescription: body.projectDescription || '',
      projectLink: '', // optional, not currently collected
      prizeAmount: body.prizeAmount || 0,
      requiredSkills: body.requiredSkills || '',
    })

    if (!result.isSuccess) {
      return NextResponse.json(
        { message: result.message || 'Failed to create project.' },
        { status: 500 }
      )
    }

    // Success
    return NextResponse.json(
      { message: 'Project created successfully', data: result.data },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in create project API:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
