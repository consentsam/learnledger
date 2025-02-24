"use server"

/**
 * @file submissions-actions.ts
 *
 * @description
 * Server-side actions to manage PR submissions for a given project.
 * This includes:
 *  - createSubmissionAction: Insert a new row for a student's PR link.
 *  - getSubmissionsByProjectAction: Fetch all submissions for a given project.
 *
 * Improvements:
 * - Check if the project is open before allowing the creation of a new submission.
 * - Block the owner from submitting to their own project (studentAddress != projectOwner).
 */

import { db } from "@/db/db"
import { projectSubmissionsTable } from "@/db/schema/project-submissions-schema"
import { projectsTable } from "@/db/schema/projects-schema"
import { eq } from "drizzle-orm"

interface SubmissionParams {
  projectId: string
  studentAddress: string
  prLink: string
}

interface ActionResult<T = any> {
  isSuccess: boolean
  message: string
  data?: T
}

/**
 * @function createSubmissionAction
 * @description
 * Inserts a new PR submission record into the "project_submissions" table.
 * Now checks that the project is open and the student is not the project owner.
 *
 * @param {SubmissionParams} params - projectId, studentAddress, prLink
 * @returns {Promise<ActionResult>} - success or failure object
 */
export async function createSubmissionAction(
  params: SubmissionParams
): Promise<ActionResult> {
  try {
    // 1) Fetch the project to ensure it exists and is open
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, params.projectId))
      .limit(1)

    if (!project) {
      return {
        isSuccess: false,
        message: "Project not found or invalid project ID."
      }
    }

    if (project.projectStatus !== "open") {
      return {
        isSuccess: false,
        message: "Project is not open. Submissions are closed."
      }
    }

    // 2) Ensure student is not the owner
    if (params.studentAddress === project.projectOwner) {
      return {
        isSuccess: false,
        message: "Owner cannot submit a PR to their own project."
      }
    }

    // 3) Insert the submission
    const [insertedRow] = await db
      .insert(projectSubmissionsTable)
      .values({
        projectId: params.projectId,
        studentAddress: params.studentAddress,
        prLink: params.prLink
      })
      .returning()

    return {
      isSuccess: true,
      message: "Submission created successfully",
      data: insertedRow
    }
  } catch (error) {
    console.error("Error creating submission:", error)
    return {
      isSuccess: false,
      message: "Failed to create submission"
    }
  }
}

/**
 * @function getSubmissionsByProjectAction
 * @description
 * Fetches all PR submissions for a given project from the "project_submissions" table.
 *
 * @param {string} projectId - The project's ID
 * @returns {Promise<ProjectSubmission[]>} - An array of submissions
 */
export async function getSubmissionsByProjectAction(
  projectId: string
) {
  try {
    const submissions = await db
      .select()
      .from(projectSubmissionsTable)
      .where(eq(projectSubmissionsTable.projectId, projectId))
      .orderBy(projectSubmissionsTable.createdAt)
    return submissions
  } catch (error) {
    console.error("Error fetching submissions:", error)
    // Return an empty array on failure
    return []
  }
}

