import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

// Check for required environment variable
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set!");
  throw new Error("DATABASE_URL environment variable is required");
}

// Disable TLS certificate validation for development
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Create connection pool with SSL for DigitalOcean PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Set connection timeout and retry options
  connectionTimeoutMillis: 5000, // 5 second timeout
  max: 10, // Maximum 10 clients in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  ssl: {
    rejectUnauthorized: false // Allow self-signed certificates for development
  }
});

// Test database connection on start
pool.connect()
  .then(client => {
    console.log('✅ Successfully connected to DigitalOcean PostgreSQL database');
    client.release();
  })
  .catch(err => {
    console.error('❌ Failed to connect to database:', err.message);
    // We don't throw here to allow the app to start, but the error will be logged
  });

// Export drizzle instance with pool
export const db = drizzle(pool, { logger: true });