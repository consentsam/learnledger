"use server"

/**
 * @file skills-actions.ts
 *
 * @description
 * This file contains server actions related to the management of skills.
 * We store global skill definitions in the `skillsTable`, and track user
 * skill ownership in the `userSkillsTable`. 
 *
 * New Feature:
 * - A `getOrCreateSkillAction` function to streamline awarding skills:
 *   it checks if a skill with the given name already exists. If not, it creates it.
 *
 * Key features:
 * - `createSkillAction(skillName, skillDescription?)`: Creates a new skill if not found.
 * - `getSkillByNameAction(skillName)`: Looks up an existing skill by name (case-insensitive).
 * - `addSkillToUserAction({ userId, skillId })`: Assigns an existing skill to a user.
 * - `fetchUserSkillsAction(userId)`: Retrieves the user’s skill entries, joined with skill data.
 * - **New** `getOrCreateSkillAction(skillName)`: A convenience function to ensure
 *   a skill record is available, returning the skill object.
 *
 * @dependencies
 * - "@/db/db": Drizzle ORM connection
 * - "@/db/schema/skills-schema" and "@/db/schema/user-skills-schema"
 * - "drizzle-orm": eq, ilike conditions
 *
 * @notes
 * - Skills in the MVP are referenced by name. This might be refined in the future
 *   for more robust skill identification (like unique slugs).
 * - We store skillName as text, and do an "iLike" match for case-insensitive lookups.
 */

import { db } from "@/db/db"
import { skillsTable } from "@/db/schema/skills-schema"
import { userSkillsTable } from "@/db/schema/user-skills-schema"
import { eq, ilike, and } from "drizzle-orm"

/**
 * @interface ActionResult
 * A generic response interface for server actions.
 * @property isSuccess - True if action completed successfully, otherwise false
 * @property message - Human-readable message describing the outcome
 * @property data - Optional returned data payload
 */
interface ActionResult<T = any> {
  isSuccess: boolean
  message: string
  data?: T
}

/**
 * @function createSkillAction
 * @description
 * Creates a new skill in the `skillsTable`, if it does not already exist (case-sensitive).
 * For a "strict" create, we do not attempt to check existing records beyond the optional
 * "ilike" check. If you want to avoid duplicates, either call `getSkillByNameAction` first
 * or consider using `getOrCreateSkillAction`.
 *
 * @param {string} skillName - The name of the skill to insert
 * @param {string} [skillDescription] - Optional skill description
 * @returns {Promise<ActionResult>} - A success/fail result with the new row data
 */
export async function createSkillAction(
  skillName: string,
  skillDescription?: string
): Promise<ActionResult> {
  if (!skillName.trim()) {
    return { isSuccess: false, message: "Skill name cannot be empty" }
  }

  try {
    // Quick approach: if skill already exists (ilike match),
    // we can choose to block or return an error. For now, we won't block strictly here.
    // If you want to block duplicates, uncomment or handle it gracefully:
    const existing = await getSkillByNameAction(skillName)
    if (existing.isSuccess && existing.data) {
      return {
        isSuccess: false,
        message: `Skill '${skillName}' already exists`,
        data: existing.data
      }
    }
    /*
    const [existing] = await db
      .select()
      .from(skillsTable)
      .where(ilike(skillsTable.skillName, skillName))
      .limit(1)
    if (existing) {
      return {
        isSuccess: false,
        message: `Skill '${skillName}' already exists`,
        data: existing
      }
    }
    */

    const [inserted] = await db
      .insert(skillsTable)
      .values({
        skillName: skillName,
        skillDescription: skillDescription || ""
      })
      .returning()

    return {
      isSuccess: true,
      message: `Skill '${skillName}' created successfully.`,
      data: inserted
    }
  } catch (error) {
    console.error("Error creating skill:", error)
    return { isSuccess: false, message: "Failed to create skill" }
  }
}

/**
 * @function getSkillByNameAction
 * @description
 * Fetches a skill record by name (case-insensitive).
 *
 * @param {string} skillName - The name of the skill
 * @returns {Promise<ActionResult>} - A success/fail result with the skill row (if found)
 */
