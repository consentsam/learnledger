// actions/db/projects-actions.ts

import { db } from "@/db/db"
import { ActionResult } from "next/dist/server/app-render/types"
import { projectsTable } from "@/db/schema/projects-schema"
import { eq } from "drizzle-orm"
import { updateBalanceAction } from "@/actions/db/balances-actions"
interface CreateProjectParams {
  walletAddress: string
  projectName: string
  projectDescription?: string
  // existing fields ...
  // Now add projectRepo:
  projectRepo?: string
  prizeAmount?: number
  requiredSkills?: string
}

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
        prizeAmount: proposedPrize.toString(),
        projectOwner: params.walletAddress,
        requiredSkills: params.requiredSkills ?? "",
        
        // New field for the repo
        projectRepo: params.projectRepo ?? "",
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

export async function autoAwardOnPrMergeAction(params: {
  projectId: string
  studentAddress: string
}): Promise<ActionResult> {
  try {
    // 1) fetch project
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, params.projectId))

    if (!project) {
      return { isSuccess: false, message: "Project not found" }
    }

    if (project.projectStatus !== "open") {
      return {
        isSuccess: false,
        message: "Project is already closed. No award."
      }
    }

    // 2) parse the prize
    const prize = project.prizeAmount ? Number(project.prizeAmount) : 0
    if (prize <= 0) {
      // no prize to award
      return { isSuccess: false, message: "No prize to award." }
    }

    // 3) update balance
    const awardResult = await updateBalanceAction({
      userId: params.studentAddress,
      amount: prize,
      preventNegativeBalance: false,
    })
    if (!awardResult.isSuccess) {
      return {
        isSuccess: false,
        message: "Failed to award tokens"
      }
    }

    // 4) close project
    await db
      .update(projectsTable)
      .set({
        projectStatus: "closed",
        assignedFreelancer: params.studentAddress
      })
      .where(eq(projectsTable.id, params.projectId))

    return {
      isSuccess: true,
      message: `Auto-award success. ${prize} tokens sent to ${params.studentAddress}.`
    }

  } catch (error) {
    console.error("Auto-award error:", error)
    return { isSuccess: false, message: "Failed to auto-award" }
  }
}

export async function approveSubmissionAction(params: {
  projectId: string
  studentAddress: string
  walletAddress: string
}) {
  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, params.projectId))

    if (!project || project.projectOwner !== params.walletAddress) {
      return { isSuccess: false, message: "Not authorized" }
    }

    // 1) Close the project
    await db
      .update(projectsTable)
      .set({
        projectStatus: "closed",
        assignedFreelancer: params.studentAddress
      })
      .where(eq(projectsTable.id, params.projectId))

    // 2) Award the tokens
    const prize = Number(project.prizeAmount ?? 0)
    if (prize > 0) {
      const result = await updateBalanceAction({
        userId: params.studentAddress,
        amount: prize
      })
      if (!result.isSuccess) {
        return {
          isSuccess: false,
          message: `Project closed but awarding tokens failed: ${result.message}`
        }
      }
    }

    return {
      isSuccess: true,
      message: `Submission approved. ${prize} tokens sent to ${params.studentAddress}`
    }
  } catch (error) {
    console.error("approveSubmissionAction error:", error)
    return { isSuccess: false, message: "Failed to approve" }
  }
}
