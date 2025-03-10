"use server"
import { NextRequest } from 'next/server'
import { registerUserProfileAction } from '@/actions/db/user-profile-actions'
import { 
  successResponse, 
  serverErrorResponse,
  logApiRequest,
  errorResponse,
  ErrorDetails
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

// The original handler
async function registerHandler(req: NextRequest, parsedBody?: any) {
  try {
    // Log environment information for debugging
    console.log(`[Register API] Environment: ${process.env.NODE_ENV || 'unknown'}`);
    console.log(`[Register API] DISABLE_SSL_VALIDATION: ${process.env.DISABLE_SSL_VALIDATION || 'not set'}`);
    console.log(`[Register API] NODE_TLS_REJECT_UNAUTHORIZED: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED || 'not set'}`);
    console.log(`[Register API] Database URL: ${process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@')}`);

    // Log the request
    logApiRequest('POST', '/api/register', req.ip || 'unknown')

    // Fix: parse the JSON from request if no parsedBody is given
    const body = parsedBody || await req.json();

    console.log(`[Register API] Registration attempt for wallet: ${body.walletAddress?.substr(0,10)}... with role: ${body.role}`);

    // Role-specific validation is done by the middleware now

    // Call the server action
    console.log(`[Register API] Calling registerUserProfileAction`);
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

    console.log(`[Register API] registerUserProfileAction result:`, { 
      isSuccess: result.isSuccess, 
      message: result.message,
      hasData: !!result.data,
      hasError: !!result.error 
    });

    if (!result.isSuccess) {
      // Map detailed error messages based on the failure reason
      if (result.message?.includes('already exists')) {
        console.log(`[Register API] Duplicate wallet address error`);
        return errorResponse(`${body.role === 'company' ? 'Company' : 'Freelancer'} profile with this wallet address already exists`, 400, {
          walletAddress: ['This wallet address is already registered with a profile']
        })
      }
      
      if (result.message?.includes('Invalid wallet')) {
        console.log(`[Register API] Invalid wallet format error`);
        return errorResponse('Invalid wallet address format', 400, {
          walletAddress: ['Wallet address must be a valid Ethereum address starting with 0x']
        })
      }

      // If there's a DB error or other server-side issue
      console.error(`[Register API] Server error during registration:`, result.error || result.message);
      
      // Create error details object
      const errorDetails: ErrorDetails = {
        message: result.message || 'Registration failed',
        dbURL: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'),
        env: process.env.NODE_ENV || 'unknown',
        vercelEnv: process.env.VERCEL_ENV || 'unknown'
      };
      
      // Add any additional error details if available
      if (result.error) {
        errorDetails.error = typeof result.error === 'object'
          ? result.error
          : { message: String(result.error) };
      }
      
      return serverErrorResponse(new Error(result.message || 'Registration failed'), errorDetails);
    }

    console.log(`[Register API] Registration successful`);
    return successResponse(result.data, 'Successfully registered profile')

  } catch (error: any) {
    console.error('[Register API] Unhandled error:', error)

    // Create error details object
    const errorDetails: ErrorDetails = {
      message: error?.message || 'Registration failed due to an unexpected error',
      dbURL: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'),
      env: process.env.NODE_ENV || 'unknown',
      vercelEnv: process.env.VERCEL_ENV || 'unknown'
    };

    return serverErrorResponse(error, errorDetails);
  }
}

// Apply CORS and validation middleware
const handlerWithValidation = withValidation(registerHandler, registerValidationSchema);
export const POST = withCors(handlerWithValidation);

// Handle OPTIONS requests
export const OPTIONS = withCors(async () => {
  return new Response(null, { status: 204 });
});
