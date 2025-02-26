import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db/db'
import { projectsTable } from '@/db/schema/projects-schema'

/**
 * GET /api/projects/:projectId
 * Returns a single project by ID
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))

    if (!project) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ data: project }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/projects/:id] Error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/projects/:projectId
 * Update existing project
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await req.json()
    const projectId = params.projectId

    // First fetch the project:
    const [existing] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1)
    if (!existing) {
      return NextResponse.json(
        { message: 'Project not found' },
        { status: 404 }
      )
    }

    if (existing.projectStatus === "closed") {
      return NextResponse.json(
        { message: 'Cannot edit a closed project' },
        { status: 400 }
      )
    }

    // If it's open, proceed
    const [updated] = await db
      .update(projectsTable)
      .set({
        projectName: body.projectName,
        projectDescription: body.projectDescription,
        prizeAmount: body.prizeAmount?.toString() ?? '0',
        requiredSkills: body.requiredSkills,
        completionSkills: body.completionSkills,
      })
      .where(eq(projectsTable.id, projectId))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { message: 'Project not found or no update' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (error) {
    console.error('[PUT /api/projects/:id] Error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/:projectId
 * If you want to remove a project, implement here.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
}