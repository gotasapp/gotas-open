const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkMetadata() {
  const client = await pool.connect();
  
  try {
    // Pegar um asset específico e ver o formato do metadata_json
    const result = await client.query(`
      SELECT 
        id, 
        title,
        metadata_json,
        image_url
      FROM asset 
      WHERE id = '00021e10-2b89-4b41-924d-90b8b8ff43cd'
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const asset = result.rows[0];
      console.log('Asset ID:', asset.id);
      console.log('Title:', asset.title);
      console.log('\nRaw metadata_json:');
      console.log(asset.metadata_json);
      console.log('\nType of metadata_json:', typeof asset.metadata_json);
      
      // Verificar se já é um objeto ou string
      if (typeof asset.metadata_json === 'object' && asset.metadata_json !== null) {
        console.log('\nmetadata_json is already an object:');
        console.log(JSON.stringify(asset.metadata_json, null, 2));
      }
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkMetadata();