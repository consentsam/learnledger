// @ts-nocheck
"use server"

import { db } from '@/db/db'
import { projectSubmissionsTable } from '@/db/schema/project-submissions-schema'
import { projectsTable } from '@/db/schema/projects-schema'
import { eq } from 'drizzle-orm'

import { fetchUserSkillsAction } from '@/actions/db/skills-actions'

// For returning success/fail states
interface ActionResult<T=any> {
  isSuccess: boolean
  message: string
  data?: T
}

/**
 * createSubmissionAction => used by POST /api/submissions/create
 * POST body in Postman:
 * {
 *   "projectId": "string",
 *   "freelancerWallet": "string",
 *   "submissionText": "string",
 *   "githubLink": "string"
 * }
 */
export async function createSubmissionAction(params: {
  projectId: string
  freelancerWallet: string
  submissionText?: string
  githubLink?: string
}): Promise<ActionResult> {
  try {
    // Validate input
    if (!params.projectId || !params.freelancerWallet) {
      return { isSuccess: false, message: 'Missing required fields: projectId or freelancerWallet' }
    }

    // 1) Check that project is open & not the same user as owner
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, params.projectId))
      .limit(1)
    if (!project) {
      return { isSuccess: false, message: 'Project not found' }
    }
    if (project.projectStatus !== 'open') {
      return { isSuccess: false, message: 'Project is closed. Cannot submit.' }
    }
    if (project.projectOwner.toLowerCase() === params.freelancerWallet.toLowerCase()) {
      return { isSuccess: false, message: 'Owner cannot submit to own project.' }
    }

    // 2) Enforce required skills, if any
    const reqSkillsStr = project.requiredSkills?.trim() || ''
    if (reqSkillsStr) {
      const requiredSkillNames = reqSkillsStr.split(',').map(s => s.trim()).filter(Boolean)
      const userSkills = await fetchUserSkillsAction(params.freelancerWallet.toLowerCase())
      if (!userSkills.isSuccess) {
        return { isSuccess: false, message: `Failed to fetch user skills: ${userSkills.message}` }
      }
      const userSkillNames = (userSkills.data as any[]).map(s => (s.skillName || '').toLowerCase())

      for (const skill of requiredSkillNames) {
        if (!userSkillNames.includes(skill.toLowerCase())) {
          return { isSuccess: false, message: `Missing required skill: ${skill}` }
        }
      }
    }
    console.log("Did the code reach here?");

    // 3) Insert row in projectSubmissionsTable
    const insertResult = await db.insert(projectSubmissionsTable).values({
      projectId: params.projectId,
      freelancerAddress: params.freelancerWallet.toLowerCase(),
      prLink: params.githubLink ?? '',
      submissionText: params.submissionText ?? '',
      repoOwner: extractRepoOwner(params.githubLink || ''),
      repoName: extractRepoName(params.githubLink || ''),
      prNumber: extractPrNumber(params.githubLink || ''),
    }).returning()

    return { isSuccess: true, message: 'Submission created', data: insertResult[0] }
  } catch (error) {
    console.error('createSubmissionAction error:', error)
    return { isSuccess: false, message: 'Internal error creating submission' }
  }
}

export async function rejectSubmissionAction(params: {
  submissionId: string,
  reason?: string,             // optional reason
  companyWalletEns: string,    // or walletAddress
}): Promise<ActionResult> {
  try {
    // 1) find submission
    const [submission] = await db
      .select()
      .from(projectSubmissionsTable)
      .where(eq(projectSubmissionsTable.id, params.submissionId))
      .limit(1)

    if (!submission) {
      return { isSuccess: false, message: 'Submission not found' }
    }

    // 2) Here you’d verify that the companyWalletEns => 
    //    can “own” the project? Possibly do a join on the project to ensure 
    //    the user is the project’s owner. Omitted for brevity.

    // 3) Update it to rejected
    const [updated] = await db
      .update(projectSubmissionsTable)
      .set({
        status: 'rejected',
        isMerged: false, // to ensure consistent
        updatedAt: new Date(),
      })
      .where(eq(projectSubmissionsTable.id, params.submissionId))
      .returning()
    
    return {
      isSuccess: true,
      message: 'Submission was rejected successfully.',
      data: updated,
    }
  } catch (error) {
    console.error('[rejectSubmissionAction] error:', error)
    return { isSuccess: false, message: 'Internal error rejecting submission' }
  }
}

// Example helpers
function extractRepoOwner(githubLink: string): string {
  try {
    const parts = new URL(githubLink).pathname.split('/')
    return parts[1] || 'unknown'
  } catch { return 'unknown' }
}
function extractRepoName(githubLink: string): string {
  try {
    const parts = new URL(githubLink).pathname.split('/')
    return parts[2] || 'unknown'
  } catch { return 'unknown' }
}
function extractPrNumber(githubLink: string): string {
  try {
    const parts = new URL(githubLink).pathname.split('/')
    if (parts[3] === 'pull') {
      return parts[4] || '0'
    }
    return '0'
  } catch { return '0' }
}