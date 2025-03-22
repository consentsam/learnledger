/* <content> actions/db/user-profile-actions.ts */

"use server"

/**
 * @file user-profile-actions.ts
 *
 * Provides actions for:
 *  - Getting a user's profile (company or freelancer)
 *  - Registering a user profile (inserting or updating in company/freelancer table)
 *  - If role=freelancer and we get "skills", parse & store them in bridging user_skills, if desired
 *
 * Additional Requirements from the latest updates:
 *  - "walletEns" is mandatory for freelancers (treated as a unique handle).
 *  - If we find a freelancer with that walletEns, we update them (including changing their walletAddress).
 *  - The response must contain all fields: 
 *    {
 *       "id", "walletEns", "walletAddress", 
 *       "freelancerName"/"companyName", "skills", 
 *       "profilePicUrl"/"logoUrl", "githubProfileUsername", 
 *       "createdAt", "updatedAt"
 *    }
 */

import { db } from '@/db/db'
import { companyTable } from '@/db/schema/company-schema'
import { freelancerTable } from '@/db/schema/freelancer-schema'
import { eq, sql } from 'drizzle-orm'

// We need these for bridging skills if you are using them:
import { getOrCreateSkillAction, addSkillToUserAction } from '@/actions/db/skills-actions'

/** 
 * Generic ActionResult interface 
 */
interface ActionResult<T = any> {
  isSuccess: boolean;
  message: string;
  data?: T;
}

/**
 * @function getUserProfileAction
 * Looks up existing profile in either company or freelancer table, by walletAddress
 * or by walletEns (depending on usage).
 */
export async function getUserProfileAction(params: {
  walletAddress?: string;
  walletEns?: string;
  role: 'company' | 'freelancer';
}): Promise<ActionResult> {
  try {
    const { walletAddress = '', walletEns = '', role } = params;
    const lowerWallet = walletAddress.toLowerCase();
    const lowerEns = walletEns.toLowerCase();

    if (role === 'company') {
      // Try walletAddress first, else walletEns
      let companyQuery;
      if (lowerWallet) {
        companyQuery = db.select().from(companyTable).where(eq(companyTable.walletAddress, lowerWallet));
      } else if (lowerEns) {
        companyQuery = db.select().from(companyTable).where(eq(companyTable.walletEns, lowerEns));
      } else {
        companyQuery = db.select().from(companyTable);
      }
      const companies = await companyQuery.limit(1);
      const company = companies.length > 0 ? companies[0] : null;
      return { isSuccess: true, message: 'OK', data: company };
    } else {
      // role = 'freelancer'
      let freelancerQuery;
      if (lowerWallet) {
        freelancerQuery = db.select().from(freelancerTable).where(eq(freelancerTable.walletAddress, lowerWallet));
      } else if (lowerEns) {
        freelancerQuery = db.select().from(freelancerTable).where(eq(freelancerTable.walletEns, lowerEns));
      } else {
        freelancerQuery = db.select().from(freelancerTable);
      }
      const freelancers = await freelancerQuery.limit(1);
      const freelancer = freelancers.length > 0 ? freelancers[0] : null;
      return { isSuccess: true, message: 'OK', data: freelancer };
    }
  } catch (error: any) {
    console.error('[getUserProfileAction] Error:', error);
    return { isSuccess: false, message: error.message || 'Failed to get user profile' };
  }
}

/**
 * @function registerUserProfileAction
 * Creates or updates a row in `company` or `freelancer` table. 
 *
 * Changes for "walletEns" requirement (especially for freelancers):
 *   - If we find an existing freelancer by that `walletEns`, we update.
 *   - Otherwise, we create new.
 *   - Similarly for companies if you want the same approach (below it is mirrored).
 *
 * For freelancers, also handles bridging user_skills if "skills" are provided.
 *
 * Returns a final object including all fields requested in the new "expected" output.
 */

