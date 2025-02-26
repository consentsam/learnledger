/**
 * @file projects-schema.ts
 *
 * @description
 * Defines the "projects" table schema for ProjectLedger. Each project can have:
 * - requiredSkills: A comma-separated list of skills that students must have to submit a PR
 * - completionSkills: A comma-separated list of skills that students gain upon completing this project
 *
 * Key columns:
 * - projectName
 * - prizeAmount (off-chain token reward)
 * - projectOwner (the company's wallet address)
 * - requiredSkills
 * - completionSkills
 * - projectRepo (GitHub or repo link)
 * - projectStatus (default "open")
 *
 * @dependencies
 * - drizzle-orm/pg-core for columns
 * - drizzle-orm for typed model inferences
 *
 * @notes
 * Make sure you have run a migration or ALTER statement to add "completion_skills" and "required_skills" columns if you didn't have them before.
 */

import { InferModel } from 'drizzle-orm'
import { pgTable, text, numeric, uuid, timestamp } from 'drizzle-orm/pg-core'

export const projectsTable = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),

  projectName: text('project_name').notNull(),
  projectDescription: text('project_description'),
  prizeAmount: numeric('prize_amount', { precision: 10, scale: 2 }).default('0'),
  projectStatus: text('project_status').default('open').notNull(),
  projectOwner: text('project_owner').notNull(),

  /**
   * @field requiredSkills
   * A comma-separated list of skill names that a user MUST have to submit a PR
   */
  requiredSkills: text('required_skills'),

  /**
   * @field completionSkills
   * A comma-separated list of skill names that the user GAINS upon project completion
   */
  completionSkills: text('completion_skills'),

  assignedFreelancer: text('assigned_freelancer'),
  projectRepo: text('project_repo'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})

export type Project = InferModel<typeof projectsTable>
export type NewProject = InferModel<typeof projectsTable, 'insert'>
