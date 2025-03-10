// @ts-nocheck
// db/schema/freelancer-schema.ts
import { InferModel } from 'drizzle-orm'
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * @file freelancer-schema.ts
 * Defines a "freelancer" table for users with role='freelancer'
 */
export const freelancerTable = pgTable('freelancer', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletAddress: text('wallet_address').notNull(),

  // The "freelancer name" or public name
  name: text('name').notNull(),

  // For storing their skillset (comma-separated or free text for MVP)
  skills: text('skills'),

  // An optional profile pic
  profilePicUrl: text('profile_pic_url'),

  // Possibly more fields if needed

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})

export type Freelancer = InferModel<typeof freelancerTable>
export type NewFreelancer = InferModel<typeof freelancerTable, 'insert'>