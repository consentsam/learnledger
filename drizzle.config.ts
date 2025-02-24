import type { Config } from 'drizzle-kit'
import { config } from 'dotenv'
config()

export default {
  schema: './db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
} satisfies Config
