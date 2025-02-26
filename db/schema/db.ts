/**
 * @description
 * This file configures our Drizzle ORM connection to a local (or remote) Postgres database.
 * It exports a single `db` object that can be imported by server actions or other utilities.
 *
 * Key features:
 * - Creates a pg Pool using `process.env.DATABASE_URL`
 * - Passes the Pool to Drizzle for executing queries
 *
 * @dependencies
 * - pg: Postgres client for Node.js
 * - drizzle-orm: ORM for TypeScript
 *
 * @notes
 * - Ensure `DATABASE_URL` is set in your .env.local file
 * - Drizzle uses the `pool` to run queries
 * - No schema imports yet (that will come when we create schema definitions)
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

// Pull from environment variable
const connectionString = process.env.DATABASE_URL

// Create a connection pool with pg
const pool = new Pool({
  connectionString,
})

// Create and export the Drizzle ORM instance
export const db = drizzle(pool, { logger: true })
