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
 */
export async function createSubmissionAction(params: {
  projectId: string
  freelancerAddress: string
  prLink: string
}): Promise<ActionResult> {
  try {
    // Validate input
    if (!params.projectId || !params.freelancerAddress || !params.prLink) {
      return { isSuccess: false, message: 'Missing fields' }
    }

    // 1) Check that project is open & not the same user as owner
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.projectId)).limit(1)
    if (!project) {
      return { isSuccess: false, message: 'Project not found' }
    }
    if (project.projectStatus !== 'open') {
      return { isSuccess: false, message: 'Project is closed. Cannot submit.' }
    }
    if (project.projectOwner.toLowerCase() === params.freelancerAddress.toLowerCase()) {
      return { isSuccess: false, message: 'Owner cannot submit to own project.' }
    }

    // 2) Enforce required skills, if any
    const reqSkillsStr = project.requiredSkills?.trim() || ''
    if (reqSkillsStr) {
      const requiredSkillNames = reqSkillsStr.split(',').map(s => s.trim()).filter(Boolean)
      const userSkills = await fetchUserSkillsAction(params.freelancerAddress.toLowerCase())
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

    // 3) Insert row in projectSubmissionsTable
    const insertResult = await db.insert(projectSubmissionsTable).values({
      projectId: params.projectId,
      freelancerAddress: params.freelancerAddress.toLowerCase(),
      prLink: params.prLink,
      // for GitHub synergy
      repoOwner: extractRepoOwner(params.prLink),
      repoName: extractRepoName(params.prLink),
      prNumber: extractPrNumber(params.prLink),
    }).returning()

    return { isSuccess: true, message: 'Submission created', data: insertResult[0] }
  } catch (error) {
    console.error('createSubmissionAction error:', error)
    return { isSuccess: false, message: 'Internal error creating submission' }
  }
}

// Example helpers
function extractRepoOwner(prLink: string): string {
  try {
    const parts = new URL(prLink).pathname.split('/')
    return parts[1] || 'unknown'
  } catch { return 'unknown' }
}
function extractRepoName(prLink: string): string {
  try {
    const parts = new URL(prLink).pathname.split('/')
    return parts[2] || 'unknown'
  } catch { return 'unknown' }
}
function extractPrNumber(prLink: string): string {
  try {
    const parts = new URL(prLink).pathname.split('/')
    if (parts[3] === 'pull') {
      return parts[4] || '0'
    }
    return '0'
  } catch { return '0' }
}