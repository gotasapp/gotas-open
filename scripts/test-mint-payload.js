const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testMintPayload() {
  const client = await pool.connect();
  
  try {
    const assetId = '00021e10-2b89-4b41-924d-90b8b8ff43cd';
    
    // Simular busca do asset como no claim-asset
    const assetResult = await client.query(
      'SELECT id, title, description, image_url, ipfs_image_url, rarity, metadata_json FROM asset WHERE id = $1 LIMIT 1',
      [assetId]
    );
    
    if (assetResult.rows.length === 0) {
      console.error('Asset not found');
      return;
    }
    
    const asset = assetResult.rows[0];
    console.log('🎯 Asset Data:');
    console.log('- Title:', asset.title);
    console.log('- S3 Image:', asset.image_url?.substring(0, 60) + '...');
    console.log('- IPFS Image:', asset.ipfs_image_url);
    console.log('- Metadata JSON:', asset.metadata_json);
    
    // Simular construção do payload como no código atual
    console.log('\n📦 Mint Payload (Fallback logic):');
    const fallbackPayload = {
      receiver: '0x1234...test',
      tokenId: assetId,
      metadata: {
        name: asset.title || `Asset #${assetId}`,
        description: asset.description || `NFT Asset ID ${assetId}`,
        image: asset.ipfs_image_url || asset.image_url || '',
        attributes: [
          {
            trait_type: 'Asset ID',
            value: assetId
          },
          {
            trait_type: 'Rarity',
            value: asset.rarity || 'Common'
          }
        ]
      }
    };
    
    console.log(JSON.stringify(fallbackPayload, null, 2));
    
    console.log('\n✅ Image being used:', fallbackPayload.metadata.image);
    console.log('Is IPFS?', fallbackPayload.metadata.image.startsWith('ipfs://') ? 'YES ✅' : 'NO ❌');
    
  } finally {
    client.release();
    await pool.end();
  }
}

testMintPayload();