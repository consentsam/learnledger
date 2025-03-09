import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/db/db'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { projectsTable } from '@/db/schema/projects-schema'
import { 
  successResponse, 
  errorResponse, 
  serverErrorResponse,
  validateRequiredFields,
  logApiRequest 
} from '@/app/api/api-utils'
import { withCors } from '@/lib/cors'

/**
 * POST /api/submissions/delete
 * Body:
 * {
 *   "submissionId": string,
 *   "walletAddress": string
 * }
 *
 * Allows either the projectOwner or the freelancer to delete the submission.
 */
async function deleteSubmission(req: NextRequest, parsedBody?: any) {
  try {
    // Log the request
    logApiRequest('POST', '/api/submissions/delete', req.ip || 'unknown')
    
    // Use the parsed body passed from middleware
    const body = parsedBody || {};
    
    // Validate required fields
    const validation = validateRequiredFields(body, ['submissionId', 'walletAddress'])
    if (!validation.isValid) {
      return errorResponse(
        `Missing required fields: ${validation.missingFields.join(', ')}`,
        400
      )
    }
    
    // Validate wallet format
    if (!body.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return errorResponse('Invalid wallet address format', 400)
    }

    // 1) find the submission
    const [submission] = await db
      .select()
      .from(projectSubmissionsTable)
      .where(eq(projectSubmissionsTable.id, body.submissionId))
      .limit(1)
      
    if (!submission) {
      return errorResponse('Submission not found', 404)
    }

    // 2) find the project
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, submission.projectId))
      .limit(1)
      
    if (!project) {
      return errorResponse('Project not found', 404)
    }

    // 3) check ownership or submitter
    const isOwner = project.projectOwner.toLowerCase() === body.walletAddress.toLowerCase()
    const isSubmitter = submission.freelancerAddress.toLowerCase() === body.walletAddress.toLowerCase()

    if (!isOwner && !isSubmitter) {
      return errorResponse('Not authorized to delete this submission', 403)
    }

    // 4) Perform delete
    await db
      .delete(projectSubmissionsTable)
      .where(eq(projectSubmissionsTable.id, body.submissionId))

    return successResponse(null, 'Submission deleted successfully')
  } catch (error) {
    console.error('Submission delete error:', error);
    return serverErrorResponse(error)
  }
}

// Apply CORS to route handlers
export const POST = withCors(deleteSubmission);
export const OPTIONS = withCors(async () => {
  return new Response(null, { status: 204 });
});