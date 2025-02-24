import { pgTable, uuid, text, numeric, timestamp } from 'drizzle-orm/pg-core'

export const userBalancesTable = pgTable('user_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  balance: numeric('balance', { precision: 12, scale: 2 }).default('0'),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})