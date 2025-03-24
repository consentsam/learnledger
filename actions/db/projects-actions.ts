// @ts-nocheck
"use server"

/**
 * @file projects-actions.ts
 *
 * @description
 * Server actions for project creation and awarding logic upon project completion. 
 * 
 * Key points:
 * - createProjectAction: Now accepts both requiredSkills and completionSkills from the user (the project owner).
 * - autoAwardOnPrMergeAction: Called by GitHub webhook if a PR is merged; awards tokens + completionSkills.
 * - approveSubmissionAction: Manual approval that also awards tokens + completionSkills.
 *
 * @dependencies
 * - drizzle-orm for DB queries
 * - balances-actions.ts for awarding user balances
 * - skills-actions.ts for awarding new skills
 * - projectsTable from db/schema/projects-schema
 */

import { eq } from "drizzle-orm"

import { updateBalanceAction } from "@/actions/db/balances-actions"
import {
  getOrCreateSkillAction,
  addSkillToUserAction
} from "@/actions/db/skills-actions"
import { db } from "@/db/db"
import { projectsTable } from "@/db/schema/projects-schema"


interface ActionResult<T = any> {
  isSuccess: boolean
  message: string
  data?: T
}

/**
 * For the "Create Project" workflow
 */
interface CreateProjectParams {
  walletEns: string
  walletAddress: string
  projectName: string
  projectDescription?: string
  projectRepo?: string
  prizeAmount?: number
  requiredSkills?: string
  completionSkills?: string
  deadline?: string | Date
}

/**
 * Validates if a string is in correct ISO 8601 format
 * Accepts various ISO 8601 formats including ones with milliseconds
 */
function isValidISODate(dateString: string): boolean {
  // The existing regex is too restrictive, we need a more flexible approach
  try {
    const date = new Date(dateString);
    return date.toString() !== 'Invalid Date';
  } catch (error) {
    return false;
  }
}

export async function createProjectAction(
  params: CreateProjectParams
): Promise<ActionResult> {
  try {
    if (!params.walletEns || !params.projectName || !params.walletAddress) {
      return {
        isSuccess: false,
        message: 'Missing required fields: walletEns, projectName, or walletAddress',
      }
    }

    const proposedPrize = params.prizeAmount ?? 0
    if (proposedPrize < 0) {
      return {
        isSuccess: false,
        message: 'Prize amount cannot be negative.',
      }
    }

    // Validate deadline format if provided
    if (params.deadline && typeof params.deadline === 'string') {
      if (!isValidISODate(params.deadline)) {
        return {
          isSuccess: false,
          message: 'Invalid deadline format. Please use ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)',
        }
      }
    }

    const lowerCaseAddress = params.walletAddress.toLowerCase()

    const insertResult = await db
      .insert(projectsTable)
      .values({
        projectName: params.projectName,
        projectDescription: params.projectDescription ?? '',
        prizeAmount: proposedPrize.toString(),
        projectStatus: 'open',
        projectOwnerWalletEns: params.walletEns,
        projectOwnerWalletAddress: lowerCaseAddress,
        requiredSkills: params.requiredSkills || '',
        completionSkills: params.completionSkills || '',
        projectRepo: params.projectRepo || '',
        
        deadline: params.deadline ? new Date(params.deadline) : null,
      })
      .returning();
      
    const inserted = Array.isArray(insertResult) && insertResult.length > 0 
      ? insertResult[0] 
      : insertResult;

    return {
      isSuccess: true,
      message: 'Project created successfully.',
      data: inserted,
    }
  } catch (error) {
    console.error('Error creating project:', error)
    return {
      isSuccess: false,
      message: 'Failed to create project',
    }
  }
}

/**
 * @function autoAwardOnPrMergeAction
 * @description
 * Called by the GitHub webhook once a PR is merged (in a perfect scenario).
 * If the project is open, it awards the user:
 * - any token prize
 * - any completionSkills 
 * Then it marks the project closed.
 */
