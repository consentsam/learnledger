import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { getUserProfileAction } from '@/actions/db/user-profile-actions'
import { 
  successResponse, 
  errorResponse, 
  serverErrorResponse,
  validateRequiredFields,
  logApiRequest 
} from '@/app/api/api-utils'
import { withCors } from '@/lib/cors'
import { withValidation, rules } from '@/lib/middleware/validation'

import { db } from '@/db/db'
import { companyTable } from '@/db/schema/company-schema'
import { freelancerTable } from '@/db/schema/freelancer-schema'

// Force this API route to be dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/userProfile?wallet=0x...&role=company|freelancer
 */
async function getUserProfile(req: NextRequest) {
  try {
    logApiRequest('GET', '/api/userProfile', req.ip || 'unknown')
    
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')?.toLowerCase()
    const role = searchParams.get('role')

    if (!wallet || !role) {
      return errorResponse(
        'Missing required query parameters: wallet and role',
        400
      )
    }

    if (!wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      return errorResponse('Invalid wallet address format', 400)
    }

    if (role !== 'company' && role !== 'freelancer') {
      return errorResponse('Role must be either "company" or "freelancer"', 400)
    }

    const result = await getUserProfileAction({
      walletAddress: wallet,
      role: role as 'company' | 'freelancer',
    })

    const response = successResponse(result.data, undefined, 200);
    response.headers.set('Cache-Control', 'public, max-age=300');
    return response;
  } catch (error) {
    return serverErrorResponse(error);
  }
}

const updateUserProfileValidationSchema = {
  body: {
    role: [
      rules.required('role'),
      rules.isValidRole('role'),
    ],
    walletAddress: [
      rules.required('walletAddress'),
      rules.isWalletAddress('walletAddress'),
    ],
  },
};

async function updateUserProfile(req: NextRequest, parsedBody?: any) {
  try {
    logApiRequest('PUT', '/api/userProfile', req.ip || 'unknown')
    const body = parsedBody || await req.json();

    const validation = validateRequiredFields(body, ['role', 'walletAddress'])
    if (!validation.isValid) {
      return errorResponse(
        `Missing required fields: ${validation.missingFields.join(', ')}`,
        400
      )
    }
    if (body.role !== 'company' && body.role !== 'freelancer') {
      return errorResponse('Role must be either "company" or "freelancer"', 400)
    }
    if (!body.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return errorResponse('Invalid wallet address format', 400)
    }
    
    const lowerWallet = body.walletAddress.toLowerCase()

    if (body.role === 'company') {
      const [existing] = await db
        .select()
        .from(companyTable)
        .where(eq(companyTable.walletAddress, lowerWallet))

      if (!existing) {
        return errorResponse('No matching company profile found', 404)
      }

      const updateData: Record<string, any> = {}
      if (typeof body.companyName === 'string') {
        updateData.companyName = body.companyName
      }
      if (typeof body.shortDescription === 'string') {
        updateData.shortDescription = body.shortDescription
      }
      if (typeof body.logoUrl === 'string') {
        updateData.logoUrl = body.logoUrl
      }

      if (Object.keys(updateData).length === 0) {
        return errorResponse('No valid fields provided for update', 400)
      }

      const [updated] = await db
        .update(companyTable)
        .set(updateData)
        .where(eq(companyTable.walletAddress, lowerWallet))
        .returning()

      return successResponse(updated, 'Company profile updated successfully')
    } else {
      const [existing] = await db
        .select()
        .from(freelancerTable)
        .where(eq(freelancerTable.walletAddress, lowerWallet))

      if (!existing) {
        return errorResponse('No matching freelancer profile found', 404)
      }

      const updateData: Record<string, any> = {}
      if (typeof body.freelancerName === 'string') {
        updateData.freelancerName = body.freelancerName
      }
      if (typeof body.skills === 'string') {
        updateData.skills = body.skills
      } else if (Array.isArray(body.skills)) {
        updateData.skills = body.skills.join(', ')
      }
      if (typeof body.profilePicUrl === 'string') {
        updateData.profilePicUrl = body.profilePicUrl
      }

      if (Object.keys(updateData).length === 0) {
        return errorResponse('No valid fields provided for update', 400)
      }

      const [updated] = await db
        .update(freelancerTable)
        .set(updateData)
        .where(eq(freelancerTable.walletAddress, lowerWallet))
        .returning()

      return successResponse(updated, 'Freelancer profile updated successfully')
    }
  } catch (error) {
    console.error('Update profile error:', error);
    return serverErrorResponse(error)
  }
}

async function deleteUserProfile(req: NextRequest, parsedBody?: any) {
  try {
    logApiRequest('DELETE', '/api/userProfile', req.ip || 'unknown')
    
    const body = parsedBody || await req.json();
    
    const validation = validateRequiredFields(body, ['role', 'walletAddress'])
    if (!validation.isValid) {
      return errorResponse(
        `Missing required fields: ${validation.missingFields.join(', ')}`,
        400
      )
    }
    if (body.role !== 'company' && body.role !== 'freelancer') {
      return errorResponse('Role must be either "company" or "freelancer"', 400)
    }
    if (!body.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return errorResponse('Invalid wallet address format', 400)
    }
    
    const lowerWallet = body.walletAddress.toLowerCase()

    if (body.role === 'company') {
      const [existing] = await db
        .select()
        .from(companyTable)
        .where(eq(companyTable.walletAddress, lowerWallet))

      if (!existing) {
        return errorResponse('No matching company profile found', 404)
      }
      await db
        .delete(companyTable)
        .where(eq(companyTable.walletAddress, lowerWallet))

      return successResponse(null, 'Company profile deleted successfully')
    } else {
      const [existing] = await db
        .select()
        .from(freelancerTable)
        .where(eq(freelancerTable.walletAddress, lowerWallet))

      if (!existing) {
        return errorResponse('No matching freelancer profile found', 404)
      }
      await db
        .delete(freelancerTable)
        .where(eq(freelancerTable.walletAddress, lowerWallet))

      return successResponse(null, 'Freelancer profile deleted successfully')
    }
  } catch (error) {
    console.error('Delete profile error:', error);
    return serverErrorResponse(error)
  }
}

const updateUserProfileWithValidation = withValidation(updateUserProfile, updateUserProfileValidationSchema);
const deleteUserProfileWithValidation = withValidation(deleteUserProfile, updateUserProfileValidationSchema);

export const GET = withCors(getUserProfile);
export const PUT = withCors(updateUserProfileWithValidation);
export const DELETE = withCors(deleteUserProfileWithValidation);
export const OPTIONS = withCors(async () => NextResponse.json({}, { status: 204 }));