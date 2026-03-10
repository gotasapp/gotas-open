const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.envoff') });

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function generateFinalSummaryComum() {
  try {
    console.log('📊 Gerando resumo final dos assets do Flamengo (Comum)...\n');

    // Buscar todos os assets do NFT ID 1
    const query = `
      SELECT 
        id,
        title,
        description,
        image_url,
        asset_data,
        metadata_json,
        created_at
      FROM asset 
      WHERE nft_id = 1 
      ORDER BY (asset_data->>'number')::int ASC
    `;

    const result = await pool.query(query);
    const assets = result.rows;

    console.log(`✅ Total de assets encontrados: ${assets.length}\n`);

    // Organizar por posição
    const assetsByPosition = {};
    assets.forEach(asset => {
      const assetData = asset.asset_data;
      const position = assetData.position;
      
      if (!assetsByPosition[position]) {
        assetsByPosition[position] = [];
      }
      
      assetsByPosition[position].push({
        id: asset.id,
        title: asset.title,
        player_name: assetData.player_name,
        number: assetData.number,
        image_url: asset.image_url,
        created_at: asset.created_at
      });
    });

    // Exibir resumo por posição
    console.log('📋 RESUMO POR POSIÇÃO (COMUM):\n');
    Object.keys(assetsByPosition).sort().forEach(position => {
      console.log(`🔹 ${position.toUpperCase()}:`);
      assetsByPosition[position].forEach(player => {
        console.log(`   • ${player.player_name} (#${player.number}) - ID: ${player.id}`);
      });
      console.log('');
    });

    // Criar resumo completo
    const finalSummary = {
      generated_at: new Date().toISOString(),
      nft_id: 1,
      nft_name: "Mengo Especial",
      total_assets: assets.length,
      team: "Flamengo",
      category: "player_cards",
      rarity: "common",
      season: "2024/2025",
      collection: "Mengo Especial",
      assets_by_position: assetsByPosition,
      all_assets: assets.map(asset => ({
        id: asset.id,
        title: asset.title,
        description: asset.description,
        image_url: asset.image_url,
        player_data: asset.asset_data,
        metadata: asset.metadata_json,
        created_at: asset.created_at
      })),
      s3_bucket: process.env.STORAGES3_BUCKETNAME || "your-bucket",
      s3_folder: "flamengo-comum-assets"
    };

    // Salvar resumo final
    const summaryPath = path.join(__dirname, 'flamengo-comum-final-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(finalSummary, null, 2));

    console.log('🎉 RESUMO FINAL GERADO COM SUCESSO!');
    console.log(`📁 Arquivo salvo em: ${summaryPath}`);
    console.log(`🏆 Total de ${assets.length} assets do Flamengo (Comum) criados para o NFT ID 1`);
    console.log(`🔗 Todos os assets estão disponíveis no S3 e salvos no banco de dados`);

  } catch (error) {
    console.error('💥 Erro ao gerar resumo:', error);
  } finally {
    await pool.end();
  }
}

// Executar o script
generateFinalSummaryComum(); 