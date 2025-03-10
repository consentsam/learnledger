// app/api/projects/route.ts
import { NextRequest } from 'next/server'
import { db } from '@/db/db'
import { projectsTable } from '@/db/schema/projects-schema'
import { eq, and, sql, desc, asc } from 'drizzle-orm'
import { SQL } from 'drizzle-orm/sql'

import { createProjectAction } from '@/actions/db/projects-actions'
import { 
  successResponse, 
  errorResponse, 
  serverErrorResponse,
  logApiRequest,
  validateRequiredFields 
} from '@/app/api/api-utils'
import { withCors } from '@/lib/cors'
import { withValidation } from '@/lib/middleware/validation'

// @ts-nocheck
// Force this API route to be dynamic
export const dynamic = 'force-dynamic';

// Helper function to handle DB connection errors
function handleDbConnectionError(error: any) {
  console.error('Database connection error:', error);
  
  // Check if it's a connection error
  if (error?.code === 'ENOTFOUND' || 
      error?.message?.includes('getaddrinfo') ||
      error?.message?.includes('connect ETIMEDOUT') ||
      error?.message?.includes('connection timeout') ||
      error?.code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
      error?.code === 'CERT_HAS_EXPIRED') {
    
    // Construct database URL info for debugging (hide password)
    const dbUrlInfo = process.env.DATABASE_URL 
      ? `${process.env.DATABASE_URL.split('@')[0].split(':')[0]}:****@${process.env.DATABASE_URL.split('@')[1]}`
      : 'DATABASE_URL not set';
    
    return serverErrorResponse({
      message: `Failed to connect to DigitalOcean PostgreSQL database. Environment: ${process.env.NODE_ENV || 'unknown'}`,
      details: {
        url: dbUrlInfo,
        error: error.message,
        code: error.code
      }
    });
  }
  
  // Generic server error
  return serverErrorResponse(error);
}

/**
 * GET /api/projects
 * Fetches (optionally filtered) projects
 * Query params:
 * - status: filter by project status (open, closed, etc.)
 * - skill: filter by required skill
 * - minPrize: minimum prize amount
 * - maxPrize: maximum prize amount
 * - owner: filter by project owner wallet
 * - sort: sort field (created, prize, name) 
 * - order: sort order (asc, desc)
 * - limit: limit number of results (default 20, max 100)
 * - offset: pagination offset
 */
async function getProjects(req: NextRequest) {
  try {
    // Log the request
    logApiRequest('GET', '/api/projects', req.ip || 'unknown')
    console.log(`[API] Database URL: ${process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@')}`);
    console.log(`[API] Environment: ${process.env.NODE_ENV || 'unknown'}`);
    
    const { searchParams } = new URL(req.url)
    
    // Query parameters
    const status = searchParams.get('status')
    const skill = searchParams.get('skill')
    const minPrize = searchParams.get('minPrize')
    const maxPrize = searchParams.get('maxPrize')
    const owner = searchParams.get('owner')?.toLowerCase()
    const sortBy = searchParams.get('sort') || 'created'
    const sortOrder = searchParams.get('order') || 'desc'
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    
    // Parse and validate limit/offset
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 20
    const offset = offsetParam ? parseInt(offsetParam) : 0
    
    // Build query conditions
    const conditions: SQL[] = []

    if (status) {
      conditions.push(eq(projectsTable.projectStatus, status))
    }
    
    if (minPrize) {
      conditions.push(sql`${projectsTable.prizeAmount} >= ${minPrize}`)
    }
    
    if (maxPrize) {
      conditions.push(sql`${projectsTable.prizeAmount} <= ${maxPrize}`)
    }
    
    if (skill) {
      conditions.push(sql`${projectsTable.requiredSkills} ILIKE ${'%' + skill + '%'}`)
    }
    
    if (owner) {
      conditions.push(eq(projectsTable.projectOwner, owner))
    }
    
    // Build sorting
    let orderBy
    switch (sortBy) {
      case 'prize':
        orderBy = sortOrder === 'asc' ? asc(projectsTable.prizeAmount) : desc(projectsTable.prizeAmount)
        break
      case 'name':
        orderBy = sortOrder === 'asc' ? asc(projectsTable.projectName) : desc(projectsTable.projectName)
        break
      case 'created':
      default:
        orderBy = sortOrder === 'asc' ? asc(projectsTable.createdAt) : desc(projectsTable.createdAt)
    }
    
    // Execute query with all parameters
    const query = db.select().from(projectsTable)
    
    // Add conditions if any
    if (conditions.length > 0) {
      query.where(conditions.length === 1 ? conditions[0] : and(...conditions))
    }
    
    // Add sorting, limit and offset
    const rows = await query.orderBy(orderBy).limit(limit).offset(offset)
    
    // Create response with cache headers
    const response = successResponse(rows, undefined, 200)
    
    // Add cache control headers (cache for 1 minute, public)
    response.headers.set('Cache-Control', 'public, max-age=60')
    
    return response
  } catch (err) {
    return handleDbConnectionError(err)
  }
}

