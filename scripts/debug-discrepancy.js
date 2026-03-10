#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1
});

async function debugDiscrepancy() {
  console.log('🔍 Investigando discrepância nos números...\n');
  
  try {
    // Query exata do script paralelo
    const scriptQuery = await pool.query(`
      SELECT COUNT(*) as total 
      FROM asset 
      WHERE metadata_json IS NOT NULL 
      AND metadata_json != '' 
      AND ipfs_image_url IS NULL
    `);
    
    // Query da verificação
    const verifyQuery = await pool.query(`
      SELECT COUNT(*) as total 
      FROM asset 
      WHERE metadata_json IS NOT NULL 
      AND metadata_json != ''
      AND (ipfs_image_url IS NULL OR ipfs_image_url = '')
    `);
    
    console.log('📊 Comparação de consultas:');
    console.log(`Script paralelo (ipfs_image_url IS NULL): ${scriptQuery.rows[0].total}`);
    console.log(`Verificação (IS NULL OR = ''): ${verifyQuery.rows[0].total}`);
    
    // Verificar se há strings vazias
    const emptyStrings = await pool.query(`
      SELECT COUNT(*) as total 
      FROM asset 
      WHERE metadata_json IS NOT NULL 
      AND metadata_json != ''
      AND ipfs_image_url = ''
    `);
    
    console.log(`Strings vazias: ${emptyStrings.rows[0].total}\n`);
    
    // Amostras de strings vazias
    if (emptyStrings.rows[0].total > 0) {
      const samples = await pool.query(`
        SELECT id, title, ipfs_image_url
        FROM asset 
        WHERE metadata_json IS NOT NULL 
        AND metadata_json != ''
        AND ipfs_image_url = ''
        LIMIT 5
      `);
      
      console.log('🔍 Amostras de strings vazias:');
      for (const row of samples.rows) {
        console.log(`🆔 ${row.id}: "${row.ipfs_image_url}"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

debugDiscrepancy().catch(console.error);