export async function getSkillByNameAction(
  skillName: string
): Promise<ActionResult> {
  if (!skillName.trim()) {
    return { isSuccess: false, message: "Skill name cannot be empty" }
  }

  try {
    const [skill] = await db
      .select()
      .from(skillsTable)
      .where(ilike(skillsTable.skillName, skillName))
      .limit(1)

    if (!skill) {
      return { isSuccess: false, message: `Skill '${skillName}' not found.` }
    }

    return {
      isSuccess: true,
      message: `Skill '${skillName}' found.`,
      data: skill
    }
  } catch (error) {
    console.error("Error fetching skill by name:", error)
    return { isSuccess: false, message: "Failed to fetch skill" }
  }
}

/**
 * @function getOrCreateSkillAction
 * @description
 * Convenience function to ensure a skill record exists for the given skillName.
 * 1) Attempt to fetch an existing skill by name.
 * 2) If not found, create it.
 *
 * @param {string} skillName - The name of the skill
 * @param {string} [skillDescription] - Optional skill description
 * @returns {Promise<ActionResult>} - success + skill record if found/created
 */
export async function getOrCreateSkillAction(
  skillName: string,
  skillDescription?: string
): Promise<ActionResult> {
  // 1) Attempt to fetch
  const existing = await getSkillByNameAction(skillName)
  if (existing.isSuccess && existing.data) {
    // Already found
    return {
      isSuccess: true,
      message: `Skill '${skillName}' already exists`,
      data: existing.data
    }
  }

  // 2) Not found; create it
  const created = await createSkillAction(skillName, skillDescription)
  if (!created.isSuccess || !created.data) {
    return {
      isSuccess: false,
      message: `Failed to create skill '${skillName}': ${created.message}`
    }
  }

  // Return the newly created skill
  return {
    isSuccess: true,
    message: created.message,
    data: created.data
  }
}

/**
 * @function addSkillToUserAction
 * @description
 * Associates a skill with a user in `user_skills` if not already present.
 *
 * @param {object} params - The user ID (wallet address) and skill ID
 * @property {string} params.userId - The user’s wallet address
 * @property {string} params.skillId - The skill’s UUID
 *
 * @returns {Promise<ActionResult>} - success/fail with inserted data
 */
export async function addSkillToUserAction(params: {
  userId: string
  skillId: string
}): Promise<ActionResult> {
  if (!params.userId || !params.skillId) {
    return { isSuccess: false, message: "Missing userId or skillId." }
  }

  try {
    const [existingRow] = await db
      .select()
      .from(userSkillsTable)
      .where(and(eq(userSkillsTable.userId, params.userId), eq(userSkillsTable.skillId, params.skillId)))
      .limit(1)

    if (existingRow) {
      return {
        isSuccess: true,
        message: "User already has this skill",
        data: existingRow
      }
    }

    const [inserted] = await db
      .insert(userSkillsTable)
      .values({ userId: params.userId, skillId: params.skillId })
      .returning()

    return {
      isSuccess: true,
      message: "Skill assigned to user successfully",
      data: inserted
    }
  } catch (error) {
    console.error("Error adding skill to user:", error)
    return { isSuccess: false, message: "Failed to assign skill to user" }
  }
}

/**
 * @function fetchUserSkillsAction
 * @description
 * Retrieves all skills a user possesses (joined with the skill name + description).
 *
 * @param {string} userId - The user’s ID (wallet address)
 * @returns {Promise<ActionResult>} - success/fail with an array of row data
 */
export async function fetchUserSkillsAction(
  userId: string
): Promise<ActionResult> {
  if (!userId) {
    return { isSuccess: false, message: "User ID is required" }
  }

  try {
    const rows = await db
      .select({
        userSkillId: userSkillsTable.id,
        userId: userSkillsTable.userId,
        skillId: userSkillsTable.skillId,
        addedAt: userSkillsTable.addedAt,
        skillName: skillsTable.skillName,
        skillDescription: skillsTable.skillDescription
      })
      .from(userSkillsTable)
      .leftJoin(skillsTable, eq(userSkillsTable.skillId, skillsTable.id))
      .where(eq(userSkillsTable.userId, userId))

    return {
      isSuccess: true,
      message: `Fetched skills for userId: ${userId}`,
      data: rows
    }
  } catch (error) {
    console.error("Error fetching user skills:", error)
    return { isSuccess: false, message: "Failed to fetch user skills" }
  }
}
