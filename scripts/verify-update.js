const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function verify() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        id, 
        title,
        image_url,
        ipfs_image_url,
        metadata_json
      FROM asset 
      WHERE id = '00021e10-2b89-4b41-924d-90b8b8ff43cd'
    `);
    
    if (result.rows.length > 0) {
      const asset = result.rows[0];
      console.log('✅ Asset Updated Successfully!\n');
      console.log('ID:', asset.id);
      console.log('Title:', asset.title);
      console.log('\nOriginal S3 URL:');
      console.log(asset.image_url);
      console.log('\n🎯 NEW IPFS Image URL:');
      console.log(asset.ipfs_image_url);
      console.log('\nMetadata JSON (IPFS):');
      console.log(asset.metadata_json);
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

verify();