#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1
});

async function debug() {
  console.log('🔍 Debugging IPFS extraction...');
  
  try {
    // Testar amostra
    const result = await pool.query(`
      SELECT id, metadata_json, title
      FROM asset 
      WHERE metadata_json IS NOT NULL 
      AND metadata_json != '' 
      AND ipfs_image_url IS NULL
      LIMIT 3
    `);
    
    console.log('\n📊 Amostras encontradas:');
    for (const row of result.rows) {
      console.log(`\n🆔 ID: ${row.id}`);
      console.log(`📝 Title: ${row.title}`);
      console.log(`🔗 Metadata JSON: ${row.metadata_json}`);
      
      // Testar requisição IPFS
      const GATEWAY_URL = 'https://YOUR_THIRDWEB_CLIENT_ID.ipfscdn.io/ipfs/';
      const cleanUri = row.metadata_json.replace('ipfs://', '');
      const testUrl = `${GATEWAY_URL}${cleanUri}`;
      console.log(`🌐 Test URL: ${testUrl}`);
      
      try {
        const response = await fetch(testUrl, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log(`📡 Status: ${response.status}`);
        
        if (response.ok) {
          const metadata = await response.json();
          console.log(`🎯 Metadata:`, JSON.stringify(metadata, null, 2));
        } else {
          console.log(`❌ Error: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Fetch error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await pool.end();
  }
}

debug().catch(console.error);