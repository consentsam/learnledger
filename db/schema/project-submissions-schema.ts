/**
 * @file project-submissions-schema.ts
 *
 * @description
 * Defines the "project_submissions" table for storing student PR submissions.
 * Each submission belongs to a single project, identified by `projectId`,
 * and includes the student's wallet address, plus the PR link.
 *
 * Now extended to store optional GitHub-specific fields to facilitate webhook matching:
 *  - repoOwner: the GitHub user or org name
 *  - repoName: the repository name
 *  - prNumber: the pull request number
 *
 * Key features:
 * - "projectId" references which project the submission is for
 * - "studentAddress" is the user’s wallet address
 * - "prLink" is a string for the GitHub PR URL
 * - "repoOwner", "repoName", "prNumber" are optional but help us do an exact match
 * - "createdAt" is the timestamp of submission creation
 *
 * @dependencies
 * - drizzle-orm/pg-core for Postgres columns
 * - drizzle-orm for typed model inference
 *
 * @notes
 * - In an actual production environment, you'd add a proper migration if
 *   these columns didn't exist initially.
 */

import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { InferModel } from 'drizzle-orm'

export const projectSubmissionsTable = pgTable('project_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),

  // The project to which this submission belongs
  projectId: text('project_id').notNull(),

  // The student's wallet address
  studentAddress: text('student_address').notNull(),

  // The GitHub PR link (e.g. "https://github.com/owner/repo/pull/123")
  prLink: text('pr_link').notNull(),

  // OPTIONAL: extracted from prLink to facilitate matching the GH webhook
  repoOwner: text('repo_owner'),   // e.g., "facebook"
  repoName: text('repo_name'),     // e.g., "react"
  prNumber: integer('pr_number'),  // e.g., 123

  // Timestamp of creation
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type ProjectSubmission = InferModel<typeof projectSubmissionsTable>
export type NewProjectSubmission = InferModel<typeof projectSubmissionsTable, 'insert'>
