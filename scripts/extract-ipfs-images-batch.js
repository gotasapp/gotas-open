const { Pool } = require('pg');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Gateway IPFS
const IPFS_GATEWAY = 'https://YOUR_THIRDWEB_CLIENT_ID.ipfscdn.io/ipfs/';

// Configurações do batch
const BATCH_SIZE = 10; // Processar 10 assets por vez
const DELAY_BETWEEN_REQUESTS = 500; // 500ms entre requisições IPFS
const CHECKPOINT_FILE = './ipfs-extraction-checkpoint.json';

// Estatísticas
let stats = {
  total: 0,
  processed: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
  startTime: new Date(),
  lastProcessedId: null
};

/**
 * Extrai o hash IPFS de uma URI
 */
function extractIpfsHash(ipfsUri) {
  if (!ipfsUri || !ipfsUri.startsWith('ipfs://')) {
    throw new Error('Invalid IPFS URI');
  }
  return ipfsUri.replace('ipfs://', '');
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Salva checkpoint
 */
async function saveCheckpoint() {
  await fs.writeFile(CHECKPOINT_FILE, JSON.stringify(stats, null, 2));
}

/**
 * Carrega checkpoint
 */
async function loadCheckpoint() {
  try {
    const data = await fs.readFile(CHECKPOINT_FILE, 'utf8');
    const checkpoint = JSON.parse(data);
    console.log('Checkpoint loaded:', checkpoint);
    return checkpoint.lastProcessedId;
  } catch (e) {
    console.log('No checkpoint found, starting from beginning');
    return null;
  }
}

/**
 * Busca metadata do IPFS com retry
 */
async function fetchIpfsMetadata(ipfsUri, retries = 3) {
  const hash = extractIpfsHash(ipfsUri);
  const url = IPFS_GATEWAY + hash;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { timeout: 30000 }); // 30s timeout
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for ${url}:`, error.message);
      if (i < retries - 1) {
        await delay(1000 * (i + 1)); // Progressive delay
      } else {
        throw error;
      }
    }
  }
}

/**
 * Processa um único asset
 */
async function processAsset(asset, client) {
  try {
    console.log(`\nProcessing: ${asset.id} - ${asset.title}`);
    
    // Parse metadata_json
    if (!asset.metadata_json) {
      console.log('  → No metadata_json, skipping');
      stats.skipped++;
      return;
    }
    
    let ipfsUri;
    
    // Verificar se metadata_json é diretamente um IPFS URI (string)
    if (typeof asset.metadata_json === 'string' && asset.metadata_json.startsWith('ipfs://')) {
      ipfsUri = asset.metadata_json;
      console.log('  → metadata_json is IPFS URI:', ipfsUri);
    } else {
      // Tentar fazer parse como JSON
      let metadata;
      try {
        metadata = typeof asset.metadata_json === 'string' 
          ? JSON.parse(asset.metadata_json) 
          : asset.metadata_json;
        
        // Verificar se tem IPFS URI no objeto
        ipfsUri = metadata.ipfs_uri || metadata.metadata_uri || 
                 (metadata.image && metadata.image.startsWith('ipfs://') ? metadata.image : null);
      } catch (e) {
        console.error('  → Failed to parse metadata_json');
        stats.errors++;
        return;
      }
    }
    
    if (!ipfsUri) {
      console.log('  → No IPFS URI found');
      stats.skipped++;
      return;
    }
    
    // Se já identificamos que o metadata_json é diretamente um IPFS URI, não verificar metadata.image
    
    // Buscar metadata do IPFS
    console.log(`  → Fetching from IPFS: ${ipfsUri}`);
    await delay(DELAY_BETWEEN_REQUESTS);
    
    const ipfsMetadata = await fetchIpfsMetadata(ipfsUri);
    
    if (!ipfsMetadata.image || !ipfsMetadata.image.startsWith('ipfs://')) {
      console.log(`  → No valid IPFS image in metadata`);
      stats.skipped++;
      return;
    }
    
    // Atualizar banco
    await client.query(
      'UPDATE asset SET ipfs_image_url = $1 WHERE id = $2',
      [ipfsMetadata.image, asset.id]
    );
    
    console.log(`  ✅ Updated with IPFS image: ${ipfsMetadata.image}`);
    stats.updated++;
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    stats.errors++;
    
    // Log erro detalhado
    await client.query(
      `INSERT INTO asset_ipfs_errors (asset_id, error_message, created_at) 
       VALUES ($1, $2, NOW())
       ON CONFLICT (asset_id) DO UPDATE SET 
       error_message = $2, created_at = NOW()`,
      [asset.id, error.message]
    ).catch(() => {}); // Ignora se tabela não existe
  }
}

/**
 * Processa assets em batch
 */
async function processBatch() {
  const client = await pool.connect();
  
  try {
    // Criar tabela de erros se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_ipfs_errors (
        asset_id UUID PRIMARY KEY,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `).catch(() => {});
    
    // Carregar checkpoint
    const lastProcessedId = await loadCheckpoint();
    
    // Contar total
    const countResult = await client.query(
      'SELECT COUNT(*) FROM asset WHERE ipfs_image_url IS NULL'
    );
    stats.total = parseInt(countResult.rows[0].count);
    console.log(`\nTotal assets to process: ${stats.total}`);
    
    // Query base
    let query = `
      SELECT id, title, metadata_json, image_url
      FROM asset 
      WHERE ipfs_image_url IS NULL
    `;
    let params = [];
    
    if (lastProcessedId) {
      query += ' AND id > $1';
      params.push(lastProcessedId);
    }
    
    query += ' ORDER BY id LIMIT $' + (params.length + 1);
    params.push(BATCH_SIZE);
    
    // Loop principal
    while (true) {
      const result = await client.query(query, params);
      
      if (result.rows.length === 0) {
        console.log('\nNo more assets to process!');
        break;
      }
      
      console.log(`\n=== Processing batch of ${result.rows.length} assets ===`);
      
      for (const asset of result.rows) {
        await processAsset(asset, client);
        stats.processed++;
        stats.lastProcessedId = asset.id;
        
        // Salvar checkpoint a cada 10 processados
        if (stats.processed % 10 === 0) {
          await saveCheckpoint();
        }
      }
      
      // Atualizar params para próximo batch
      if (params.length > 1) {
        params[0] = stats.lastProcessedId;
      } else {
        query = `
          SELECT id, title, metadata_json, image_url
          FROM asset 
          WHERE ipfs_image_url IS NULL
            AND id > $1
          ORDER BY id LIMIT $2
        `;
        params = [stats.lastProcessedId, BATCH_SIZE];
      }
      
      // Mostrar progresso
      const elapsed = (new Date() - stats.startTime) / 1000;
      const rate = stats.processed / elapsed;
      const remaining = (stats.total - stats.processed) / rate;
      
      console.log(`\nProgress: ${stats.processed}/${stats.total} (${(stats.processed/stats.total*100).toFixed(1)}%)`);
      console.log(`Updated: ${stats.updated}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`);
      console.log(`Rate: ${rate.toFixed(1)} assets/sec, ETA: ${(remaining/60).toFixed(1)} minutes`);
      
      // Delay entre batches
      await delay(1000);
    }
    
  } finally {
    client.release();
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('=== IPFS Image Extraction Batch Process ===');
  console.log(`Gateway: ${IPFS_GATEWAY}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Delay between requests: ${DELAY_BETWEEN_REQUESTS}ms`);
  
  try {
    await processBatch();
    
    // Salvar estatísticas finais
    await saveCheckpoint();
    
    console.log('\n=== Final Statistics ===');
    console.log(`Total processed: ${stats.processed}`);
    console.log(`Successfully updated: ${stats.updated}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Time elapsed: ${((new Date() - stats.startTime) / 1000 / 60).toFixed(1)} minutes`);
    
    // Limpar checkpoint se completou
    if (stats.processed === stats.total) {
      await fs.unlink(CHECKPOINT_FILE).catch(() => {});
      console.log('\nCheckpoint file removed (process completed)');
    }
    
  } catch (error) {
    console.error('\nFatal error:', error);
    await saveCheckpoint();
    console.log('Checkpoint saved. You can resume by running the script again.');
  } finally {
    await pool.end();
  }
}

// Executar
main();