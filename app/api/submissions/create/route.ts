/****************************************************************************************
 * File: /app/api/submissions/create/route.ts
 * 
 * POST /api/submissions/create
 * 
 * @description
 * Creates a new submission record for a project. We allow the client to specify
 * either (A) walletEns, or (B) walletAddress for the freelancer. This route
 * resolves the final freelancer wallet address and passes it to createSubmissionAction.
 * 
 * Expected Request Body:
 * {
 *   "projectId":        string,  // required
 *   "walletEns":        string,  // optional if user has an ENS
 *   "walletAddress":    string,  // optional if no ENS; fallback
 *   "prLink":           string,  // optional but recommended
 *   "submissionText":   string   // optional
 * }
 *
 * The old code required "freelancerWallet", but we have removed that in favor
 * of "walletEns" + "walletAddress" with a short DB lookup. 
 *
 * @returns
 * 201 on success => { isSuccess: true, message: "Submission created successfully", data: {...} }
 * 4xx on any validation or lookup failure
 ****************************************************************************************/

import { NextRequest, NextResponse } from 'next/server'
import { withCors } from '@/lib/cors'
import { db } from '@/db/db'
import { freelancerTable } from '@/db/schema/freelancer-schema'
import { eq } from 'drizzle-orm'

import { 
  successResponse, 
  errorResponse, 
  serverErrorResponse,
  validateRequiredFields,
  logApiRequest 
} from '@/app/api/api-utils'
import { createSubmissionAction } from '@/actions/db/submissions-actions'

async function postCreateSubmission(req: NextRequest) {
  try {
    logApiRequest('POST', '/api/submissions/create', req.ip || 'unknown')

    const body = await req.json().catch(() => ({}))
    
    // 1) Validate required fields. 
    //    We do NOT require 'freelancerWallet' anymore; we handle walletEns/walletAddress logic below.
    const validation = validateRequiredFields(body, ['projectId', 'walletEns', 'walletAddress'])
    if (!validation.isValid) {
      return errorResponse(
        `Missing required fields: ${validation.missingFields.join(', ')}`,
        400
      )
    }

    // 2) Resolve final freelancer address from "walletEns" or "walletAddress"
    const { projectId, walletEns, walletAddress , prLink, submissionText } = body
    console.log('projectId =>', projectId)
    console.log('walletEns =>', walletEns)
    console.log('walletAddress =>', walletAddress)

    // Both are optional, but we must have at least one
    if (!walletEns && !walletAddress) {
      return errorResponse(
        `Must provide at least one of [walletEns, walletAddress] to identify the freelancer`,
        400
      )
    }

    let finalFreelancerAddress = ''
    // Try ENS first
    if (walletEns) {
      const lowerEns = walletEns.trim().toLowerCase()
      console.log('lowerEns =>', lowerEns)
      // find freelancer by that ENS
      const [byEns] = await db
        .select()
        .from(freelancerTable)
        .where(eq(freelancerTable.walletEns, lowerEns))
        .limit(1)
      console.log('byEns =>', byEns)
      if (!byEns) {
        return errorResponse(
          `No freelancer found for walletEns='${walletEns}'`,
          404
        )
      }
      finalFreelancerAddress = byEns.walletAddress.toLowerCase()
    }
    // If still empty, fallback to walletAddress
    if (!finalFreelancerAddress && walletAddress) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return errorResponse(`Invalid walletAddress format: ${walletAddress}`, 400)
      }
      finalFreelancerAddress = walletAddress.trim().toLowerCase()
    }

    if (!finalFreelancerAddress) {
      return errorResponse(`Could not resolve freelancer address`, 400)
    }

    // 3) Call the createSubmissionAction with the final wallet
    const result = await createSubmissionAction({
      projectId : projectId,
      freelancerWalletEns: walletEns,
      freelancerWalletAddress: walletAddress.toLowerCase(),
      submissionText: submissionText,
      githubLink: prLink
    })

    if (!result.isSuccess) {
      return errorResponse(result.message, 400)
    }

    // 4) Return success (HTTP 201)
    return successResponse(
      result.data, 
      'Submission created successfully', 
      201
    )
  } catch (error: any) {
    console.error('[POST /api/submissions/create] Unhandled error =>', error)
    return serverErrorResponse(error)
  }
}

export const POST = withCors(postCreateSubmission)

// For CORS preflight
export const OPTIONS = withCors(async () => {
  return new Response(null, { status: 204 })
})