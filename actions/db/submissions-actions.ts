"use server"

/**
 * @file submissions-actions.ts
 *
 * @description
 * Server-side actions to manage PR submissions for a given project.
 * - createSubmissionAction: Insert a new row for a student's PR link.
 * - getSubmissionsByProjectAction: Fetch all submissions for a given project.
 */

import { db } from "@/db/db"
import { projectSubmissionsTable } from "@/db/schema/project-submissions-schema"
import { projectsTable } from "@/db/schema/projects-schema"
import { eq } from "drizzle-orm"

/**
 * We define a utility function to parse the PR link:
 * Example: https://github.com/consentsam/demo-project-ledger/pull/2
 *  - owner: consentsam
 *  - repo: demo-project-ledger
 *  - prNumber: 2
 *
 * We'll do a simple regex or string-split approach.
 */
function extractRepoInfoFromLink(prLink: string) {
  // This pattern should match: https://github.com/<owner>/<repo>/pull/<number>
  // We'll be naive and assume it always matches. In production, handle errors carefully!
  try {
    const url = new URL(prLink)
    // path = /consentsam/demo-project-ledger/pull/2
    const segments = url.pathname.split("/")
    // segments[1] = "consentsam"
    // segments[2] = "demo-project-ledger"
    // segments[3] = "pull"
    // segments[4] = "2"
    if (segments.length >= 5 && segments[3] === "pull") {
      return {
        repoOwner: segments[1],
        repoName: segments[2],
        prNumber: parseInt(segments[4], 10),
      }
    }
  } catch (err) {
    // If it fails to parse, fallback or return placeholders
  }
  // Fallback if something weird
  return {
    repoOwner: "placeholder",
    repoName: "placeholder",
    prNumber: 0,
  }
}

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

    // 3) Parse the PR link properly to store in the DB
    const { repoOwner, repoName, prNumber } = extractRepoInfoFromLink(
      params.prLink
    )

    // 4) Insert the submission
    const [insertedRow] = await db
      .insert(projectSubmissionsTable)
      .values({
        projectId: params.projectId,
        studentAddress: params.studentAddress,
        prLink: params.prLink,
        repoOwner: repoOwner,
        repoName: repoName,
        prNumber: prNumber.toString(),
      })
      .returning()

    return {
      isSuccess: true,
      message: "Submission created successfully",
      data: insertedRow,
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
    return []
  }
}
