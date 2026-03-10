const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function findAsset() {
  const client = await pool.connect();
  
  try {
    // Buscar um asset que tenha metadata_json com possível IPFS
    const result = await client.query(`
      SELECT 
        id, 
        title, 
        metadata_json,
        image_url,
        ipfs_image_url
      FROM asset 
      WHERE metadata_json IS NOT NULL
        AND ipfs_image_url IS NULL
        AND (
          metadata_json::text LIKE '%ipfs_uri%' OR
          metadata_json::text LIKE '%metadata_uri%' OR 
          metadata_json::text LIKE '%ipfs://%'
        )
      LIMIT 5
    `);
    
    console.log(`Found ${result.rows.length} assets with potential IPFS metadata:\n`);
    
    for (const asset of result.rows) {
      console.log(`ID: ${asset.id}`);
      console.log(`Title: ${asset.title}`);
      console.log(`Current image_url: ${asset.image_url?.substring(0, 60)}...`);
      
      try {
        const metadata = JSON.parse(asset.metadata_json);
        console.log(`Metadata keys: ${Object.keys(metadata).join(', ')}`);
        
        if (metadata.ipfs_uri) console.log(`  → ipfs_uri: ${metadata.ipfs_uri}`);
        if (metadata.metadata_uri) console.log(`  → metadata_uri: ${metadata.metadata_uri}`);
        if (metadata.image && metadata.image.includes('ipfs')) console.log(`  → image: ${metadata.image}`);
      } catch (e) {
        console.log('  → Failed to parse metadata');
      }
      
      console.log('---\n');
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

findAsset();