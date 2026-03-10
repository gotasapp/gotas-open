const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.envoff') });

// Configuração do S3
const s3 = new AWS.S3({
  accessKeyId: process.env.STORAGES3_ACCESS_KEY_ID,
  secretAccessKey: process.env.STORAGES3_SECRET_ACCESS_KEY,
  region: process.env.STORAGES3_REGION
});

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const BUCKET_NAME = process.env.STORAGES3_BUCKET_NAME;
const NFT_ID = 1;
const IMAGES_DIR = process.env.ASSETS_DIR || path.join(__dirname, '..', 'assets', 'common');

// Dados dos jogadores do Flamengo (versão comum)
const playersData = {
  'MENGO - 1 - ROSSI.png': {
    name: 'Agustín Rossi',
    position: 'Goleiro',
    number: 1,
    description: 'Goleiro argentino conhecido por suas defesas espetaculares e liderança dentro de campo.'
  },
  'MENGO - 2 - G. VARELA.png': {
    name: 'Guillermo Varela',
    position: 'Lateral-direito',
    number: 2,
    description: 'Lateral uruguaio com grande velocidade e capacidade de apoio ao ataque.'
  },
  'MENGO - 3 - LÉO ORTIZ.png': {
    name: 'Léo Ortiz',
    position: 'Zagueiro',
    number: 3,
    description: 'Zagueiro brasileiro sólido na defesa e perigoso nas bolas aéreas.'
  },
  'MENGO - 4 - LÉO PEREIRA.png': {
    name: 'Léo Pereira',
    position: 'Zagueiro',
    number: 4,
    description: 'Zagueiro versátil que pode atuar também como lateral-esquerdo.'
  },
  'MENGO - 5 - ERICK PULGAR.png': {
    name: 'Erick Pulgar',
    position: 'Volante',
    number: 5,
    description: 'Volante chileno com excelente passe e visão de jogo, fundamental na armação.'
  },
  'MENGO - 6 - AYRTON LUCAS.png': {
    name: 'Ayrton Lucas',
    position: 'Lateral-esquerdo',
    number: 6,
    description: 'Lateral-esquerdo brasileiro com grande velocidade e cruzamentos precisos.'
  },
  'MENGO - 7 - LUIZ ARAÚJO.png': {
    name: 'Luiz Araújo',
    position: 'Ponta-direita',
    number: 7,
    description: 'Ponta brasileiro habilidoso com dribles desconcertantes e finalizações certeiras.'
  },
  'MENGO - 8 - GERSON.png': {
    name: 'Gerson',
    position: 'Meio-campo',
    number: 8,
    description: 'Meio-campista brasileiro com grande técnica e capacidade de distribuição de jogo.'
  },
  'MENGO - 9 - PEDRO.png': {
    name: 'Pedro',
    position: 'Centroavante',
    number: 9,
    description: 'Artilheiro brasileiro com faro de gol e presença de área impressionantes.'
  },
  'MENGO - 10 - DE ARRASCAETA.png': {
    name: 'Giorgian De Arrascaeta',
    position: 'Meia-atacante',
    number: 10,
    description: 'Meia uruguaio criativo, considerado um dos melhores jogadores da América do Sul.'
  },
  'MENGO - 11 - EVERTON CEBOLINHA.png': {
    name: 'Everton Cebolinha',
    position: 'Ponta-esquerda',
    number: 11,
    description: 'Ponta brasileiro veloz com grande capacidade de drible e finalização.'
  },
  'MENGO - 13 - DANILO.png': {
    name: 'Danilo',
    position: 'Volante',
    number: 13,
    description: 'Volante brasileiro com forte marcação e boa distribuição de passes.'
  },
  'MENGO - 17 - VIÑA.png': {
    name: 'Matías Viña',
    position: 'Lateral-esquerdo',
    number: 17,
    description: 'Lateral uruguaio com grande força física e apoio constante ao ataque.'
  },
  'MENGO - 18 - DE LA CRUZ.png': {
    name: 'Nicolás De La Cruz',
    position: 'Meio-campo',
    number: 18,
    description: 'Meio-campista uruguaio técnico com excelente passe e visão de jogo.'
  },
  'MENGO - 20 - MATHEUS G..png': {
    name: 'Matheus Gonçalves',
    position: 'Ponta',
    number: 20,
    description: 'Jovem ponta brasileiro promissor com grande velocidade e habilidade.'
  },
  'MENGO - 21 - ALLAN.png': {
    name: 'Allan',
    position: 'Volante',
    number: 21,
    description: 'Volante brasileiro experiente com grande capacidade de marcação.'
  },
  'MENGO - 23 - JUNINHO.png': {
    name: 'Juninho',
    position: 'Lateral-direito',
    number: 23,
    description: 'Lateral-direito brasileiro jovem e promissor com boa técnica.'
  },
  'MENGO - 25 - MATHEUS CUNHA.png': {
    name: 'Matheus Cunha',
    position: 'Goleiro',
    number: 25,
    description: 'Goleiro brasileiro jovem com grande potencial e reflexos rápidos.'
  },
  'MENGO - 26 - ALEX SANDRO.png': {
    name: 'Alex Sandro',
    position: 'Lateral-esquerdo',
    number: 26,
    description: 'Lateral-esquerdo brasileiro experiente com passagens pela Europa.'
  },
  'MENGO - 27 - B. HENRIQUE.png': {
    name: 'Bruno Henrique',
    position: 'Ponta-esquerda',
    number: 27,
    description: 'Ponta brasileiro veloz e decisivo, ídolo da torcida rubro-negra.'
  },
  'MENGO - 30 - MICHAEL.png': {
    name: 'Michael',
    position: 'Ponta-direita',
    number: 30,
    description: 'Ponta brasileiro com grande velocidade e capacidade de finalização.'
  },
  'MENGO - 33 - CLEITON.png': {
    name: 'Cleiton',
    position: 'Goleiro',
    number: 33,
    description: 'Goleiro brasileiro confiável com bons reflexos e posicionamento.'
  },
  'MENGO - 43 - WESLEY.png': {
    name: 'Wesley',
    position: 'Lateral-direito',
    number: 43,
    description: 'Lateral-direito brasileiro jovem com grande potencial ofensivo.'
  },
  'MENGO - 49 - DYOGO ALVES.png': {
    name: 'Dyogo Alves',
    position: 'Goleiro',
    number: 49,
    description: 'Goleiro brasileiro das categorias de base com grande futuro.'
  },
  'MENGO - 50 - G. PLATA.png': {
    name: 'Gonzalo Plata',
    position: 'Ponta-direita',
    number: 50,
    description: 'Ponta equatoriano veloz com grande habilidade nos dribles.'
  },
  'MENGO - 52 - EVERTTON ARAÚJO.png': {
    name: 'Evertton Araújo',
    position: 'Meio-campo',
    number: 52,
    description: 'Meio-campista brasileiro jovem e promissor das categorias de base.'
  }
};

