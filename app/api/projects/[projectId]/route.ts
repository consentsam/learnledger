import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db/db'
import { projectsTable } from '@/db/schema/projects-schema'
import { companyTable } from '@/db/schema/company-schema'

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

/** PUT /api/projects/[projectId] - existing code (update) **/
export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId
    const body = await req.json()

    const { projectName, projectDescription, prizeAmount, requiredSkills, completionSkills, projectRepo } = body

    if (!projectName) {
      return NextResponse.json(
        { message: 'Project name is required' },
        { status: 400 }
      )
    }

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

    if (!updated) {
      return NextResponse.json(
        { isSuccess: false, message: 'No matching project or update failed' },
        { status: 404 }
      )
    }

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
 * Requires body: { walletAddress: string } to verify the user is the project owner.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId
    const body = await req.json()
    const { walletAddress } = body
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

    // 3) Delete
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
