require('dotenv').config({ path: '.env.local' });

// Disable TLS certificate validation for development if needed
if (process.env.DISABLE_SSL_VALIDATION === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { Pool } = require('pg');

// Create connection pool with SSL for PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: process.env.DISABLE_SSL_VALIDATION !== 'true'
  }
});

async function migrateFreelancerName() {
  let client;
  
  try {
    console.log('Connecting to PostgreSQL database...');
    console.log(`Using connection string: ${process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@')}`);
    
    client = await pool.connect();
    
    console.log('Connected successfully. Starting migration...');
    
    // Check if the 'freelancer' table exists
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'freelancer'
      );
    `);
    
    if (!tableCheckResult.rows[0].exists) {
      console.log("Freelancer table doesn't exist yet. Migration not needed.");
      return;
    }
    
    // Check if the freelancer table has a 'freelancer_name' column
    const columnCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'freelancer' 
        AND column_name = 'freelancer_name'
      );
    `);
    
    const hasFreelancerNameColumn = columnCheckResult.rows[0].exists;
    
    // Also check if it has a 'name' column
    const nameColumnCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'freelancer' 
        AND column_name = 'name'
      );
    `);
    
    const hasNameColumn = nameColumnCheckResult.rows[0].exists;
    
    if (hasFreelancerNameColumn && !hasNameColumn) {
      // We need to rename 'freelancer_name' to 'name'
      console.log("Renaming 'freelancer_name' column to 'name'...");
      
      // Start a transaction for the migration
      await client.query('BEGIN');
      
      // Rename the column
      await client.query(`
        ALTER TABLE freelancer 
        RENAME COLUMN freelancer_name TO name;
      `);
      
      // Commit the transaction
      await client.query('COMMIT');
      
      console.log("Column renamed successfully.");
    } else if (!hasFreelancerNameColumn && !hasNameColumn) {
      // Neither column exists, we need to add 'name'
      console.log("Adding 'name' column to freelancer table...");
      
      // Start a transaction for the migration
      await client.query('BEGIN');
      
      // Add the column
      await client.query(`
        ALTER TABLE freelancer 
        ADD COLUMN name TEXT NOT NULL DEFAULT '';
      `);
      
      // Commit the transaction
      await client.query('COMMIT');
      
      console.log("Column added successfully.");
    } else if (hasFreelancerNameColumn && hasNameColumn) {
      // Both columns exist, we need to migrate data from freelancer_name to name and drop freelancer_name
      console.log("Both 'freelancer_name' and 'name' columns exist. Migrating data...");
      
      // Start a transaction for the migration
      await client.query('BEGIN');
      
      // Copy data from freelancer_name to name for any rows where name is empty
      await client.query(`
        UPDATE freelancer 
        SET name = freelancer_name 
        WHERE name = '' OR name IS NULL;
      `);
      
      // Drop the freelancer_name column
      await client.query(`
        ALTER TABLE freelancer 
        DROP COLUMN freelancer_name;
      `);
      
      // Commit the transaction
      await client.query('COMMIT');
      
      console.log("Data migrated and 'freelancer_name' column dropped successfully.");
    } else {
      // Only 'name' column exists, no migration needed
      console.log("Freelancer table already has 'name' column. No migration needed.");
    }
    
    console.log('Migration completed successfully!');
    
  } catch (err) {
    console.error('Error during migration:', err);
    
    // If we have a client and a transaction is in progress, try to roll it back
    if (client) {
      try {
        await client.query('ROLLBACK');
        console.log('Transaction rolled back due to error.');
      } catch (rollbackErr) {
        console.error('Error rolling back transaction:', rollbackErr);
      }
    }
    
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

migrateFreelancerName(); 