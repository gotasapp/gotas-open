#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs').promises;

// Configurações otimizadas para velocidade
const BATCH_SIZE = 100; // Processar 100 assets por vez
const CONCURRENT_REQUESTS = 20; // 20 requisições simultâneas
const REQUEST_TIMEOUT = 5000; // 5 segundos timeout
const GATEWAY_URL = 'https://YOUR_THIRDWEB_CLIENT_ID.ipfscdn.io/ipfs/';
const CHECKPOINT_FILE = './ipfs-extraction-checkpoint.json';

// Pool de conexões
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5 // Mais conexões para paralelismo
});

// Função para buscar metadata do IPFS com timeout
async function fetchIPFSMetadata(ipfsUri) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  // Remover ipfs:// se já estiver presente
  const cleanUri = ipfsUri.replace('ipfs://', '');
  
  try {
    const response = await fetch(`${GATEWAY_URL}${cleanUri}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const metadata = await response.json();
    return metadata;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Função para processar um asset
async function processAsset(asset) {
  try {
    const metadata = await fetchIPFSMetadata(asset.metadata_json);
    
    if (metadata && metadata.image) {
      // Extrair URL IPFS da imagem
      const imageUrl = metadata.image.startsWith('ipfs://') 
        ? metadata.image 
        : `ipfs://${metadata.image}`;
      
      // Atualizar no banco
      await pool.query(
        'UPDATE asset SET ipfs_image_url = $1 WHERE id = $2',
        [imageUrl, asset.id]
      );
      
      return { success: true, asset, imageUrl };
    } else {
      return { success: false, asset, error: 'No image in metadata' };
    }
  } catch (error) {
    return { success: false, asset, error: error.message };
  }
}

// Função para processar lote em paralelo
async function processBatch(assets) {
  const results = await Promise.allSettled(
    assets.map(asset => processAsset(asset))
  );
  
  const successes = [];
  const errors = [];
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        successes.push(result.value);
      } else {
        errors.push(result.value);
      }
    } else {
      errors.push({ error: result.reason.message });
    }
  }
  
  return { successes, errors };
}

// Função para salvar checkpoint
async function saveCheckpoint(checkpoint) {
  await fs.writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

// Função para ler checkpoint
async function readCheckpoint() {
  try {
    const data = await fs.readFile(CHECKPOINT_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

// Função principal
async function main() {
  console.log('🚀 IPFS Parallel Extraction - Ultra Fast Mode');
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log(`🔄 Concurrent requests: ${CONCURRENT_REQUESTS}`);
  console.log(`⏱️  Request timeout: ${REQUEST_TIMEOUT}ms`);
  console.log('');
  
  let checkpoint = await readCheckpoint();
  let processed = 0;
  let updated = 0;
  let errors = 0;
  let startTime = Date.now();
  
  if (checkpoint) {
    processed = checkpoint.processed || 0;
    updated = checkpoint.updated || 0;
    errors = checkpoint.errors || 0;
    console.log(`📄 Checkpoint carregado: ${processed} processados`);
  }
  
  try {
    // Buscar total de assets que precisam ser processadas
    const totalQuery = await pool.query(`
      SELECT COUNT(*) as total 
      FROM asset 
      WHERE metadata_json IS NOT NULL 
      AND metadata_json != '' 
      AND (ipfs_image_url IS NULL OR ipfs_image_url = '')
    `);
    
    const total = parseInt(totalQuery.rows[0].total);
    
    if (total === 0) {
      console.log('✅ Todas as assets já foram processadas!');
      return;
    }
    
    console.log(`📊 Total a processar: ${total} assets`);
    
    let offset = 0;
    let lastProcessedId = checkpoint?.lastProcessedId || null;
    
    // Se há checkpoint, buscar offset
    if (lastProcessedId) {
      const offsetQuery = await pool.query(`
        SELECT COUNT(*) as offset 
        FROM asset 
        WHERE metadata_json IS NOT NULL 
        AND metadata_json != '' 
        AND (ipfs_image_url IS NULL OR ipfs_image_url = '')
        AND id <= $1
      `, [lastProcessedId]);
      
      offset = parseInt(offsetQuery.rows[0].offset);
    }
    
    while (true) {
      // Buscar próximo lote
      const query = `
        SELECT id, metadata_json, title
        FROM asset 
        WHERE metadata_json IS NOT NULL 
        AND metadata_json != '' 
        AND (ipfs_image_url IS NULL OR ipfs_image_url = '')
        ORDER BY id
        LIMIT $1 OFFSET $2
      `;
      
      const result = await pool.query(query, [BATCH_SIZE, offset]);
      
      if (result.rows.length === 0) {
        console.log('\n🎉 Todas as assets foram processadas!');
        break;
      }
      
      console.log(`\n=== Processando lote ${Math.floor(offset / BATCH_SIZE) + 1} ===`);
      console.log(`Assets: ${result.rows.length}`);
      
      // Dividir em chunks menores para paralelismo
      const chunks = [];
      for (let i = 0; i < result.rows.length; i += CONCURRENT_REQUESTS) {
        chunks.push(result.rows.slice(i, i + CONCURRENT_REQUESTS));
      }
      
      for (const chunk of chunks) {
        const batchResult = await processBatch(chunk);
        
        processed += chunk.length;
        updated += batchResult.successes.length;
        errors += batchResult.errors.length;
        
        // Mostrar progresso
        const progress = ((processed / total) * 100).toFixed(1);
        const rate = processed / ((Date.now() - startTime) / 1000);
        const eta = Math.round((total - processed) / rate / 60);
        
        console.log(`✅ ${batchResult.successes.length}/${chunk.length} sucesso`);
        console.log(`📊 Progresso: ${processed}/${total} (${progress}%)`);
        console.log(`⚡ Taxa: ${rate.toFixed(1)} assets/seg`);
        console.log(`⏱️  ETA: ${eta} minutos`);
        
        // Salvar checkpoint
        const newCheckpoint = {
          total,
          processed,
          updated,
          errors,
          startTime: checkpoint?.startTime || new Date().toISOString(),
          lastProcessedId: chunk[chunk.length - 1].id
        };
        
        await saveCheckpoint(newCheckpoint);
        
        // Delay mínimo entre chunks
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      offset += BATCH_SIZE;
    }
    
    console.log('\n🎉 EXTRAÇÃO COMPLETA!');
    console.log(`✅ Total processadas: ${processed}`);
    console.log(`✅ Total atualizadas: ${updated}`);
    console.log(`❌ Total erros: ${errors}`);
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`⏱️  Tempo total: ${Math.round(totalTime)} segundos`);
    console.log(`⚡ Taxa final: ${(processed / totalTime).toFixed(1)} assets/seg`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar
main().catch(console.error);