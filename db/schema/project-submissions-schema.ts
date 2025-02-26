/**
 * @file project-submissions-schema.ts
 *
 * @description
 * Defines the "project_submissions" table for storing student PR submissions.
 * Each submission belongs to a single project, identified by `projectId`,
 * and includes the student's wallet address, plus the PR link, plus a new
 * `isMerged` field to indicate whether the submission’s PR has been merged.
 */

import { InferModel } from 'drizzle-orm'
import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'

export const projectSubmissionsTable = pgTable('project_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),

  // The project to which this submission belongs
  projectId: uuid('project_id').notNull(),

  // The student's wallet address
  studentAddress: text('student_address').notNull(),

  // The GitHub PR link (e.g. "https://github.com/owner/repo/pull/123")
  prLink: text('pr_link').notNull(),

  // OPTIONAL: extracted from prLink to facilitate matching the GH webhook
  repoOwner: text('repo_owner').notNull(),  // e.g., "facebook"
  repoName: text('repo_name').notNull(),    // e.g., "react"
  prNumber: text('pr_number').notNull(),    // e.g., "123"

  /**
   * @field isMerged
   * Indicates if this submission's PR was actually merged.
   * Updated by GitHub webhook or manual logic if you want.
   */
  isMerged: boolean('is_merged').default(false).notNull(),

  // Timestamp of creation
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type ProjectSubmission = InferModel<typeof projectSubmissionsTable>
export type NewProjectSubmission = InferModel<typeof projectSubmissionsTable, 'insert'>