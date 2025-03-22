/**
 * @file /app/api/projects/[projectId]/route.ts
 *
 * @description
 * Handles:
 *   - GET /api/projects/[projectId]
 *   - PUT /api/projects/[projectId]
 *   - DELETE /api/projects/[projectId]  <-- now supports using `walletEns` as well.
 *
 * Additional notes:
 *   - If `walletEns` is provided instead of `walletAddress`, we look up
 *     the corresponding `walletAddress` from the `companyTable` (because
 *     only a "company" can own a project).
 *   - If both are provided, we use `walletEns` first to confirm the owner's address
 *     (and you could cross-verify if needed).
 */

import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db/db'
import { projectsTable } from '@/db/schema/projects-schema'
import { companyTable } from '@/db/schema/company-schema'
import { withCors } from '@/lib/cors'

/** 
 * GET /api/projects/[projectId]
 * 
 * Fetch a single project by ID. 
 * Responds with:
 * {
 *   "isSuccess": true|false,
 *   "data": { ...project fields... }
 * }
 */
async function getProject(
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

        // Example of joined info if you need it
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

/**
 * PUT /api/projects/[projectId]
 * 
 * Updates a project.
 * Request body should contain:
 * - projectName: string (required)
 * - projectDescription?: string
 * - prizeAmount?: number|string
 * - requiredSkills?: string
 * - completionSkills?: string
 * - projectRepo?: string
 * - (EITHER) walletAddress: string (required) 
 *   OR walletEns: string (required if you do not pass walletAddress)
 *   because we treat 'walletEns' as the primary key in an ENS-based approach.
 */
async function updateProject(
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
      walletAddress,    // optional if you provide walletEns
      walletEns        // new field to handle "ENS is primary"
    } = body

    if (!projectName) {
      return NextResponse.json(
        { isSuccess: false, message: 'Project name is required' },
        { status: 400 }
      )
    }

    // Find the project first to determine ownership check method
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

    // Check ownership - account for different ways project_owner might be stored
    let isAuthorized = false;
    
    // Case 1: Direct match on ENS name
    if (walletEns && project.projectOwner.toLowerCase() === walletEns.toLowerCase()) {
      isAuthorized = true;
    } 
    // Case 2: Direct match on wallet address 
    else if (walletAddress && project.projectOwner.toLowerCase() === walletAddress.toLowerCase()) {
      isAuthorized = true;
    }
    // Case 3: ENS lookup needed (if project_owner is wallet address but user provided ENS)
    else if (walletEns && !isAuthorized) {
      // Look up the company that has this walletEns
      const [company] = await db
        .select()
        .from(companyTable)
        .where(eq(companyTable.walletEns, walletEns.toLowerCase()))
        .limit(1)

      if (company && company.walletAddress.toLowerCase() === project.projectOwner.toLowerCase()) {
        isAuthorized = true;
      }
    }
    // Case 4: Reverse lookup (if project_owner is ENS but user provided wallet address)
    else if (walletAddress && !isAuthorized) {
      const [company] = await db
        .select()
        .from(companyTable)
        .where(eq(companyTable.walletAddress, walletAddress.toLowerCase()))
        .limit(1)
        
      if (company && company.walletEns.toLowerCase() === project.projectOwner.toLowerCase()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { isSuccess: false, message: 'Only the project owner can update this project' },
        { status: 403 }
      )
    }

    // Perform the update
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
 *
 * Either:
 *   - pass "walletAddress" in body, or
 *   - pass "walletEns" in body, from which we will derive the actual wallet address
 * 
 * Example request body:
 * {
 *   "projectId":"a-b-c",
 *   "walletEns": "mycompany.eth"
 * }
 * or:
 * {
 *   "walletAddress": "0xAbC123..."
 * }
 *
 * This method checks project ownership. 
 * Also checks if `assignedFreelancer` is null before allowing deletion.
 */
async function deleteProject(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId
    const body = await req.json()

    const { walletAddress, walletEns } = body

    // Find the project first
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

    // Check ownership - account for different ways project_owner might be stored
    let isAuthorized = false;
    
    // Case 1: Direct match on ENS name
    if (walletEns && project.projectOwner.toLowerCase() === walletEns.toLowerCase()) {
      isAuthorized = true;
      console.log("Authorized by direct ENS match");
    } 
    // Case 2: Direct match on wallet address 
    else if (walletAddress && project.projectOwner.toLowerCase() === walletAddress.toLowerCase()) {
      isAuthorized = true;
      console.log("Authorized by direct wallet address match");
    }
    // Case 3: ENS lookup needed (if project_owner is wallet address but user provided ENS)
    else if (walletEns && !isAuthorized) {
      // Look up the company that has this walletEns
      const [company] = await db
        .select()
        .from(companyTable)
        .where(eq(companyTable.walletEns, walletEns.toLowerCase()))
        .limit(1)

      if (company && company.walletAddress.toLowerCase() === project.projectOwner.toLowerCase()) {
        isAuthorized = true;
        console.log("Authorized by ENS-to-wallet lookup");
      }
    }
    // Case 4: Reverse lookup (if project_owner is ENS but user provided wallet address)
    else if (walletAddress && !isAuthorized) {
      const [company] = await db
        .select()
        .from(companyTable)
        .where(eq(companyTable.walletAddress, walletAddress.toLowerCase()))
        .limit(1)
        
      if (company && company.walletEns.toLowerCase() === project.projectOwner.toLowerCase()) {
        isAuthorized = true;
        console.log("Authorized by wallet-to-ENS lookup");
      }
    }

    if (!isAuthorized) {
      console.log("Authorization failed:", {
        projectOwner: project.projectOwner,
        walletEns,
        walletAddress
      });
      
      return NextResponse.json(
        { isSuccess: false, message: 'Only the owner can delete this project' },
        { status: 403 }
      )
    }

    // Cannot delete if project is assigned
    if (project.assignedFreelancer) {
      return NextResponse.json(
        { isSuccess: false, message: 'Cannot delete a project that has been assigned' },
        { status: 400 }
      )
    }

    // Perform the delete
    await db.delete(projectsTable).where(eq(projectsTable.id, projectId))

    return NextResponse.json(
      { isSuccess: true, message: 'Project deleted successfully' },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error in DELETE /api/projects/[projectId]:', err)
    return NextResponse.json(
      { isSuccess: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// We keep dynamic (disable route segment caching)
export const dynamic = 'force-dynamic';

// Export the handler functions with CORS middleware
// Fix: Properly wrap handlers to ensure params are passed through
export const GET = (req: NextRequest, context: any) => {
  return withCors(async (req: NextRequest) => getProject(req, context))(req);
};

export const PUT = (req: NextRequest, context: any) => {
  return withCors(async (req: NextRequest) => updateProject(req, context))(req);
};

export const DELETE = (req: NextRequest, context: any) => {
  return withCors(async (req: NextRequest) => deleteProject(req, context))(req);
};

export const OPTIONS = withCors(async () => {
  return new Response(null, { status: 204 })
})
