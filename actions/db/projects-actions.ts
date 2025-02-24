/**
 * @file projects-actions.ts
 *
 * @description
 * Provides server-side actions for managing projects within the ProjectLedger MVP.
 * 
 * Key features:
 * - createProjectAction: Inserts a new project into "projects" table.
 * - approveSubmissionAction: Manually approves a student's submission, awarding tokens.
 * - autoAwardOnPrMergeAction: Auto-awards tokens when a GitHub PR is merged (triggered by webhook).
 *
 * @dependencies
 * - "@/db/db": Drizzle-ORM instance used to interact with Postgres.
 * - "@/db/schema/projects-schema": Projects table definition
 * - "@/actions/db/balances-actions": For awarding tokens
 * - "drizzle-orm": eq for conditions
 *
 * @notes
 * - If you only want auto-award, you can remove approveSubmissionAction.
 * - If you want manual override, keep it.
 */

"use server"

import { db } from "@/db/db"
import { eq } from "drizzle-orm"
import { projectsTable } from "@/db/schema/projects-schema"
import { updateBalanceAction } from "@/actions/db/balances-actions"

/**
 * @interface ActionResult
 * Common return type for action responses.
 */
interface ActionResult<T = any> {
  isSuccess: boolean
  message: string
  data?: T
}

/* ------------------------------------------------------------------
   1) createProjectAction
   Inserts a new project record in "projects" table.
   This is used by the /api/projects/create route or by a server component.
------------------------------------------------------------------ */

/**
 * @interface CreateProjectParams
 * The input parameters for createProjectAction.
 */
interface CreateProjectParams {
  walletAddress: string
  projectName: string
  projectDescription?: string
  projectLink?: string
  prizeAmount?: number
  requiredSkills?: string
}

/**
 * @function createProjectAction
 * @description
 * Inserts a new project into the "projects" table. 
 * 
 * @param {CreateProjectParams} params
 * @returns {Promise<ActionResult>} success/failure object
 */
export async function createProjectAction(
  params: CreateProjectParams
): Promise<ActionResult> {
  try {
    if (!params.walletAddress || !params.projectName) {
      return {
        isSuccess: false,
        message: "Missing required fields: walletAddress or projectName"
      }
    }

    const proposedPrize = params.prizeAmount ?? 0
    if (proposedPrize < 0) {
      return {
        isSuccess: false,
        message: "Prize amount cannot be negative."
      }
    }

    const [inserted] = await db
      .insert(projectsTable)
      .values({
        projectName: params.projectName,
        projectDescription: params.projectDescription ?? "",
        projectLink: params.projectLink ?? "",
        prizeAmount: proposedPrize.toString(),
        projectOwner: params.walletAddress,
        requiredSkills: params.requiredSkills ?? ""
      })
      .returning()

    return {
      isSuccess: true,
      message: "Project created successfully.",
      data: inserted
    }
  } catch (error) {
    console.error("Error creating project:", error)
    return {
      isSuccess: false,
      message: "Failed to create project"
    }
  }
}

/* ------------------------------------------------------------------
   2) approveSubmissionAction
   Manually approves a student's submission, awarding tokens.
   If you rely solely on GitHub webhooks for awarding,
   you can keep this as a fallback or remove it.
------------------------------------------------------------------ */

/**
 * @interface ApproveSubmissionParams
 */
interface ApproveSubmissionParams {
  projectId: string
  studentAddress: string
  walletAddress: string // must match projectOwner
}

/**
 * @function approveSubmissionAction
 * @description
 * Allows a project owner to manually approve a student's PR submission,
 * awarding the project's prize to that student. It closes the project 
 * and sets assignedFreelancer to that student.
 *
 * @param {ApproveSubmissionParams} params
 * @returns {Promise<ActionResult>} success/failure
 */
