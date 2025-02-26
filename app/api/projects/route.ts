import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { createProjectAction } from '@/actions/db/projects-actions'
import { db } from '@/db/db'
import { projectsTable } from '@/db/schema/projects-schema'

/**
 * GET /api/projects?owner=0xABC (optional)
 * If no owner param, returns all projects. 
 * If owner param present, filter by projectOwner=owner
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const owner = searchParams.get('owner')

    const baseQuery = db.select().from(projectsTable)
    const rows = await (owner ? baseQuery.where(eq(projectsTable.projectOwner, owner)) : baseQuery)

    return NextResponse.json(rows, { status: 200 })
  } catch (error) {
    console.error('[GET /api/projects] Error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.walletAddress || !body.projectName) {
      return NextResponse.json(
        { message: 'Missing walletAddress or projectName' },
        { status: 400 }
      )
    }

    const result = await createProjectAction({
      walletAddress: body.walletAddress,
      projectName: body.projectName,
      projectDescription: body.projectDescription ?? '',
      projectRepo: body.projectRepo ?? '',
      prizeAmount: body.prizeAmount ?? 0,
      requiredSkills: body.requiredSkills ?? '',
      completionSkills: body.completionSkills ?? '',
    })

    if (!result.isSuccess) {
      return NextResponse.json(
        { message: result.message || 'Failed to create project.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Project created successfully', data: result.data },
      { status: 200 }
    )
  } catch (error) {
    console.error('[POST /api/projects] Error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}