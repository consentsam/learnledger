// app/api/github/webhook/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/db"
import { projectSubmissionsTable } from "@/db/schema/project-submissions-schema"
import { autoAwardOnPrMergeAction } from "@/actions/db/projects-actions"
import { eq, and } from "drizzle-orm"

export async function POST(req: NextRequest) {
  if (process.env.AUTO_AWARD_GITHUB_WEBHOOK !== "true") {
    console.log("Auto-award is OFF. Doing nothing.")
    return NextResponse.json({ message: "Auto-award disabled" }, { status: 200 })
  }

  const payload = await req.json()

  // Verify this is a “pull_request closed” event with merged = true
  if (
    payload?.pull_request?.merged === true &&
    payload?.action === "closed"
  ) {
    const repoOwner = payload.repository.owner.login
    const repoName  = payload.repository.name
    const prNumber  = payload.pull_request.number

    // Look up submission
    const [ submission ] = await db
      .select()
      .from(projectSubmissionsTable)
      .where(
        and(
          eq(projectSubmissionsTable.repoOwner, repoOwner),
          eq(projectSubmissionsTable.repoName, repoName),
          eq(projectSubmissionsTable.prNumber, prNumber.toString())
        )
      )
      .limit(1)

    console.log("submission", submission)

    if (!submission) {
      return NextResponse.json({ message: "No matching submission" }, { status: 200 })
    }

    // auto-award
    const result = await autoAwardOnPrMergeAction({
      projectId: submission.projectId,
      studentAddress: submission.studentAddress
    })

    return NextResponse.json({ message: result.message }, { status: 200 })
  }

  return NextResponse.json({ message: "Not a PR merged event" }, { status: 200 })
}