export async function approveSubmissionAction(
  params: ApproveSubmissionParams
): Promise<ActionResult> {
  try {
    // 1) Fetch the project by ID
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, params.projectId))

    if (!project) {
      return { isSuccess: false, message: "Project not found" }
    }

    // 2) Validate the caller is the projectOwner
    if (project.projectOwner !== params.walletAddress) {
      return { isSuccess: false, message: "Not authorized to approve this project" }
    }

    // 3) Check status
    if (project.projectStatus !== "open") {
      return {
        isSuccess: false,
        message: "Project is not open. Cannot approve submissions."
      }
    }
    if (project.assignedFreelancer) {
      return {
        isSuccess: false,
        message: "Project already has an assigned freelancer."
      }
    }

    // 4) Avoid awarding to self
    if (params.studentAddress === project.projectOwner) {
      return {
        isSuccess: false,
        message: "Owner cannot be assigned as the freelancer."
      }
    }

    // 5) Award tokens
    const prize = project.prizeAmount ? Number(project.prizeAmount) : 0
    if (prize < 0) {
      return { isSuccess: false, message: "Invalid (negative) prize amount." }
    }

    const awardResult = await updateBalanceAction({
      userId: params.studentAddress,
      amount: prize,
      preventNegativeBalance: false
    })

    if (!awardResult.isSuccess) {
      return { isSuccess: false, message: "Failed to award tokens to student" }
    }

    // 6) Mark project as closed and assign freelancer
    await db
      .update(projectsTable)
      .set({
        projectStatus: "closed",
        assignedFreelancer: params.studentAddress
      })
      .where(eq(projectsTable.id, params.projectId))

    return {
      isSuccess: true,
      message: `Submission approved. Awarded ${prize} to ${params.studentAddress}.`,
      data: {
        ...project,
        assignedFreelancer: params.studentAddress,
        projectStatus: "closed"
      }
    }

  } catch (error) {
    console.error("Error approving submission:", error)
    return {
      isSuccess: false,
      message: "Failed to approve submission."
    }
  }
}

/* ------------------------------------------------------------------
   3) autoAwardOnPrMergeAction
   Called automatically by the GitHub webhook once we detect a merged PR.
------------------------------------------------------------------ */

/**
 * @interface AutoAwardParams
 * For awarding tokens automatically once we confirm the PR is merged from a GitHub webhook.
 */
interface AutoAwardParams {
  projectId: string
  studentAddress: string
}

/**
 * @function autoAwardOnPrMergeAction
 * @description
 * Called by our GitHub webhook logic once we know the PR is merged. This automatically
 * awards the project’s prize to the given student, provided the project is still open
 * and not assigned. Then it sets projectStatus to "closed" and assignedFreelancer to that student.
 *
 * @param {AutoAwardParams} params - The project ID and the student's wallet address.
 * @returns {Promise<ActionResult<any>>} - success/failure
 */
export async function autoAwardOnPrMergeAction(
  params: AutoAwardParams
): Promise<ActionResult<any>> {
  const { projectId, studentAddress } = params

  try {
    // 1) Fetch the project
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))

    if (!project) {
      return { isSuccess: false, message: "Project not found" }
    }

    // 2) Check if project is open and unassigned
    if (project.projectStatus !== "open") {
      return {
        isSuccess: false,
        message: "Project is not open. Cannot auto-award tokens."
      }
    }
    if (project.assignedFreelancer) {
      return {
        isSuccess: false,
        message: "Project already has an assigned freelancer."
      }
    }

    // 3) Avoid awarding to the project owner
    if (studentAddress === project.projectOwner) {
      return {
        isSuccess: false,
        message: "Project owner cannot be assigned as the freelancer."
      }
    }

    // 4) Award tokens
    const prize = project.prizeAmount ? Number(project.prizeAmount) : 0
    if (prize < 0) {
      return { isSuccess: false, message: "Prize amount is invalid (negative)." }
    }

    const awardResult = await updateBalanceAction({
      userId: studentAddress,
      amount: prize,
      preventNegativeBalance: false
    })
    if (!awardResult.isSuccess) {
      return { isSuccess: false, message: "Failed to award tokens to the student" }
    }

    // 5) Mark project as closed and assign the freelancer
    await db
      .update(projectsTable)
      .set({
        projectStatus: "closed",
        assignedFreelancer: studentAddress
      })
      .where(eq(projectsTable.id, projectId))

    return {
      isSuccess: true,
      message: `Auto-award success. Prize of ${prize} awarded to student ${studentAddress}.`,
      data: {
        ...project,
        assignedFreelancer: studentAddress,
        projectStatus: "closed"
      }
    }

  } catch (error) {
    console.error("Error auto-awarding tokens:", error)
    return {
      isSuccess: false,
      message: "Failed to auto-award tokens on PR merge."
    }
  }
}