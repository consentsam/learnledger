// db/schema/company-schema.ts
import { InferModel } from 'drizzle-orm'
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const companyTable = pgTable('company', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletAddress: text('wallet_address').notNull(),

  companyName: text('company_name').notNull(),
  shortDescription: text('short_description'),
  logoUrl: text('logo_url'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})

export type Company = InferModel<typeof companyTable>
export type NewCompany = InferModel<typeof companyTable, 'insert'>