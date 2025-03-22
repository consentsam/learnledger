// file: /app/api/submissions/create/route.ts

import { NextRequest } from 'next/server'
import { createSubmissionAction } from '@/actions/db/submissions-actions'
import { 
  successResponse, 
  errorResponse, 
  serverErrorResponse,
  validateRequiredFields,
  logApiRequest 
} from '@/app/api/api-utils'
import { withCors } from '@/lib/cors'

/**
  POST /api/submissions/create
  Body:
  {
    "projectId": "string",
    "freelancerWallet": "string",
    "submissionText": "string",
    "githubLink": "string"
  }
*/
async function createSubmission(req: NextRequest, parsedBody?: any) {
  try {
    // Log the request
    logApiRequest('POST', '/api/submissions/create', req.ip || 'unknown')

    // Parse request body if not already parsed
    const body = parsedBody || await req.json()

    // Validate required fields
    const validation = validateRequiredFields(body, ['projectId', 'freelancerWallet'])
    if (!validation.isValid) {
      return errorResponse(
        `Missing required fields: ${validation.missingFields.join(', ')}`,
        400
      )
    }

    // Optional: validate the format of 'freelancerWallet' or 'githubLink' if needed
    // e.g. check 0x pattern, check GitHub URL pattern, etc.

    const result = await createSubmissionAction({
      projectId: body.projectId,
      freelancerWallet: body.freelancerWallet,
      submissionText: body.submissionText,
      githubLink: body.githubLink,
    })

    if (!result.isSuccess) {
      return errorResponse(result.message || 'Failed to create submission', 400)
    }

    return successResponse(result.data, 'Submission created successfully', 201)
  } catch (error) {
    console.error('Submission creation error:', error)
    return serverErrorResponse(error)
  }
}

export const POST = withCors(createSubmission)
export const OPTIONS = withCors(async () => {
  return new Response(null, { status: 204 })
})