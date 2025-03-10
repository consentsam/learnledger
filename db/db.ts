import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

// Check for required environment variable
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set!");
  throw new Error("DATABASE_URL environment variable is required");
}

// Function to get CA certificate based on environment
function getCACertificate() {
  // If SSL validation is explicitly disabled via env var, don't bother with certificate
  if (process.env.DISABLE_SSL_VALIDATION === 'true') {
    console.warn("⚠️ SSL certificate validation disabled via environment variable");
    return undefined;
  }

  try {
    // For production (Vercel), try multiple possible locations
    if (process.env.NODE_ENV === 'production') {
      // Try standard paths for Vercel deployments
      const possiblePaths = [
        path.join(process.cwd(), 'public/certs/ca-certificate.crt'),
        path.join(process.cwd(), '.vercel/output/static/certs/ca-certificate.crt'),
        path.join(process.cwd(), 'certs/ca-certificate.crt')
      ];
      
      for (const certPath of possiblePaths) {
        if (fs.existsSync(certPath)) {
          console.log(`✅ Found CA certificate at: ${certPath}`);
          return fs.readFileSync(certPath).toString();
        }
      }
      
      console.warn("⚠️ Could not find CA certificate in Vercel environment");
    } else {
      // For local development, try to use the certificate from the downloads directory
      const devCertPath = '/Users/sattu/Downloads/ca-certificate.crt';
      if (fs.existsSync(devCertPath)) {
        return fs.readFileSync(devCertPath).toString();
      }
    }
    
    // If certificate not found, log it and fall back to disabling TLS validation
    console.warn("⚠️ CA Certificate not found, falling back to insecure connection");
    return undefined;
  } catch (error) {
    console.error("❌ Error reading CA certificate:", error);
    return undefined;
  }
}

// Get CA certificate
const caCert = getCACertificate();

// Configure SSL options based on environment and certificate availability
const sslConfig = caCert 
  ? {
      ca: caCert,
      // Still keep rejectUnauthorized true when using a CA cert
      rejectUnauthorized: true
    }
  : {
      // Fall back to this when no cert is available
      rejectUnauthorized: false
    };

// Create connection pool with SSL for DigitalOcean PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Set connection timeout and retry options
  connectionTimeoutMillis: 5000, // 5 second timeout
  max: 10, // Maximum 10 clients in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  ssl: sslConfig
});

// Test database connection on start
pool.connect()
  .then(client => {
    console.log('✅ Successfully connected to DigitalOcean PostgreSQL database');
    console.log(`✅ SSL configuration: ${caCert ? 'Using CA certificate' : 'Certificate validation disabled'}`);
    client.release();
  })
  .catch(err => {
    console.error('❌ Failed to connect to database:', err.message);
    // We don't throw here to allow the app to start, but the error will be logged
  });

// Export drizzle instance with pool
export const db = drizzle(pool, { logger: true });