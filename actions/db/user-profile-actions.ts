// @ts-nocheck
// @ts-nocheck
"use server"

/**
 * @file user-profile-actions.ts
 *
 * Provides actions for:
 *  - Getting a user's profile (company or freelancer)
 *  - Registering a user profile (inserting into company/freelancer table)
 *  - And now, if we are registering a freelancer with skills, we automatically
 *    parse & store them in the bridging user_skills table.
 */

import { db } from '@/db/db'
import { companyTable } from '@/db/schema/company-schema'
import { freelancerTable } from '@/db/schema/freelancer-schema'
import { eq } from 'drizzle-orm'

// We need these for bridging skills
import { getOrCreateSkillAction, addSkillToUserAction } from '@/actions/db/skills-actions'

/**
 * @function getUserProfileAction
 * Looks up existing profile in either company or freelancer table, by walletAddress
 */
export async function getUserProfileAction(params: {
  walletAddress: string
  role: 'company' | 'freelancer'
}) {
  const { walletAddress, role } = params
  const lowerWalletAddress = walletAddress.toLowerCase()

  if (role === 'company') {
    const [company] = await db
      .select()
      .from(companyTable)
      .where(eq(companyTable.walletAddress, lowerWalletAddress))
      .limit(1)

    if (!company) {
      return { isSuccess: true, data: null }
    }
    return { isSuccess: true, data: company }

  } else {
    // role: 'freelancer'
    const [freelancer] = await db
      .select()
      .from(freelancerTable)
      .where(eq(freelancerTable.walletAddress, lowerWalletAddress))
      .limit(1)

    if (!freelancer) {
      return { isSuccess: true, data: null }
    }
    return { isSuccess: true, data: freelancer }
  }
}


/**
 * @function registerUserProfileAction
 * Creates a new row in `company` or `freelancer` table.  Then:
 *   - If role=freelancer and we got a "skills" string, parse it
 *   - For each skill, create or fetch from the "skills" table
 *   - Add bridging entry in user_skills so that submission checks pass
 */
export async function registerUserProfileAction(params: {
  role: 'company' | 'freelancer'
  walletAddress: string
  // Company fields
  companyName?: string
  shortDescription?: string
  logoUrl?: string
  // Freelancer fields
  freelancerName?: string
  skills?: string
  profilePicUrl?: string
}) {
  try {
    console.log(`[Registration] Starting user registration for role: ${params.role}`);
    console.log(`[Registration] SSL settings: DISABLE_SSL_VALIDATION=${process.env.DISABLE_SSL_VALIDATION || 'not set'}`);
    console.log(`[Registration] NODE_TLS_REJECT_UNAUTHORIZED=${process.env.NODE_TLS_REJECT_UNAUTHORIZED || 'not set'}`);
    
    const lowerWalletAddress = params.walletAddress.toLowerCase()
    
    // Check if user already exists
    try {
      const existingUserResult = await getUserProfileAction({
        walletAddress: lowerWalletAddress,
        role: params.role
      });
      
      if (existingUserResult.isSuccess && existingUserResult.data) {
        return { 
          isSuccess: false, 
          message: `User with wallet address ${lowerWalletAddress} already exists`
        };
      }
    } catch (checkError) {
      console.error('[Registration] Error checking for existing user:', checkError);
      // Continue with registration attempt even if check fails
    }
    
    if (params.role === 'company') {
      // Insert into `company` table
      console.log('[Registration] Creating company profile');
      try {
        const [inserted] = await db
          .insert(companyTable)
          .values({
            walletAddress: lowerWalletAddress,
            companyName: params.companyName ?? '',
            shortDescription: params.shortDescription ?? '',
            logoUrl: params.logoUrl ?? '',
          })
          .returning()

        console.log('[Registration] Company profile created successfully');
        return { isSuccess: true, data: inserted }
      } catch (insertError) {
        console.error('[Registration] Error inserting company profile:', insertError);
        return { 
          isSuccess: false, 
          message: 'Failed to create company profile record.',
          error: insertError.message || 'Database error' 
        };
      }
    } else {
      // role = 'freelancer'
      console.log('[Registration] Creating freelancer profile');
      try {
        // 1) Insert the row in `freelancer` table
        const [inserted] = await db
          .insert(freelancerTable)
          .values({
            walletAddress: lowerWalletAddress,
            freelancerName: params.freelancerName ?? '',
            skills: params.skills ?? '',
            profilePicUrl: params.profilePicUrl ?? '',
          })
          .returning()

        console.log('[Registration] Freelancer profile created successfully');

        // 2) If user typed some skills, parse them, create bridging records
        const rawSkillsString = params.skills?.trim() || ''
        if (rawSkillsString) {
          console.log(`[Registration] Processing skills: ${rawSkillsString}`);
          // e.g. "react, solidity"
          const skillNames = rawSkillsString
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)

          for (const skillName of skillNames) {
            // a) Create or fetch row in `skills` table
            console.log(`[Registration] Processing skill: ${skillName}`);
            try {
              const skillRes = await getOrCreateSkillAction(skillName)
              if (skillRes.isSuccess && skillRes.data) {
                // b) Add bridging entry in user_skills
                console.log(`[Registration] Adding skill to user: ${skillName}`);
                await addSkillToUserAction({
                  userId: lowerWalletAddress,
                  skillId: skillRes.data.id
                })
              } else {
                console.warn(`[Registration] Failed to create skill: ${skillName}`, skillRes.message);
              }
            } catch (skillError) {
              console.error(`[Registration] Error processing skill ${skillName}:`, skillError);
              // Continue with other skills even if one fails
            }
          }
        }

        return { isSuccess: true, data: inserted }
      } catch (insertError) {
        console.error('[Registration] Error inserting freelancer profile:', insertError);
        return { 
          isSuccess: false, 
          message: 'Failed to create freelancer profile record.',
          error: insertError.message || 'Database error' 
        };
      }
    }
  } catch (error) {
    console.error('[Registration] Error registering user profile:', error);
    // More detailed error information for debugging
    const errorDetails = {
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN',
      stack: error.stack || 'No stack trace'
    };
    console.error('[Registration] Error details:', errorDetails);
    
    return { 
      isSuccess: false, 
      message: 'Failed to create user profile record.',
      error: errorDetails
    }
  }
}