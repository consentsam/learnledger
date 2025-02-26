"use server"

/**
 * @file submissions-actions.ts
 *
 * @description
 * Server-side actions to manage PR submissions for a given project.
 * Key changes:
 * - Now checks if the user has all requiredSkills for the project. If not, blocks the submission.
 *
 * @dependencies
 * - "@/db/db" for Drizzle connection
 * - "@/db/schema/project-submissions-schema" for the submissions table
 * - "@/db/schema/projects-schema" for the project
 * - "@/actions/db/skills-actions" to fetch user’s skills
 * - "drizzle-orm" eq, and, etc. for queries
 */

import { db } from "@/db/db"
import { projectSubmissionsTable } from "@/db/schema/project-submissions-schema"
import { projectsTable } from "@/db/schema/projects-schema"
import { eq } from "drizzle-orm"
import { fetchUserSkillsAction } from "@/actions/db/skills-actions"

/**
 * We'll do a simple parse of the PR link to store possible GitHub repo data.
 */
function extractRepoInfoFromLink(prLink: string) {
  try {
    const url = new URL(prLink)
    // path: /owner/repo/pull/123
    const segments = url.pathname.split("/")
    if (segments.length >= 5 && segments[3] === "pull") {
      return {
        repoOwner: segments[1],
        repoName: segments[2],
        prNumber: parseInt(segments[4], 10),
      }
    }
  } catch (err) {
    // if parsing fails, fallback
  }
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

/**
 * @function createSubmissionAction
 * @description
 * 1) Fetches the project. If not "open", blocks submission.
 * 2) Checks if student has the project's requiredSkills. Blocks if missing any.
 * 3) Inserts a row in `project_submissions`.
 *
 * @param {SubmissionParams} params - The input payload
 * @returns {Promise<ActionResult>} success/fail object
 */
export async function createSubmissionAction(
  params: SubmissionParams
): Promise<ActionResult> {
  try {
    // 1) Fetch project
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
    if (params.studentAddress === project.projectOwner) {
      return {
        isSuccess: false,
        message: "Owner cannot submit a PR to their own project."
      }
    }

    // 2) Check required skills
    const reqSkillsStr = (project.requiredSkills || "").trim()
    if (reqSkillsStr) {
      // parse
      const requiredSkillNames = reqSkillsStr.split(",").map((s) => s.trim()).filter(Boolean)
      // fetch user’s skills
      const userSkillsResult = await fetchUserSkillsAction(params.studentAddress)
      if (!userSkillsResult.isSuccess || !userSkillsResult.data) {
        return {
          isSuccess: false,
          message: `Could not fetch user skills: ${userSkillsResult.message}`
        }
      }
      const userSkillNames = userSkillsResult.data.map((row: any) =>
        (row.skillName || "").toLowerCase()
      )
      // check if user is missing any required skill
      for (const rs of requiredSkillNames) {
        if (!userSkillNames.includes(rs.toLowerCase())) {
          return {
            isSuccess: false,
            message: `You do not have the required skill: ${rs}`
          }
        }
      }
    }

    // 3) Insert the submission row
    const { repoOwner, repoName, prNumber } = extractRepoInfoFromLink(params.prLink)

    const [insertedRow] = await db
      .insert(projectSubmissionsTable)
      .values({
        projectId: params.projectId,
        studentAddress: params.studentAddress,
        prLink: params.prLink,
        repoOwner,
        repoName,
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
): Promise<any[]> {
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
