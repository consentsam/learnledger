/**
 * @file projects-actions.ts
 *
 * @description
 * Provides server-side actions for managing projects within the ProjectLedger MVP.
 * This includes:
 *  - createProjectAction: Inserts a new project into the "projects" table.
 *  - approveSubmissionAction: Used by a project owner to approve a student's PR submission and
 *    award the off-chain token reward to the student via user balance updates.
 *
 * Key features:
 * - createProjectAction:
 *    - Validates required fields (project name, wallet address).
 *    - Prevents negative prizeAmount.
 *    - Inserts a row into the "projects" table.
 * - approveSubmissionAction:
 *    - Validates that the caller is the project owner.
 *    - Checks that the project is still "open" and not yet assigned.
 *    - Rewards the student with the project's prize amount (off-chain balance).
 *    - Updates the project to "closed" and assigns the freelancer's wallet address.
 *
 * @dependencies
 * - "@/db/db": Drizzle-ORM instance used to interact with Postgres.
 * - "@/db/schema/projects-schema": Projects table definition.
 * - "@/actions/db/balances-actions": For awarding tokens.
 * - "drizzle-orm": For query building and conditions (eq).
 *
 * @notes
 * - This improved version ensures no negative prizes and checks project status before approval.
 */

"use server"

import { db } from "@/db/db"
import { eq } from "drizzle-orm"
import { projectsTable } from "@/db/schema/projects-schema"
import { updateBalanceAction } from "@/actions/db/balances-actions"

/**
 * @interface CreateProjectParams
 * Describes the input parameters for createProjectAction.
 */
interface CreateProjectParams {
  /**
   * The Metamask wallet address of the user creating the project.
   */
  walletAddress: string

  /**
   * The title or name of the project.
   */
  projectName: string

  /**
   * A brief or detailed description of the project. (Optional)
   */
  projectDescription?: string

  /**
   * A URL or link to external resources (e.g., GitHub repo). (Optional)
   */
  projectLink?: string

  /**
   * The numeric token reward for completing the project. (Optional)
   */
  prizeAmount?: number

  /**
   * A comma-separated string of skill names/IDs or any format representing required skills. (Optional)
   */
  requiredSkills?: string
}

/**
 * @interface ActionResult
 * Common return type for action responses.
 */
interface ActionResult<T> {
  isSuccess: boolean
  message: string
  data?: T
}

/**
 * @function createProjectAction
 * @description
 * Inserts a new project into the "projects" table. The caller is assumed to be the project owner,
 * identified by their Metamask wallet address.
 *
 * Includes new checks for negative prizeAmount.
 *
 * @param {CreateProjectParams} params - The project creation parameters.
 * @returns {Promise<ActionResult<any>>} An object indicating success or failure.
 */
export async function createProjectAction(
  params: CreateProjectParams
): Promise<ActionResult<any>> {
  try {
    // Basic validation
    if (!params.walletAddress || !params.projectName) {
      return {
        isSuccess: false,
        message: "Missing required fields: walletAddress or projectName"
      }
    }

    // Prevent negative prize amounts
    const proposedPrize = params.prizeAmount ?? 0
    if (proposedPrize < 0) {
      return {
        isSuccess: false,
        message: "Prize amount cannot be negative."
      }
    }

    // Insert new project
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

/**
 * @interface ApproveSubmissionParams
 * Describes the input parameters for approveSubmissionAction.
 */
interface ApproveSubmissionParams {
  /**
   * The ID of the project to approve.
   */
  projectId: string

  /**
   * The Metamask wallet address of the student who submitted the PR.
   */
  studentAddress: string

  /**
   * The Metamask wallet address of the caller (must match the project owner's address).
   */
  walletAddress: string
}

/**
 * @function approveSubmissionAction
 * @description
 * Allows a project owner to approve a student's PR submission, closing the project
 * and awarding the project's prize to the student. It sets the `assignedFreelancer` to
 * the student's address and marks the project as "closed".
 *
 * Now includes:
 * - Checking project is open and not assigned.
 * - Confirming the caller is indeed the owner.
 *
 * @param {ApproveSubmissionParams} params - The parameters for approving the submission.
 * @returns {Promise<ActionResult<any>>} An object indicating success or failure of the operation.
 */
export async function approveSubmissionAction(
  params: ApproveSubmissionParams
): Promise<ActionResult<any>> {
  try {
    // Fetch the project
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, params.projectId))

    if (!project) {
      return { isSuccess: false, message: "Project not found" }
    }

    // Ensure the caller is the project owner
    if (project.projectOwner !== params.walletAddress) {
      return { isSuccess: false, message: "Not authorized to approve this project" }
    }

    // Check if project is already closed or assigned
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

    // Block case if student is the same as projectOwner (just in case)
    if (params.studentAddress === project.projectOwner) {
      return {
        isSuccess: false,
        message: "Project owner cannot approve themselves as the freelancer."
      }
    }

    // Award the tokens to the student
    const prize = project.prizeAmount ? Number(project.prizeAmount) : 0
    if (prize < 0) {
      // Should never happen if validated, but just in case
      return { isSuccess: false, message: "Prize amount is invalid (negative)." }
    }

    const awardResult = await updateBalanceAction({
      userId: params.studentAddress,
      amount: prize,
      preventNegativeBalance: false, // awarding tokens is always a positive addition
    })

    if (!awardResult.isSuccess) {
      return { isSuccess: false, message: "Failed to award tokens to the student" }
    }

    // Mark project as closed and assign the freelancer
    await db
      .update(projectsTable)
      .set({
        projectStatus: "closed",
        assignedFreelancer: params.studentAddress
      })
      .where(eq(projectsTable.id, params.projectId))

    return {
      isSuccess: true,
      message: `Submission approved successfully. Prize of ${prize} awarded to student.`,
      data: {
        ...project,
        assignedFreelancer: params.studentAddress,
        projectStatus: "closed"
      }
    }
  } catch (error) {
    console.error("Error approving submission:", error)
    return { isSuccess: false, message: "Failed to approve submission" }
  }
}

