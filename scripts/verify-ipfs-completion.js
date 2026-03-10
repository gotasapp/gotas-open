#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1
});

async function verifyCompletion() {
  console.log('🔍 Verificando completude da extração IPFS...\n');
  
  try {
    // 1. Total de assets com metadata_json
    const totalWithMetadata = await pool.query(`
      SELECT COUNT(*) as total 
      FROM asset 
      WHERE metadata_json IS NOT NULL 
      AND metadata_json != ''
    `);
    
    // 2. Total de assets com ipfs_image_url preenchido
    const totalWithIpfsUrl = await pool.query(`
      SELECT COUNT(*) as total 
      FROM asset 
      WHERE metadata_json IS NOT NULL 
      AND metadata_json != ''
      AND ipfs_image_url IS NOT NULL
      AND ipfs_image_url != ''
    `);
    
    // 3. Total de assets ainda pendentes
    const totalPending = await pool.query(`
      SELECT COUNT(*) as total 
      FROM asset 
      WHERE metadata_json IS NOT NULL 
      AND metadata_json != ''
      AND (ipfs_image_url IS NULL OR ipfs_image_url = '')
    `);
    
    // 4. Amostras de assets com ipfs_image_url preenchido
    const sampleCompleted = await pool.query(`
      SELECT id, title, metadata_json, ipfs_image_url
      FROM asset 
      WHERE metadata_json IS NOT NULL 
      AND metadata_json != ''
      AND ipfs_image_url IS NOT NULL
      AND ipfs_image_url != ''
      LIMIT 5
    `);
    
    // 5. Amostras de assets ainda pendentes (se houver)
    const samplePending = await pool.query(`
      SELECT id, title, metadata_json, ipfs_image_url
      FROM asset 
      WHERE metadata_json IS NOT NULL 
      AND metadata_json != ''
      AND (ipfs_image_url IS NULL OR ipfs_image_url = '')
      LIMIT 5
    `);
    
    console.log('📊 RESULTADOS DA VERIFICAÇÃO:\n');
    console.log(`✅ Total de assets com metadata: ${totalWithMetadata.rows[0].total}`);
    console.log(`✅ Total com IPFS URL extraída: ${totalWithIpfsUrl.rows[0].total}`);
    console.log(`⏳ Total ainda pendentes: ${totalPending.rows[0].total}`);
    
    const completionRate = ((totalWithIpfsUrl.rows[0].total / totalWithMetadata.rows[0].total) * 100).toFixed(2);
    console.log(`📈 Taxa de conclusão: ${completionRate}%\n`);
    
    if (sampleCompleted.rows.length > 0) {
      console.log('🎯 AMOSTRAS DE ASSETS PROCESSADAS:');
      for (const row of sampleCompleted.rows) {
        console.log(`\n🆔 ID: ${row.id}`);
        console.log(`📝 Título: ${row.title}`);
        console.log(`🔗 Metadata: ${row.metadata_json}`);
        console.log(`🖼️  IPFS URL: ${row.ipfs_image_url}`);
      }
    }
    
    if (samplePending.rows.length > 0) {
      console.log('\n⏳ AMOSTRAS DE ASSETS PENDENTES:');
      for (const row of samplePending.rows) {
        console.log(`\n🆔 ID: ${row.id}`);
        console.log(`📝 Título: ${row.title}`);
        console.log(`🔗 Metadata: ${row.metadata_json}`);
        console.log(`🖼️  IPFS URL: ${row.ipfs_image_url || 'NULL'}`);
      }
    }
    
    // 6. Verificar se há URLs inválidas
    const invalidUrls = await pool.query(`
      SELECT COUNT(*) as total 
      FROM asset 
      WHERE ipfs_image_url IS NOT NULL 
      AND ipfs_image_url != ''
      AND ipfs_image_url NOT LIKE 'ipfs://%'
    `);
    
    console.log(`\n🔍 URLs inválidas (não começam com ipfs://): ${invalidUrls.rows[0].total}`);
    
    if (invalidUrls.rows[0].total > 0) {
      const invalidSamples = await pool.query(`
        SELECT id, title, ipfs_image_url
        FROM asset 
        WHERE ipfs_image_url IS NOT NULL 
        AND ipfs_image_url != ''
        AND ipfs_image_url NOT LIKE 'ipfs://%'
        LIMIT 3
      `);
      
      console.log('\n❌ AMOSTRAS DE URLs INVÁLIDAS:');
      for (const row of invalidSamples.rows) {
        console.log(`🆔 ${row.id}: ${row.ipfs_image_url}`);
      }
    }
    
    // 7. Status final
    console.log('\n' + '='.repeat(50));
    if (totalPending.rows[0].total === 0) {
      console.log('🎉 EXTRAÇÃO IPFS COMPLETA!');
      console.log('✅ Todas as assets foram processadas com sucesso!');
    } else {
      console.log('⚠️  EXTRAÇÃO IPFS INCOMPLETA');
      console.log(`❌ ${totalPending.rows[0].total} assets ainda precisam ser processadas`);
    }
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  } finally {
    await pool.end();
  }
}

verifyCompletion().catch(console.error);