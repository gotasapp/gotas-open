const { Pool } = require('pg');
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
    console.log('Running migration to add ipfs_image_url column...');
    
    // Add the new column
    await client.query(`
      ALTER TABLE asset 
      ADD COLUMN IF NOT EXISTS ipfs_image_url TEXT
    `);
    console.log('✓ Added ipfs_image_url column');
    
    // Add index for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_asset_ipfs_image_url_null 
      ON asset (id) 
      WHERE ipfs_image_url IS NULL
    `);
    console.log('✓ Created index for NULL ipfs_image_url');
    
    // Add comment
    await client.query(`
      COMMENT ON COLUMN asset.ipfs_image_url IS 'IPFS URL of the NFT image extracted from metadata stored in IPFS. Format: ipfs://QmXXX.../image.png'
    `);
    console.log('✓ Added column comment');
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();