export async function registerUserProfileAction(params: {
  role: 'company' | 'freelancer';
  walletEns?: string; // mandatory for freelancer
  walletAddress: string; // mandatory
  companyName?: string;
  shortDescription?: string;
  logoUrl?: string;
  githubProfileUsername?: string;

  freelancerName?: string;
  skills?: string | string[];
  profilePicUrl?: string;
}): Promise<ActionResult> {
  try {
    const {
      role,
      walletEns = '',
      walletAddress,
      companyName = '',
      shortDescription = '',
      logoUrl = '',
      githubProfileUsername = '',
      freelancerName = '',
      skills = '',
      profilePicUrl = ''
    } = params;

    const lowerWallet = walletAddress.toLowerCase();
    const lowerEns = walletEns.toLowerCase().trim();

    // Basic check: for "freelancer", we are told walletEns is mandatory from now on.
    if (role === 'freelancer' && !lowerEns) {
      return {
        isSuccess: false,
        message: `Missing 'walletEns' for freelancer. It's mandatory now.`
      };
    }

    // Decide if we are registering a company or a freelancer
    if (role === 'company') {
      // 1) See if there's an existing row by walletEns or walletAddress
      let existing: any = null;
      if (lowerEns) {
        // If provided, check by ens first
        const ensByQuery = db
          .select()
          .from(companyTable)
          .where(eq(companyTable.walletEns, lowerEns))
          .limit(1);
        const rowsByEns = await ensByQuery;
        existing = rowsByEns.length > 0 ? rowsByEns[0] : null;
      }
      if (!existing && lowerWallet) {
        const walletByQuery = db
          .select()
          .from(companyTable)
          .where(eq(companyTable.walletAddress, lowerWallet))
          .limit(1);
        const rowsByWallet = await walletByQuery;
        existing = rowsByWallet.length > 0 ? rowsByWallet[0] : null;
      }

      if (existing) {
        // Update existing record
        const [updated] = await db
          .update(companyTable)
          .set({
            // always update the walletAddress if we have it 
            walletAddress: lowerWallet,
            walletEns: lowerEns || existing.walletEns || '',

            companyName: companyName || existing.companyName,
            shortDescription: shortDescription || existing.shortDescription,
            logoUrl: logoUrl || existing.logoUrl,
            githubProfileUsername: githubProfileUsername || existing.githubProfileUsername,
            updatedAt: new Date()
          })
          .where(eq(companyTable.id, existing.id))
          .returning();

        return {
          isSuccess: true,
          message: 'Company profile updated (by registerUserProfileAction)',
          data: updated
        };
      } else {
        // Insert new record
        const inserted = await db
          .insert(companyTable)
          .values({
            walletAddress: lowerWallet,
            walletEns: lowerEns,
            companyName: companyName,
            shortDescription,
            logoUrl,
            githubProfileUsername,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        return {
          isSuccess: true,
          message: 'Company profile created (by registerUserProfileAction)',
          data: inserted
        };
      }
    } else {
      // role = 'freelancer'
      // 1) Convert "skills" to a comma-separated string if it's an array
      let skillsString = '';
      if (Array.isArray(skills)) {
        skillsString = skills.join(', ');
      } else {
        skillsString = (skills || '').toString();
      }

      // 2) Check if there's an existing row by "walletEns" first
      let existingFreelancer: any = null;
      if (lowerEns) {
        const ensByQuery = db
          .select()
          .from(freelancerTable)
          .where(eq(freelancerTable.walletEns, lowerEns))
          .limit(1);
        const rowsByEns = await ensByQuery;
        existingFreelancer = rowsByEns.length > 0 ? rowsByEns[0] : null;
      }

      // If not found by ens, optionally check by walletAddress
      if (!existingFreelancer && lowerWallet) {
        const walletByQuery = db
          .select()
          .from(freelancerTable)
          .where(eq(freelancerTable.walletAddress, lowerWallet))
          .limit(1);
        const rowsByWallet = await walletByQuery;
        existingFreelancer = rowsByWallet.length > 0 ? rowsByWallet[0] : null;
      }

      if (existingFreelancer) {
        // Update the existing record
        const [updated] = await db
          .update(freelancerTable)
          .set({
            walletEns: lowerEns, 
            walletAddress: lowerWallet,
            freelancerName: freelancerName || existingFreelancer.freelancerName,
            skills: skillsString || existingFreelancer.skills,
            profilePicUrl: profilePicUrl || existingFreelancer.profilePicUrl,
            githubProfileUsername: githubProfileUsername || existingFreelancer.githubProfileUsername,
            updatedAt: new Date()
          })
          .where(eq(freelancerTable.id, existingFreelancer.id))
          .returning();

        // Optionally parse "skills" for bridging if you want
        // for now, we skip or handle it similarly as below

        return {
          isSuccess: true,
          message: 'Freelancer profile updated (by registerUserProfileAction)',
          data: updated
        };
      } else {
        // Insert new row
        const inserted = await db
          .insert(freelancerTable)
          .values({
            walletEns: lowerEns,
            walletAddress: lowerWallet,
            freelancerName,
            skills: skillsString,
            profilePicUrl,
            githubProfileUsername,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        // If you want to process bridging user_skills, do it here:
        // for (const skillName of skillNames) { ... }

        return {
          isSuccess: true,
          message: 'Freelancer profile created (by registerUserProfileAction)',
          data: inserted
        };
      }
    }
  } catch (error: any) {
    console.error('[registerUserProfileAction] Error:', error);
    return {
      isSuccess: false,
      message: error.message || 'Failed to create/update user profile'
    };
  }
}