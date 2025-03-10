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
  • POST /api/submissions/create
  • JSON body:
  • {
  • "projectId": string,
  • "freelancerAddress": string,
  • "prLink": string
  • }
*/
async function createSubmission(req: NextRequest, parsedBody?: any) {
  try {
    // Log the request
    logApiRequest('POST', '/api/submissions/create', req.ip || 'unknown')

    // Fix: parse request body if none is provided
    const body = parsedBody || await req.json();

    // Validate required fields
    const validation = validateRequiredFields(body, ['projectId', 'freelancerAddress', 'prLink'])
    if (!validation.isValid) {
      return errorResponse(
        `Missing required fields: ${validation.missingFields.join(', ')}`,
        400
      )
    }

    // Validate wallet format
    if (!body.freelancerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return errorResponse('Invalid freelancer wallet address format', 400)
    }

    // Validate PR link
    const prLinkRegex = /^https:\/\/github\.com\/[\w-]+\/[\w-]+\/pull\/\d+$/;
    if (!prLinkRegex.test(body.prLink)) {
      return errorResponse(
        'Invalid PR link format. Expected: https://github.com/owner/repo/pull/123',
        400
      )
    }

    // Use your existing "createSubmissionAction"
    const result = await createSubmissionAction({
      projectId: body.projectId,
      freelancerAddress: body.freelancerAddress,
      prLink: body.prLink,
    })

    if (!result.isSuccess) {
      return errorResponse(result.message || 'Failed to create submission', 400)
    }

    return successResponse(result.data, 'Submission created successfully', 201)
  } catch (error) {
    console.error('Submission creation error:', error);
    return serverErrorResponse(error)
  }
}

// Apply CORS to route handlers
export const POST = withCors(createSubmission);
export const OPTIONS = withCors(async () => {
  // Empty handler, the CORS middleware will create the proper OPTIONS response
  return new Response(null, { status: 204 });
});
