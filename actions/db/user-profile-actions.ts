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
    const lowerWalletAddress = params.walletAddress.toLowerCase()
    
    if (params.role === 'company') {
      // Insert into `company` table
      const [inserted] = await db
        .insert(companyTable)
        .values({
          walletAddress: lowerWalletAddress,
          companyName: params.companyName ?? '',
          shortDescription: params.shortDescription ?? '',
          logoUrl: params.logoUrl ?? '',
        })
        .returning()

      return { isSuccess: true, data: inserted }
    } else {
      // role = 'freelancer'
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

      // 2) If user typed some skills, parse them, create bridging records
      const rawSkillsString = params.skills?.trim() || ''
      if (rawSkillsString) {
        // e.g. "react, solidity"
        const skillNames = rawSkillsString
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)

        for (const skillName of skillNames) {
          // a) Create or fetch row in `skills` table
          const skillRes = await getOrCreateSkillAction(skillName)
          if (skillRes.isSuccess && skillRes.data) {
            // b) Add bridging entry in user_skills
            await addSkillToUserAction({
              userId: lowerWalletAddress,
              skillId: skillRes.data.id
            })
          }
        }
      }

      return { isSuccess: true, data: inserted }
    }
  } catch (error) {
    console.error('Error registering user profile:', error)
    return { isSuccess: false, message: 'Failed to create user profile record.' }
  }
}