/* <content> /app/api/register/route.ts */

// Force dynamic route
import { NextRequest, NextResponse } from 'next/server';
import { withCors } from '@/lib/cors';
import { withValidation, rules } from '@/lib/middleware/validation';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  logApiRequest,
} from '@/app/api/api-utils';

import { registerUserProfileAction } from '@/actions/db/user-profile-actions';

// Define the validation schema for the registration endpoint
// We add "walletEns" as mandatory if role=freelancer, optional for company (you can adjust if you want it mandatory for company too).
const registerValidationSchema = {
  body: {
    role: [
      rules.required('role'),
      rules.isValidRole('role'), // must be "freelancer" or "company"
    ],
    walletAddress: [
      rules.required('walletAddress'),
      rules.isWalletAddress('walletAddress'), // your custom rule ensuring "0x" + 40 hex
    ],
    walletEns: [
      rules.custom(
        'walletEns',
        (value: string | undefined, body: any) => {
          // If role=freelancer => walletEns is mandatory
          if (body?.role === 'freelancer') {
            return !!(value && value.trim());
          }
          // If role=company => walletEns is optional => return true
          return true;
        },
        'walletEns is required for freelancers'
      ),
    ],
    freelancerName: [
      rules.custom(
        'freelancerName',
        (value: string | undefined, body: any) => {
          if (body?.role !== 'freelancer') return true; // only required if freelancer
          return value !== undefined && value !== '';
        },
        'freelancerName is required when role=freelancer'
      ),
    ],
    companyName: [
      rules.custom(
        'companyName',
        (value: string | undefined, body: any) => {
          if (body?.role !== 'company') return true; // only required if company
          return value !== undefined && value !== '';
        },
        'companyName is required when role=company'
      ),
    ],
    skills: [
      rules.custom(
        'skills',
        (value: string | string[] | undefined, body: any) => {
          // If role=freelancer => we want "skills" mandatory
          if (body?.role === 'freelancer') {
            return !!value; // must not be empty
          }
          return true;
        },
        'skills are required for freelancers'
      ),
    ],
    // "githubProfileUsername" is optional, so we skip enforced rules
  },
};

/**
 * POST /api/register
 * Creates (or updates) a user profile (company or freelancer).
 */
async function registerHandler(req: NextRequest, parsedBody?: any) {
  try {
    logApiRequest('POST', '/api/register', req.ip || 'unknown');

    // Parse the JSON from request if no parsedBody is given
    const body = parsedBody || (await req.json());

    const result = await registerUserProfileAction({
      role: body.role,
      walletAddress: body.walletAddress,
      walletEns: body.walletEns,
      // Company fields
      companyName: body.companyName,
      shortDescription: body.shortDescription,
      logoUrl: body.logoUrl,
      githubProfileUsername: body.githubProfileUsername,

      // Freelancer fields
      freelancerName: body.freelancerName,
      skills: body.skills,
      profilePicUrl: body.profilePicUrl,
    });

    if (!result.isSuccess) {
      return errorResponse(result.message || 'Registration failed', 400);
    }

    // At this point, "result.data" is either the inserted or updated row from DB
    const row = result.data;

    // We want a consistent output shape. So let's build it:
    // If role=freelancer => these fields
    // If role=company => those fields, etc.
    let responseData: Record<string, any> = { ...row };

    // If you want to rename some DB columns to the final JSON keys, do it here:
    // e.g. responseData.githubProfileUsername = row.githubProfileUsername;
    // already in row as the same name, presumably

    // For freelancers, the important ones might be:
    // id, walletEns, walletAddress, freelancerName, skills, profilePicUrl, githubProfileUsername, createdAt, updatedAt
    // For companies, the important ones might be:
    // id, walletEns, walletAddress, companyName, shortDescription, logoUrl, githubProfileUsername, createdAt, updatedAt

    // Return your final success
    return successResponse(responseData, 'Successfully registered profile');
  } catch (error: any) {
    console.error('[POST /api/register] Unhandled error:', error);
    return serverErrorResponse(error);
  }
}

const handlerWithValidation = withValidation(registerHandler, registerValidationSchema);

// Wrap with CORS
export const POST = withCors(handlerWithValidation);
export const OPTIONS = withCors(async () => {
  return new Response(null, { status: 204 });
});