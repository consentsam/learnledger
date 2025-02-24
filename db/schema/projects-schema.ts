/**
 * @file projects-schema.ts
 *
 * @description
 * This file contains the Drizzle ORM schema definition for the "projects" table
 * in the ProjectLedger MVP. It stores basic metadata for each posted project
 * (e.g., title, description, reward, owner).
 *
 * Key features:
 * - Column definitions for project name, description, reward, project owner wallet, etc.
 * - Default status "open" upon creation.
 * - Timestamps for creation and updates.
 *
 * @dependencies
 * - drizzle-orm/pg-core: For Postgres column and table creation
 * - drizzle-orm: For InferModel usage
 *
 * @notes
 * - The "prize_amount" uses a numeric type with a precision of (10, 2),
 *   suitable for an off-chain token or placeholder monetary amount.
 * - "project_owner" column stores the Metamask wallet address.
 * - "required_skills" is a simple text column, which might store comma-separated skill IDs
 *   or a serialized format in the MVP phase.
 */

import { pgTable, text, numeric, uuid, timestamp } from 'drizzle-orm/pg-core'
import { InferModel } from 'drizzle-orm'

// Define the projects table schema
export const projectsTable = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),

  // The user-facing name of the project
  projectName: text('project_name').notNull(),

  // Optionally store a link, for instance, to a GitHub repo or external resource
  projectLink: text('project_link'),

  // Brief or detailed description of the project's goal/tasks
  projectDescription: text('project_description'),

  // Off-chain token or monetary reward for completing the project
  prizeAmount: numeric('prize_amount', { precision: 10, scale: 2 }).default('0'),

  // Status of the project, e.g. "open", "closed", "in-progress"
  projectStatus: text('project_status').default('open').notNull(),

  // Wallet address of the user (company) who created the project
  projectOwner: text('project_owner').notNull(),

  // Skills required to take on this project, stored in text form for MVP
  requiredSkills: text('required_skills'),

  // Wallet address of the student assigned or who completed the project
  assignedFreelancer: text('assigned_freelancer'),

  // Auto-managed timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})

/**
 * @description
 * Infer the "Projects" type from the schema for SELECT queries.
 */
export type Project = InferModel<typeof projectsTable>

/**
 * @description
 * Infer the "NewProject" type from the schema for INSERT operations.
 */
export type NewProject = InferModel<typeof projectsTable, 'insert'>
