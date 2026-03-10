const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkStatus() {
  const client = await pool.connect();
  
  try {
    // Total geral
    const totalResult = await client.query('SELECT COUNT(*) FROM asset');
    const total = parseInt(totalResult.rows[0].count);
    
    // Com IPFS
    const withIpfsResult = await client.query('SELECT COUNT(*) FROM asset WHERE ipfs_image_url IS NOT NULL');
    const withIpfs = parseInt(withIpfsResult.rows[0].count);
    
    // Sem IPFS
    const withoutIpfs = total - withIpfs;
    
    // Com metadata_json que é IPFS
    const ipfsMetadataResult = await client.query(`
      SELECT COUNT(*) FROM asset 
      WHERE ipfs_image_url IS NULL 
        AND metadata_json IS NOT NULL 
        AND metadata_json::text LIKE 'ipfs://%'
    `);
    const ipfsMetadata = parseInt(ipfsMetadataResult.rows[0].count);
    
    console.log('\n📊 IPFS Status Report\n');
    console.log(`Total assets: ${total}`);
    console.log(`✅ With IPFS image URL: ${withIpfs} (${(withIpfs/total*100).toFixed(1)}%)`);
    console.log(`❌ Without IPFS image URL: ${withoutIpfs} (${(withoutIpfs/total*100).toFixed(1)}%)`);
    console.log(`📦 Ready to process (have IPFS metadata): ${ipfsMetadata}`);
    
    // Mostrar algumas amostras
    if (ipfsMetadata > 0) {
      const samplesResult = await client.query(`
        SELECT id, title, metadata_json
        FROM asset 
        WHERE ipfs_image_url IS NULL 
          AND metadata_json IS NOT NULL 
          AND metadata_json::text LIKE 'ipfs://%'
        LIMIT 3
      `);
      
      console.log('\n📝 Sample assets ready to process:');
      samplesResult.rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.title}`);
        console.log(`   ID: ${row.id}`);
        console.log(`   IPFS: ${row.metadata_json}`);
      });
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkStatus();