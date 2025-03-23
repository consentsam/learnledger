// @ts-nocheck
"use server"

import { db } from "@/db/db"
import { skillsTable } from "@/db/schema/skills-schema"
import { userSkillsTable } from "@/db/schema/user-skills-schema"
import { freelancerTable } from "@/db/schema/freelancer-schema"
import { eq, and, sql } from "drizzle-orm"

interface ActionResult<T = any> {
  isSuccess: boolean
  message: string
  data?: T
}

export async function createSkillAction(
  skillName: string,
  skillDescription: string = ""
): Promise<ActionResult> {
  try {
    // First check if exists
    const existingResult = await db
      .select()
      .from(skillsTable)
      .where(
        eq(
          sql`LOWER(${skillsTable.skillName})`, 
          sql`LOWER(${skillName})`
        )
      )
      .limit(1);
    
    const existing = existingResult.length > 0 ? existingResult[0] : null;

    if (existing) {
      return {
        isSuccess: false,
        message: `Skill '${skillName}' already exists`,
        data: existing
      }
    }

    // Fix array destructuring issue
    const insertResult = await db
      .insert(skillsTable)
      .values({
        skillName,
        skillDescription
      })
      .returning();
    
    const newSkill = Array.isArray(insertResult) && insertResult.length > 0 
      ? insertResult[0] 
      : insertResult;

    return {
      isSuccess: true,
      message: `Skill '${skillName}' created`,
      data: newSkill
    }
  } catch (error) {
    console.error("Error in createSkillAction:", error)
    return {
      isSuccess: false,
      message: "Failed to create skill"
    }
  }
}

export async function getSkillByNameAction(skillName: string): Promise<ActionResult> {
  try {
    // Replace ilike with LOWER + like pattern
    const result = await db
      .select()
      .from(skillsTable)
      .where(
        eq(
          sql`LOWER(${skillsTable.skillName})`, 
          sql`LOWER(${skillName})`
        )
      )
      .limit(1);
    
    const skillRecord = result.length > 0 ? result[0] : null;

    if (!skillRecord) {
      return {
        isSuccess: false,
        message: `Skill '${skillName}' not found`
      }
    }

    return {
      isSuccess: true,
      message: `Skill found`,
      data: skillRecord
    }
  } catch (error) {
    console.error("Error in getSkillByNameAction:", error)
    return {
      isSuccess: false,
      message: "Failed to get skill by name"
    }
  }
}

export async function getOrCreateSkillAction(skillName: string, skillDescription?: string): Promise<ActionResult> {
  try {
    const result = await db
      .select()
      .from(skillsTable)
      .where(sql`${skillsTable.skillName} ILIKE ${skillName}`)
      .limit(1);
    
    const existingSkill = result.length > 0 ? result[0] : null;

    if (existingSkill) {
      return {
        isSuccess: true,
        message: "Skill found",
        data: existingSkill
      }
    }

    const insertResult = await db
      .insert(skillsTable)
      .values({
        skillName: skillName,
        skillDescription: skillDescription ?? ""
      })
      .returning();
      
    const newSkill = Array.isArray(insertResult) && insertResult.length > 0 
      ? insertResult[0] 
      : insertResult;

    return {
      isSuccess: true,
      message: "Skill created",
      data: newSkill
    }
  } catch (error) {
    console.error("Error in getOrCreateSkillAction:", error)
    return {
      isSuccess: false,
      message: "Failed to get or create skill"
    }
  }
}

export async function addSkillToUserAction(params: { walletEns: string; walletAddress: string; skillId: string }): Promise<ActionResult> {
  try {
    const lowerWalletEns = params.walletEns.toLowerCase()
    const lowerWalletAddress = params.walletAddress.toLowerCase()
    
    // first check if user already has this skill
    const userSkillResults = await db
      .select()
      .from(userSkillsTable)
      .where(
        and(
          eq(userSkillsTable.walletEns, lowerWalletEns),
          eq(userSkillsTable.walletAddress, lowerWalletAddress),
          eq(userSkillsTable.skillId, params.skillId)
        )
      )
      .limit(1)
      
    const userSkill = userSkillResults.length > 0 ? userSkillResults[0] : null
    
    if (userSkill) {
      return {
        isSuccess: false,
        message: "User already has this skill",
        data: userSkill
      }
    }
    
    // otherwise insert
    const result = await db
      .insert(userSkillsTable)
      .values({ walletEns: lowerWalletEns, walletAddress: lowerWalletAddress, skillId: params.skillId })
      .returning()
      
    const inserted = Array.isArray(result) && result.length > 0 ? result[0] : result
    
    return {
      isSuccess: true,
      message: "Skill added to user profile",
      data: inserted
    }
  } catch (error) {
    console.error("Error in addSkillToUserAction:", error)
    return {
      isSuccess: false,
      message: "Failed to add skill to user"
    }
  }
}

/**
 * @function fetchUserSkillsAction
 * 
 * Returns all the skill rows for a given walletAddress user, **either** from:
 *  - bridging table user_skills (if that has data),
 *  - or fallback to the freelancer's .skills column if bridging is empty.
 */
export async function fetchUserSkillsAction(walletEns: string): Promise<ActionResult> {
  if (!walletEns) {
    return { isSuccess: false, message: "Wallet ENS is required" }
  }
  try {
    const lowerWalletEns = walletEns.toLowerCase();

   /*  // 1) Attempt bridging table first
    const rows = await db
      .select({
        userSkillId: userSkillsTable.id,
        userId: userSkillsTable.userId,
        skillId: userSkillsTable.skillId,
        addedAt: userSkillsTable.addedAt,
        skillName: skillsTable.skillName,
        skillDescription: skillsTable.skillDescription,
      })
      .from(userSkillsTable)
      .leftJoin(skillsTable, eq(userSkillsTable.skillId, skillsTable.skillId))
      .where(eq(userSkillsTable.userId, lowerUserId))

    // If bridging is not empty, return that
    if (rows.length > 0) {
      return {
        isSuccess: true,
        message: `Fetched skills for userId: ${lowerUserId} from bridging`,
        data: rows
      }
    } */

    // 2) If bridging is empty, fallback to reading the freelancer table .skills
    const [freelancer] = await db
      .select()
      .from(freelancerTable)
      .where(eq(freelancerTable.walletEns, lowerWalletEns))
      .limit(1)

    if (!freelancer) {
      // No bridging + no freelancer found => empty result
      return {
        isSuccess: true,
        message: `No freelancer row for ${lowerWalletEns}`,
        data: []
      }
    }

    const fallbackRaw = freelancer.skills?.trim() || ''
    if (!fallbackRaw) {
      // They just have no skill string
      return {
        isSuccess: true,
        message: `Fallback: freelancer has an empty .skills column`,
        data: []
      }
    }

    // parse the raw "react, solidity" => create a pseudo array of skill objects
    const skillNames = fallbackRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    // Convert them to the same shape as bridging
    const fallbackRows = skillNames.map((sn) => ({
      userSkillId: '', // no bridging ID
      userId: lowerWalletEns,
      skillId: '', // we don't have a skill row ID, not bridging
      addedAt: new Date(),
      skillName: sn.toLowerCase(),
      skillDescription: ''
    }))

    return {
      isSuccess: true,
      message: `Fallback: returning .skills column for freelancer ${lowerWalletEns}`,
      data: fallbackRows
    }
  } catch (error) {
    console.error("Error fetching user skills:", error)
    return { isSuccess: false, message: "Failed to fetch user skills" }
  }
}