// app/api/github/webhook/route.ts
import { eq, and } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { autoAwardOnPrMergeAction } from '@/actions/db/projects-actions'
import { db } from '@/db/db'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'

export async function POST(req: NextRequest) {
  // <--- This MUST be "true" in your environment or it short-circuits:
  if (process.env.AUTO_AWARD_GITHUB_WEBHOOK !== "true") {
    console.log("Auto-award is OFF. Doing nothing.")
    return NextResponse.json({ message: "Auto-award disabled" }, { status: 200 })
  }

  const payload = await req.json()

  // We must have action=closed + merged=true
  if (
    payload?.pull_request?.merged === true &&
    payload?.action === "closed"
  ) {
    const repoOwner = payload.repository.owner.login
    const repoName  = payload.repository.name
    const prNumber  = payload.pull_request.number

    // Look up submission in DB
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

    console.log("submission found => ", submission)

    if (!submission) {
      return NextResponse.json({ message: "No matching submission" }, { status: 200 })
    }

    // 1) Mark isMerged = true in DB
    await db
      .update(projectSubmissionsTable)
      .set({ isMerged: true })
      .where(eq(projectSubmissionsTable.id, submission.id))

    // 2) Attempt awarding tokens + completion skills
    const result = await autoAwardOnPrMergeAction({
      projectId: submission.projectId,
      freelancerAddress: submission.freelancerAddress
    })

    return NextResponse.json({ message: result.message }, { status: 200 })
  }

  // Not the right event
  return NextResponse.json({ message: "Not a PR merged event" }, { status: 200 })
}