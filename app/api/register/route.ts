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
          if (body?.role !== 'freelancer') return true;
          return value !== undefined && value !== '';
        },
        'Freelancer name is required for freelancer profiles'
      ),
    ],
  },
};

async function registerHandler(req: NextRequest, parsedBody?: any) {
  try {
    console.log(`[Register API] Environment: ${process.env.NODE_ENV || 'unknown'}`);
    console.log(`[Register API] DISABLE_SSL_VALIDATION: ${process.env.DISABLE_SSL_VALIDATION || 'not set'}`);
    console.log(`[Register API] NODE_TLS_REJECT_UNAUTHORIZED: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED || 'not set'}`);
    console.log(`[Register API] Database URL: ${process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@')}`);

    logApiRequest('POST', '/api/register', req.ip || 'unknown');
    
    // Parse the JSON from request if no parsedBody is given
    const body = parsedBody || await req.json();
    
    console.log(`[Register API] Registration attempt for wallet: ${body.walletAddress?.substr(0,10)}... role: ${body.role}`);

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
    });

    console.log(`[Register API] registerUserProfileAction result:`, { 
      isSuccess: result.isSuccess, 
      message: result.message,
      hasData: !!result.data,
      hasError: !!result.error 
    });

    if (!result.isSuccess) {
      if (result.message?.includes('already exists')) {
        return errorResponse(
          `${body.role === 'company' ? 'Company' : 'Freelancer'} profile with this wallet address already exists`, 
          400,
          { walletAddress: ['This wallet address is already registered with a profile'] }
        );
      }
      if (result.message?.includes('Invalid wallet')) {
        return errorResponse('Invalid wallet address format', 400, {
          walletAddress: ['Wallet address must start with 0x']
        });
      }

      console.error(`[Register API] Server error during registration:`, result.error || result.message);
      
      const errorDetails: ErrorDetails = {
        message: result.message || 'Registration failed',
        dbURL: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'),
        env: process.env.NODE_ENV || 'unknown',
        vercelEnv: process.env.VERCEL_ENV || 'unknown'
      };
      if (result.error) {
        errorDetails.error = typeof result.error === 'object'
          ? result.error
          : { message: String(result.error) };
      }
      
      return serverErrorResponse(new Error(result.message || 'Registration failed'), errorDetails);
    }

    console.log(`[Register API] Registration successful`);
    return successResponse(result.data, 'Successfully registered profile');
  } catch (error: any) {
    console.error('[Register API] Unhandled error:', error);

    const errorDetails: ErrorDetails = {
      message: error?.message || 'Registration failed due to an unexpected error',
      dbURL: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'),
      env: process.env.NODE_ENV || 'unknown',
      vercelEnv: process.env.VERCEL_ENV || 'unknown'
    };
    
    return serverErrorResponse(error, errorDetails);
  }
}

const handlerWithValidation = withValidation(registerHandler, registerValidationSchema);
export const POST = withCors(handlerWithValidation);
export const OPTIONS = withCors(async () => {
  return new Response(null, { status: 204 });
});