async function uploadImageToS3(filePath, fileName) {
  try {
    const fileContent = fs.readFileSync(filePath);
    const key = `flamengo-comum-assets/${Date.now()}-${fileName}`;
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: 'image/png'
    };

    const result = await s3.upload(params).promise();
    console.log(`✅ Upload realizado: ${fileName} -> ${result.Location}`);
    return result.Location;
  } catch (error) {
    console.error(`❌ Erro no upload de ${fileName}:`, error);
    throw error;
  }
}

async function saveAssetToDatabase(assetData) {
  try {
    const query = `
      INSERT INTO asset (nft_id, title, description, image_url, asset_data, metadata_json)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, image_url
    `;
    
    const values = [
      assetData.nft_id,
      assetData.title,
      assetData.description,
      assetData.image_url,
      JSON.stringify(assetData.asset_data),
      JSON.stringify(assetData.metadata)
    ];

    const result = await pool.query(query, values);
    console.log(`✅ Asset salvo no banco: ${result.rows[0].title} (ID: ${result.rows[0].id})`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Erro ao salvar no banco:', error);
    throw error;
  }
}

async function processComumImages() {
  try {
    console.log('🚀 Iniciando processamento das imagens do Flamengo (Comum)...\n');
    
    // Listar arquivos no diretório
    const files = fs.readdirSync(IMAGES_DIR).filter(file => file.endsWith('.png'));
    console.log(`📁 Encontradas ${files.length} imagens para processar\n`);

    const processedAssets = [];

    for (const file of files) {
      console.log(`🔄 Processando: ${file}`);
      
      const filePath = path.join(IMAGES_DIR, file);
      const playerData = playersData[file];
      
      if (!playerData) {
        console.log(`⚠️  Dados não encontrados para ${file}, pulando...`);
        continue;
      }

      // Upload para S3
      const imageUrl = await uploadImageToS3(filePath, file);

      // Preparar dados do asset (versão comum)
      const assetData = {
        nft_id: NFT_ID,
        title: `${playerData.name} - Camisa ${playerData.number} (Comum)`,
        description: `${playerData.description} Jogador do Clube de Regatas do Flamengo, o Mais Querido do Brasil. ${playerData.position} que veste a camisa ${playerData.number}. Versão comum da coleção.`,
        image_url: imageUrl,
        asset_data: {
          player_name: playerData.name,
          position: playerData.position,
          number: playerData.number,
          team: 'Flamengo',
          category: 'player_card',
          rarity: 'common',
          season: '2024/2025',
          collection: 'Mengo Especial'
        },
        metadata: {
          name: `${playerData.name} - Flamengo #${playerData.number} (Comum)`,
          description: `${playerData.description} Versão comum da coleção Mengo Especial.`,
          image: imageUrl,
          attributes: [
            { trait_type: 'Team', value: 'Flamengo' },
            { trait_type: 'Position', value: playerData.position },
            { trait_type: 'Number', value: playerData.number.toString() },
            { trait_type: 'Rarity', value: 'Common' },
            { trait_type: 'Season', value: '2024/2025' },
            { trait_type: 'Category', value: 'Player Card' },
            { trait_type: 'Collection', value: 'Mengo Especial' }
          ]
        }
      };

      // Salvar no banco
      const savedAsset = await saveAssetToDatabase(assetData);
      processedAssets.push({
        ...savedAsset,
        player_data: playerData,
        s3_url: imageUrl
      });

      console.log(`✅ ${playerData.name} (Comum) processado com sucesso!\n`);
    }

    // Salvar resumo temporário
    const summary = {
      processed_at: new Date().toISOString(),
      nft_id: NFT_ID,
      nft_name: 'Mengo Especial',
      collection_type: 'common',
      total_assets: processedAssets.length,
      assets: processedAssets
    };

    fs.writeFileSync(
      path.join(__dirname, 'flamengo-comum-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('🎉 PROCESSAMENTO CONCLUÍDO!');
    console.log(`📊 Total de assets processados: ${processedAssets.length}`);
    console.log(`💾 Resumo salvo em: scripts/flamengo-comum-summary.json`);
    console.log(`🏆 Todos os assets foram relacionados ao NFT ID: ${NFT_ID} (Mengo Especial - Comum)`);

  } catch (error) {
    console.error('💥 Erro durante o processamento:', error);
  } finally {
    await pool.end();
  }
}

// Executar o script
processComumImages(); 