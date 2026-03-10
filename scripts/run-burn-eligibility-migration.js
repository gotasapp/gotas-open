const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Running burn eligibility migration...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', 'add_burn_minimum_token_requirement.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration executed successfully!\n');

    // Verify the setting was added
    const result = await client.query(`
      SELECT setting_key, setting_value, setting_type, description
      FROM burn_global_settings
      WHERE setting_key = 'minimum_fantoken_balance'
    `);

    if (result.rows.length > 0) {
      console.log('✓ Verified minimum_fantoken_balance setting:');
      console.log('  Key:', result.rows[0].setting_key);
      console.log('  Value:', result.rows[0].setting_value);
      console.log('  Type:', result.rows[0].setting_type);
      console.log('  Description:', result.rows[0].description);
    } else {
      console.log('⚠️  Warning: Could not verify setting was added');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