/**
 * POST /api/projects
 * JSON body:
 * {
 *   "projectName": string,
 *   "projectDescription": string,
 *   "projectLink": string,
 *   "prizeAmount": number,
 *   "projectOwner": string,
 *   "requiredSkills": string[]
 * }
 */
async function createProject(req: NextRequest, parsedBody?: any) {
  try {
    // Log the request
    logApiRequest('POST', '/api/projects', req.ip || 'unknown')
    
    // Use the parsed body passed from middleware
    const body = parsedBody || {};
    
    // Validate required fields
    const validation = validateRequiredFields(body, ['projectName', 'projectOwner'])
    if (!validation.isValid) {
      return errorResponse(
        `Missing required fields: ${validation.missingFields.join(', ')}`,
        400,
        validation.missingFields.reduce((acc, field) => {
          acc[field] = [`${field.charAt(0).toUpperCase() + field.slice(1).replace('project', '').replace('Project', '')} is required`];
          return acc;
        }, {} as Record<string, string[]>)
      )
    }
    
    // Validate wallet address format
    if (!body.projectOwner.startsWith('0x') || body.projectOwner.length !== 42) {
      return errorResponse(
        'Invalid wallet address format', 
        400,
        { projectOwner: ['Wallet address must be a valid Ethereum address starting with 0x'] }
      )
    }
    
    // Format the skills if they are provided as an array
    let requiredSkills = body.requiredSkills
    if (Array.isArray(requiredSkills)) {
      requiredSkills = requiredSkills.join(', ')
    }
    
    // Call the server action to create the project
    const result = await createProjectAction({
      projectName: body.projectName,
      projectDescription: body.projectDescription,
      projectRepo: body.projectLink || body.projectRepo,
      prizeAmount: body.prizeAmount ? Number(body.prizeAmount) : undefined,
      walletAddress: body.projectOwner,
      requiredSkills,
      completionSkills: body.completionSkills,
    })

    if (!result.isSuccess) {
      // Map detailed error messages based on the failure reason
      if (result.message?.includes('owner does not exist')) {
        return errorResponse('Project owner does not have a registered profile', 400, {
          projectOwner: ['This wallet address is not registered with a company profile']
        })
      }
      
      // If there's a DB error or other server-side issue
      return serverErrorResponse(new Error(result.message || 'Failed to create project'))
    }

    return successResponse(result.data, 'Project created successfully')
  } catch (error) {
    console.error('Project creation error:', error)
    return serverErrorResponse(error)
  }
}

// Apply CORS to route handlers
export const GET = withCors(getProjects);
export const POST = withCors(createProject);
export const OPTIONS = withCors(async () => {
  // Empty handler, the CORS middleware will create the proper OPTIONS response
  return new Response(null, { status: 204 });
});