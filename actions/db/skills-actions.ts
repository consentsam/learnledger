"use server"

import { db } from "@/db/db"
import { skillsTable } from "@/db/schema/skills-schema"
import { userSkillsTable } from "@/db/schema/user-skills-schema"
import { eq, ilike, and } from "drizzle-orm"

interface ActionResult<T = any> {
  isSuccess: boolean
  message: string
  data?: T
}

export async function createSkillAction(skillName: string, skillDescription?: string): Promise<ActionResult> {
  if (!skillName.trim()) {
    return { isSuccess: false, message: "Skill name cannot be empty" }
  }
  try {
    // We'll do a fetch check first (like getSkillByNameAction)
    const existing = await getSkillByNameAction(skillName)
    if (existing.isSuccess && existing.data) {
      return {
        isSuccess: false,
        message: `Skill '${skillName}' already exists`,
        data: existing.data
      }
    }
    // create new
    const [inserted] = await db.insert(skillsTable).values({
      skillName,
      skillDescription: skillDescription ?? ""
    }).returning()
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

export async function getSkillByNameAction(skillName: string): Promise<ActionResult> {
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
    return { isSuccess: true, message: `Skill '${skillName}' found.`, data: skill }
  } catch (error) {
    console.error("Error fetching skill by name:", error)
    return { isSuccess: false, message: "Failed to fetch skill" }
  }
}

export async function getOrCreateSkillAction(skillName: string, skillDescription?: string): Promise<ActionResult> {
  // try existing first
  const existing = await getSkillByNameAction(skillName)
  if (existing.isSuccess && existing.data) {
    return {
      isSuccess: true,
      message: `Skill '${skillName}' already exists`,
      data: existing.data
    }
  }
  // if not found, create it
  const created = await createSkillAction(skillName, skillDescription)
  if (!created.isSuccess || !created.data) {
    return {
      isSuccess: false,
      message: `Failed to create skill '${skillName}': ${created.message}`
    }
  }
  return {
    isSuccess: true,
    message: created.message,
    data: created.data
  }
}

export async function addSkillToUserAction(params: { userId: string; skillId: string }): Promise<ActionResult> {
  if (!params.userId || !params.skillId) {
    return { isSuccess: false, message: "Missing userId or skillId." }
  }
  try {
    // check bridging table
    const [existingRow] = await db
      .select()
      .from(userSkillsTable)
      .where(
        and(
          eq(userSkillsTable.userId, params.userId),
          eq(userSkillsTable.skillId, params.skillId)
        )
      )
      .limit(1)

    if (existingRow) {
      return {
        isSuccess: true,
        message: "User already has this skill",
        data: existingRow
      }
    }
    // otherwise insert
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

export async function fetchUserSkillsAction(userId: string): Promise<ActionResult> {
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
        skillDescription: skillsTable.skillDescription,
      })
      .from(userSkillsTable)
      .leftJoin(skillsTable, eq(userSkillsTable.skillId, skillsTable.id))
      .where(eq(userSkillsTable.userId, userId))

    return { isSuccess: true, message: `Fetched skills for userId: ${userId}`, data: rows }
  } catch (error) {
    console.error("Error fetching user skills:", error)
    return { isSuccess: false, message: "Failed to fetch user skills" }
  }
}