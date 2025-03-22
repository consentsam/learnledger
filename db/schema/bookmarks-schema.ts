// file: /db/schema/bookmarks-schema.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'


export const bookmarksTable = pgTable('bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletEns: text('wallet_ens').notNull(),
  projectId: uuid('project_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Bookmark = typeof bookmarksTable.$inferSelect
export type NewBookmark = typeof bookmarksTable.$inferInsert