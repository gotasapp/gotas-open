const { Pool } = require('pg');
const fetch = require('node-fetch');
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

/**
 * Extrai o hash IPFS de uma URI
 * @param {string} ipfsUri - URI no formato ipfs://QmXXX...
 * @returns {string} - Hash IPFS
 */
function extractIpfsHash(ipfsUri) {
  if (!ipfsUri || !ipfsUri.startsWith('ipfs://')) {
    throw new Error('Invalid IPFS URI');
  }
  return ipfsUri.replace('ipfs://', '');
}

/**
 * Busca metadata do IPFS usando o gateway
 * @param {string} ipfsUri - URI IPFS do metadata
 * @returns {Object} - Metadata JSON
 */
async function fetchIpfsMetadata(ipfsUri) {
  const hash = extractIpfsHash(ipfsUri);
  const url = IPFS_GATEWAY + hash;
  
  console.log(`Fetching metadata from: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch IPFS metadata: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Processa um único asset para extrair IPFS image URL
 * @param {string} assetId - ID do asset para processar
 */
async function processSingleAsset(assetId) {
  let client;
  
  try {
    client = await pool.connect();
    
    // Buscar asset
    console.log(`\n=== Processing Asset ID: ${assetId} ===`);
    const assetResult = await client.query(
      'SELECT id, title, metadata_json, image_url, ipfs_image_url FROM asset WHERE id = $1',
      [assetId]
    );
    
    if (assetResult.rows.length === 0) {
      console.error(`Asset not found: ${assetId}`);
      return;
    }
    
    const asset = assetResult.rows[0];
    console.log(`Asset found: ${asset.title}`);
    console.log(`Current image_url: ${asset.image_url}`);
    console.log(`Current ipfs_image_url: ${asset.ipfs_image_url || 'NULL'}`);
    
    // Verificar se já tem ipfs_image_url
    if (asset.ipfs_image_url) {
      console.log('Asset already has ipfs_image_url, skipping...');
      return;
    }
    
    // Parse metadata_json
    if (!asset.metadata_json) {
      console.log('No metadata_json found');
      return;
    }
    
    let ipfsUri;
    
    // Verificar se metadata_json é diretamente um IPFS URI (string)
    if (typeof asset.metadata_json === 'string' && asset.metadata_json.startsWith('ipfs://')) {
      ipfsUri = asset.metadata_json;
      console.log('\nmetadata_json is directly an IPFS URI:', ipfsUri);
    } else {
      // Tentar fazer parse como JSON
      let metadata;
      try {
        metadata = typeof asset.metadata_json === 'string' 
          ? JSON.parse(asset.metadata_json) 
          : asset.metadata_json;
        
        console.log('\nParsed metadata_json:', JSON.stringify(metadata, null, 2));
        
        // Verificar se tem IPFS URI no objeto
        ipfsUri = metadata.ipfs_uri || metadata.metadata_uri || 
                 (metadata.image && metadata.image.startsWith('ipfs://') ? metadata.image : null);
      } catch (e) {
        console.error('Failed to parse metadata_json as JSON and it\'s not an IPFS URI');
        return;
      }
    }
    
    if (!ipfsUri) {
      console.log('No IPFS URI found');
      return;
    }
    
    console.log(`\nFound IPFS URI: ${ipfsUri}`);
    
    // Caso contrário, buscar metadata do IPFS
    console.log('\nFetching metadata from IPFS...');
    const ipfsMetadata = await fetchIpfsMetadata(ipfsUri);
    console.log('IPFS Metadata:', JSON.stringify(ipfsMetadata, null, 2));
    
    // Extrair image URL do metadata IPFS
    if (!ipfsMetadata.image) {
      console.log('No image field found in IPFS metadata');
      return;
    }
    
    if (!ipfsMetadata.image.startsWith('ipfs://')) {
      console.log(`Image URL is not IPFS: ${ipfsMetadata.image}`);
      return;
    }
    
    // Atualizar banco de dados
    await client.query(
      'UPDATE asset SET ipfs_image_url = $1 WHERE id = $2',
      [ipfsMetadata.image, assetId]
    );
    
    console.log(`✅ Updated asset ${assetId} with IPFS image URL: ${ipfsMetadata.image}`);
    
  } catch (error) {
    console.error('Error processing asset:', error);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Função principal
async function main() {
  const assetId = process.argv[2];
  
  if (!assetId) {
    console.error('Usage: node extract-ipfs-image-test.js <asset-id>');
    console.error('Example: node extract-ipfs-image-test.js 123e4567-e89b-12d3-a456-426614174000');
    process.exit(1);
  }
  
  try {
    await processSingleAsset(assetId);
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await pool.end();
  }
}

// Executar
main();