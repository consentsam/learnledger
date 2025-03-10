// @ts-nocheck
import { NextRequest } from 'next/server'
import { eq, and, desc } from 'drizzle-orm'

import { db } from '@/db/db'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { 
  successResponse, 
  errorResponse, 
  serverErrorResponse,
  logApiRequest 
} from '@/app/api/api-utils'
import { withCors } from '@/lib/cors'

/**
 * GET /api/submissions/read
 * 
 * Query parameters:
 * - submissionId: string (optional) - if provided, fetch a single submission
 * - projectId: string (optional) - if provided, fetch submissions for a specific project
 * - freelancerAddress: string (optional) - if provided, fetch submissions for a specific freelancer
 */
async function getSubmissions(req: NextRequest) {
  try {
    // Log the request
    logApiRequest('GET', '/api/submissions/read', req.ip || 'unknown')
    
    const { searchParams } = new URL(req.url)
    const submissionId = searchParams.get('submissionId')
    const projectId = searchParams.get('projectId')
    const freelancerAddress = searchParams.get('freelancerAddress')?.toLowerCase()

    // If user provides a "submissionId", we fetch only that one:
    if (submissionId) {
      const [submission] = await db
        .select()
        .from(projectSubmissionsTable)
        .where(eq(projectSubmissionsTable.id, submissionId))
        .limit(1)

      if (!submission) {
        return errorResponse('Submission not found', 404)
      }
      
      // Create response with cache headers
      const response = successResponse(submission)
      response.headers.set('Cache-Control', 'public, max-age=60')
      return response
    } 
    // If user provides projectId or freelancerAddress, filter accordingly
    else if (projectId || freelancerAddress) {
      const conditions = []
      
      if (projectId) {
        conditions.push(eq(projectSubmissionsTable.projectId, projectId))
      }
      
      if (freelancerAddress) {
        conditions.push(eq(projectSubmissionsTable.freelancerAddress, freelancerAddress))
      }
      
      const filteredSubs = await db
        .select()
        .from(projectSubmissionsTable)
        .where(and(...conditions))
        .orderBy(desc(projectSubmissionsTable.createdAt))
      
      // Create response with cache headers
      const response = successResponse(filteredSubs)
      response.headers.set('Cache-Control', 'public, max-age=60')
      return response
    } 
    // Otherwise, return all (with a reasonable limit)
    else {
      const allSubs = await db
        .select()
        .from(projectSubmissionsTable)
        .orderBy(desc(projectSubmissionsTable.createdAt))
        .limit(50)  // Add reasonable limit to prevent huge responses

      // Create response with cache headers
      const response = successResponse(allSubs)
      response.headers.set('Cache-Control', 'public, max-age=60')
      return response
    }
  } catch (error) {
    return serverErrorResponse(error)
  }
}

/**
 * POST /api/submissions/read (legacy support)
 * Will call the GET method with the same parameters
 */
async function getSubmissionsPost(req: NextRequest, parsedBody?: any) {
  try {
    // Log the request
    logApiRequest('POST', '/api/submissions/read', req.ip || 'unknown')
    
    // Use the parsed body passed from middleware
    const body = parsedBody || {};
    
    // Create a URL object to build the query string
    const url = new URL(req.url)
    
    if (body.submissionId) {
      url.searchParams.set('submissionId', body.submissionId)
    }
    
    if (body.projectId) {
      url.searchParams.set('projectId', body.projectId)
    }
    
    if (body.freelancerAddress) {
      url.searchParams.set('freelancerAddress', body.freelancerAddress)
    }
    
    // Create a custom request object to pass to GET
    const getReq = {
      ...req,
      url: url.toString(),
      method: 'GET',
      nextUrl: url,
    } as NextRequest;
    
    // Call the GET method
    return getSubmissions(getReq)
  } catch (error) {
    console.error('Submissions read error:', error);
    return serverErrorResponse(error)
  }
}

// Apply CORS to route handlers
export const GET = withCors(getSubmissions);
export const POST = withCors(getSubmissionsPost);
export const OPTIONS = withCors(async () => {
  // Empty handler, the CORS middleware will create the proper OPTIONS response
  return new Response(null, { status: 204 });
});