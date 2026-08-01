import pg from 'pg';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/language_learning';
  
  console.log('Connecting to database...');
  const pool = new Pool({ connectionString });

  try {
    // Test connection first
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    const migrationSQL = await readFile(
      join(__dirname, 'migrations', '002_add_language_pair_support.sql'),
      'utf-8'
    );

    console.log('Running migration: 002_add_language_pair_support.sql');
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  PostgreSQL server is not running. Please start PostgreSQL first.');
      console.error('   You can start it from pgAdmin or Services (services.msc)');
    }
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
