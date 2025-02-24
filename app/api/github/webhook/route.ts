/**
 * @file route.ts
 *
 * @description
 * Provides a Next.js API route to handle incoming GitHub webhook events at /api/github/webhook.
 * Specifically, we watch for "pull_request" events. If a PR is merged, we locate the corresponding
 * submission in our DB and automatically award tokens via autoAwardOnPrMergeAction.
 *
 * Key features:
 * - Minimal signature verification placeholder (recommended for real use).
 * - Expects a "pull_request" event with "action=closed" and "pull_request.merged=true".
 * - We parse the "repository.owner.login", "repository.name", "number" from the payload to find
 *   a matching record in project_submissions (via repoOwner, repoName, prNumber).
 *
 * @dependencies
 * - NextRequest, NextResponse from 'next/server'
 * - autoAwardOnPrMergeAction from '@/actions/db/projects-actions'
 * - db, projectSubmissionsTable
 *
 * @notes
 * - You must configure a GitHub webhook pointing to /api/github/webhook with "Pull requests" event.
 * - For a real app, you should verify the "X-Hub-Signature-256" to confirm authenticity.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

import { db } from '@/db/db'
import { eq } from 'drizzle-orm'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { autoAwardOnPrMergeAction } from '@/actions/db/projects-actions'

// If you're using a secret, set it in your .env: GITHUB_WEBHOOK_SECRET="..."
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || ""

// Helper to verify signature (placeholder approach)
function verifyGithubSignature(
  requestBody: string,
  signature: string
): boolean {
  if (!GITHUB_WEBHOOK_SECRET) {
    // If no secret is set, skip
    return true
  }
  if (!signature) {
    return false
  }
  const hmac = createHmac("sha256", GITHUB_WEBHOOK_SECRET)
  const digest = "sha256=" + hmac.update(requestBody).digest("hex")
  return digest === signature
}

export async function POST(req: NextRequest) {
  // 1) Read the raw body for signature verification
  const rawBody = await req.text()

  // 2) GitHub signature
  const ghSignature =
    req.headers.get("X-Hub-Signature-256") ||
    req.headers.get("x-hub-signature-256") ||
    ""

  // 3) Verify signature
  const isVerified = verifyGithubSignature(rawBody, ghSignature)
  if (!isVerified) {
    return NextResponse.json(
      { message: "Signature mismatch or missing." },
      { status: 401 }
    )
  }

  // 4) Now parse the JSON body from raw text
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch (err) {
    return NextResponse.json(
      { message: "Invalid JSON payload" },
      { status: 400 }
    )
  }

  // 5) We only care about "pull_request" event with "closed" action
  const eventName = req.headers.get("X-GitHub-Event")
  if (eventName !== "pull_request") {
    return NextResponse.json(
      { message: "Not a pull_request event." },
      { status: 200 }
    )
  }

  if (payload.action !== "closed") {
    return NextResponse.json(
      { message: "Not a closed PR event." },
      { status: 200 }
    )
  }

  // 6) Check if the PR is merged
  if (!payload.pull_request?.merged) {
    return NextResponse.json(
      { message: "PR closed but not merged. Skipping awarding." },
      { status: 200 }
    )
  }

  // 7) Extract GH data
  const repoOwner = payload.repository?.owner?.login
  const repoName = payload.repository?.name
  const prNumber = payload.pull_request?.number
  if (!repoOwner || !repoName || !prNumber) {
    return NextResponse.json(
      { message: "Missing required repository or PR info." },
      { status: 400 }
    )
  }

  // 8) Find a matching submission in our DB
  //    This is assuming we store "repoOwner", "repoName", "prNumber" in the submissions table
  //    If you only store a 'prLink', you'd do a fallback match by checking the
  //    .html_url in the pull_request object vs. your stored prLink.
  const [submission] = await db
    .select()
    .from(projectSubmissionsTable)
    .where(eq(projectSubmissionsTable.repoOwner, repoOwner))
    .where(eq(projectSubmissionsTable.repoName, repoName))
    .where(eq(projectSubmissionsTable.prNumber, prNumber))
    .limit(1)

  if (!submission) {
    return NextResponse.json(
      { message: `No matching submission found for PR #${prNumber}` },
      { status: 200 }
    )
  }

  // 9) We have a valid submission => call autoAwardOnPrMergeAction
  const result = await autoAwardOnPrMergeAction({
    projectId: submission.projectId,
    studentAddress: submission.studentAddress,
  })

  if (!result.isSuccess) {
    return NextResponse.json(
      { message: `Failed to auto-award tokens: ${result.message}` },
      { status: 200 }
    )
  }

  // 10) Done - success
  return NextResponse.json(
    { message: `Auto-award success: ${result.message}` },
    { status: 200 }
  )
}
