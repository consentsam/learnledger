/**
 * @file project-submissions-schema.ts
 *
 * @description
 * Defines the "project_submissions" table for storing student PR submissions.
 * Each submission belongs to a single project, identified by `projectId`, and
 * includes the student's wallet address, plus the PR link.
 *
 * Key features:
 * - Each record references the project via `projectId`.
 * - `studentAddress` tracks which wallet address submitted the PR.
 * - `prLink` is a string for the GitHub PR URL.
 * - `createdAt` is a timestamp of when the submission was made.
 *
 * @dependencies
 * - drizzle-orm/pg-core for Postgres columns
 * - drizzle-orm for typed model inference
 *
 * @notes
 * - In a real system, you'd likely index or foreign-key constrain `projectId`
 *   to the projects table. For an MVP, we can skip foreign keys.
 */

import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { InferModel } from 'drizzle-orm'

export const projectSubmissionsTable = pgTable('project_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),

  // The project to which this submission belongs
  projectId: text('project_id').notNull(),

  // The student's wallet address
  studentAddress: text('student_address').notNull(),

  // The GitHub PR link (or any relevant link)
  prLink: text('pr_link').notNull(),

  // Timestamp of creation
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/**
 * @description
 * Submission type for SELECT queries
 */
export type ProjectSubmission = InferModel<typeof projectSubmissionsTable>

/**
 * @description
 * NewSubmission type for INSERT statements
 */
export type NewProjectSubmission = InferModel<typeof projectSubmissionsTable, 'insert'>