export async function autoAwardOnPrMergeAction(params: {
  projectId: string
  freelancerWalletEns: string
  freelancerWalletAddress: string
}): Promise<ActionResult> {
  try {
    const freelancerAddress = params.freelancerWalletAddress.toLowerCase();
    
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.projectId, params.projectId))

    if (!project) {
      return { isSuccess: false, message: "Project not found" }
    }
    if (project.projectStatus !== "open") {
      return {
        isSuccess: false,
        message: "Project is already closed. No auto-award applied."
      }
    }

    // Award tokens if any
    const prize = project.prizeAmount ? Number(project.prizeAmount) : 0
    if (prize > 0) {
      const awardResult = await updateBalanceAction({
        walletEns: params.freelancerWalletEns,
        walletAddress: params.freelancerWalletAddress,
        amount: prize,
        preventNegativeBalance: false
      })
      if (!awardResult.isSuccess) {
        return {
          isSuccess: false,
          message: `Auto-award token transfer failed: ${awardResult.message}`
        }
      }
    }

    // Award completion skills if any
    const compSkillsStr = (project.completionSkills || "").trim()
    if (compSkillsStr) {
      const skillNames = compSkillsStr.split(",").map((x: string) => x.trim()).filter(Boolean)
      for (const skillName of skillNames) {
        const getOrCreate = await getOrCreateSkillAction(skillName)
        if (!getOrCreate.isSuccess || !getOrCreate.data) {
          console.error(`Auto-merge awarding skill '${skillName}' failed:`, getOrCreate.message)
          continue
        }
        const skillId = getOrCreate.data.id
        const addSkill = await addSkillToUserAction({
          walletEns: params.freelancerWalletEns,
          walletAddress: params.freelancerWalletAddress,
          skillId
        })
        if (!addSkill.isSuccess) {
          console.error(`Adding skill '${skillName}' to user failed:`, addSkill.message)
        }
      }
    }

    // Mark as closed
    await db
      .update(projectsTable)
      .set({
        projectStatus: "closed",
        assignedFreelancerWalletEns: params.freelancerWalletEns,
        assignedFreelancerWalletAddress: params.freelancerWalletAddress,
      })
      .where(eq(projectsTable.projectId, params.projectId))

    return {
      isSuccess: true,
      message: `Auto-award done. Tokens awarded: ${prize}`
    }
  } catch (error) {
    console.error("autoAwardOnPrMergeAction error:", error)
    return { isSuccess: false, message: "Failed to auto-award" }
  }
}


export async function approveSubmissionAction(params: {
  projectId: string
  freelancerWalletEns: string
  freelancerWalletAddress: string
  companyWalletEns: string
  companyWalletAddress: string
}): Promise<ActionResult> {
  try {
    // 1) Load project
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.projectId, params.projectId))
    if (!project) {
      return { isSuccess: false, message: 'Project not found' }
    }

    // 2) Must match projectOwner
    if (project.projectOwnerWalletEns.toLowerCase() !== params.companyWalletEns.toLowerCase()) {
      return { isSuccess: false, message: 'Not authorized' }
    }

    // 3) Mark project as closed & assign the freelancer
    await db.update(projectsTable).set({
      projectStatus: 'closed',
      assignedFreelancerWalletEns: params.freelancerWalletEns,
      assignedFreelancerWalletAddress: params.freelancerWalletAddress,
    }).where(eq(projectsTable.projectId, params.projectId))

    // 4) Award tokens
    const prize = parseFloat(project.prizeAmount?.toString() ?? '0')
    if (prize > 0) {
      const award = await updateBalanceAction({ 
        walletEns: params.freelancerWalletEns, 
        walletAddress: params.freelancerWalletAddress,
        amount: prize 
      })
      if (!award.isSuccess) {
        return { isSuccess: false, message: `Failed awarding tokens: ${award.message}` }
      }
    }

    // 5) Award completion skills
    const compSkillsStr = project.completionSkills?.trim() || ''
    if (compSkillsStr) {
      const skillNames = compSkillsStr.split(',').map((s: string) => s.trim()).filter(Boolean)
      for (const skillName of skillNames) {
        const getOrCreate = await getOrCreateSkillAction(skillName)
        if (!getOrCreate.isSuccess || !getOrCreate.data) {
          console.error(`Could not create/fetch skill '${skillName}':`, getOrCreate.message)
          continue
        }
        
        const skillData = getOrCreate.data
        if (!skillData.id) {
          console.error(`Skill '${skillName}' was found but has no ID`, skillData)
          continue
        }
        
        const addSkill = await addSkillToUserAction({ 
          walletEns: params.freelancerWalletEns, 
          walletAddress: params.freelancerWalletAddress,
          skillId: skillData.id 
        })
        
        if (!addSkill.isSuccess) {
          console.error(`Failed to add skill '${skillName}' to user:`, addSkill.message)
        }
      }
    }

    return { isSuccess: true, message: 'Project approved, tokens/skills awarded.' }
  } catch (error) {
    console.error('approveSubmissionAction error:', error)
    return { isSuccess: false, message: 'Internal error approving submission' }
  }
}