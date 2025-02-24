// db/schema/projects-schema.ts
import { pgTable, text, numeric, uuid, timestamp } from 'drizzle-orm/pg-core'
import { InferModel } from 'drizzle-orm'

export const projectsTable = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),

  projectName: text('project_name').notNull(),
  projectDescription: text('project_description'),
  prizeAmount: numeric('prize_amount', { precision: 10, scale: 2 }).default('0'),
  projectStatus: text('project_status').default('open').notNull(),
  projectOwner: text('project_owner').notNull(),
  requiredSkills: text('required_skills'),
  assignedFreelancer: text('assigned_freelancer'),
  
  // Add this new column for the associated GitHub repo
  projectRepo: text('project_repo'), // e.g. "github.com/consentsam/demo"

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
    .$onUpdate(() => new Date()),
})

export type Project = InferModel<typeof projectsTable>
export type NewProject = InferModel<typeof projectsTable, 'insert'>
