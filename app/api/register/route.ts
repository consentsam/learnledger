// app/api/register/route.ts
import { NextRequest } from 'next/server'
import { registerUserProfileAction } from '@/actions/db/user-profile-actions'
import { 
  successResponse, 
  serverErrorResponse,
  logApiRequest,
  errorResponse
} from '@/app/api/api-utils'
import { withValidation, rules } from '@/lib/middleware/validation';
import { withCors } from '@/lib/cors';

// @ts-nocheck
// Force this API route to be dynamic
export const dynamic = 'force-dynamic';

// Define the validation schema for the registration endpoint
const registerValidationSchema = {
  body: {
    role: [
      rules.required('role'),
      rules.isValidRole('role'),
    ],
    walletAddress: [
      rules.required('walletAddress'),
      rules.isWalletAddress('walletAddress'),
    ],
    // Company-specific validations
    companyName: [
      rules.custom(
        'companyName', 
        (value: string | undefined, body: any) => {
          // Only required if role is company
          if (body?.role !== 'company') return true;
          return value !== undefined && value !== '';
        },
        'Company name is required for company profiles'
      ),
    ],
    // Freelancer-specific validations
    freelancerName: [
      rules.custom(
        'freelancerName',
        (value: string | undefined, body: any) => {
          // Only required if role is freelancer
          if (body?.role !== 'freelancer') return true;
          return value !== undefined && value !== '';
        },
        'Freelancer name is required for freelancer profiles'
      ),
    ],
  },
};

// The original handler without validation logic
async function registerHandler(req: NextRequest, parsedBody?: any) {
  try {
    // Log the request
    logApiRequest('POST', '/api/register', req.ip || 'unknown')
    
    // Use the parsed body from middleware
    const body = parsedBody || {};
    
    // Role-specific validation is now handled by the middleware
    
    // Call the server action
    const result = await registerUserProfileAction({
      role: body.role,
      walletAddress: body.walletAddress,
      companyName: body.companyName,
      shortDescription: body.shortDescription,
      logoUrl: body.logoUrl,
      freelancerName: body.freelancerName,
      skills: body.skills,
      profilePicUrl: body.profilePicUrl,
    })

    if (!result.isSuccess) {
      // Map detailed error messages based on the failure reason
      if (result.message?.includes('already exists')) {
        return errorResponse(`${body.role === 'company' ? 'Company' : 'Freelancer'} profile with this wallet address already exists`, 400, {
          walletAddress: ['This wallet address is already registered with a profile']
        })
      }
      
      if (result.message?.includes('Invalid wallet')) {
        return errorResponse('Invalid wallet address format', 400, {
          walletAddress: ['Wallet address must be a valid Ethereum address starting with 0x']
        })
      }

      // If there's a DB error or other server-side issue
      return serverErrorResponse(new Error(result.message || 'Registration failed'))
    }

    return successResponse(result.data, 'Successfully registered profile')
  } catch (error) {
    console.error('Register API error:', error)
    return serverErrorResponse(error)
  }
}

// Apply CORS and validation middleware to the handler
const handlerWithValidation = withValidation(registerHandler, registerValidationSchema);
export const POST = withCors(handlerWithValidation);

// Handle OPTIONS requests for CORS preflight
export const OPTIONS = withCors(async (req) => {
  return new Response(null, { status: 204 });
});