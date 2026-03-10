import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg'; // Usando node-postgres para interagir com o Neon
import { getCleanEnv } from '@/lib/env-validator';

// Configuração do Pool de Conexão com o Neon (deve vir das variáveis de ambiente)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface MintRequestBody {
  assetId: number;
  userWalletAddress: string;
  quantityToMint: number;
}

interface Asset {
  id: number;
  name: string;
  description?: string;
  image_uri: string;
  metadata_uri: string; // Assumindo que este é um URI para um JSON de metadados base
  total_supply: number;
}

interface ErrorResponse {
  error: string;
  details?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { assetId, userWalletAddress, quantityToMint }: MintRequestBody = req.body;

  if (!assetId || !userWalletAddress || !quantityToMint) {
    return res.status(400).json({ error: 'Missing required fields: assetId, userWalletAddress, quantityToMint' });
  }

  if (quantityToMint <= 0) {
    return res.status(400).json({ error: 'quantityToMint must be greater than 0' });
  }

  let client;
  try {
    client = await pool.connect();

    // 1. Buscar detalhes do Asset
    const assetResult = await client.query<Asset>(
      'SELECT id, name, description, image_uri, metadata_uri, total_supply FROM assets WHERE id = $1',
      [assetId]
    );

    if (assetResult.rows.length === 0) {
      return res.status(404).json({ error: `Asset with id ${assetId} not found` });
    }
    const asset = assetResult.rows[0];

    // 2. Registrar tentativa inicial no log
    const logInsertResult = await client.query(
      'INSERT INTO nft_mint_log (asset_id, user_wallet_address, quantity_minted, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [assetId, userWalletAddress, quantityToMint, 'PENDING']
    );
    const logId = logInsertResult.rows[0].id;

    // 3. Preparar metadados para o Thirdweb Engine
    // Com base no exemplo curl, a API espera um campo "metadata" (singular)
    // que é um array de objetos de metadados.
    // Cada objeto usará name, description, e image_uri do asset do banco.

    const metadataForEnginePayload = [];
    for (let i = 0; i < quantityToMint; i++) {
        metadataForEnginePayload.push({
            name: `${asset.name}${quantityToMint > 1 ? ` #${i + 1}` : ''}`, // Adiciona sufixo apenas se for mais de um
            description: asset.description || '', // Usa a descrição do asset
            image: asset.image_uri, // Usa a image_uri do asset
            // Outros atributos podem ser adicionados aqui se o seu asset.metadata_uri contiver mais dados
            // e a API do Engine/contrato os suportar.
            // Por exemplo, se asset.metadata_uri é um JSON com {"attributes": [...]}, você poderia fazer:
            // attributes: (await fetch(asset.metadata_uri).then(r => r.json())).attributes || []
            // Mas isso adiciona uma chamada de fetch para cada asset.metadata_uri, o que pode ser lento
            // se não for o mesmo URI para todos. Para este exemplo, mantemos simples.
        });
    }
    
    // 4. Chamar a API do Thirdweb Engine
    const enginePayload = {
      receiver: userWalletAddress,
      metadata: metadataForEnginePayload, // CORRIGIDO para "metadata" e usando a variável correta
    };

    const engineUrl = `${getCleanEnv('THIRDWEB_ENGINE_URL')}/contract/${getCleanEnv('THIRDWEB_CHAIN_ID')}/${getCleanEnv('THIRDWEB_NFT_CONTRACT_ADDRESS')}/erc721/mint-batch-to`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getCleanEnv('THIRDWEB_ENGINE_ACCESS_TOKEN')}`,
      'x-backend-wallet-address': getCleanEnv('THIRDWEB_ENGINE_BACKEND_WALLET_ADDRESS')!,
    };

    const engineResponse = await fetch(engineUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(enginePayload),
    });

    const engineResult = await engineResponse.json();

    if (!engineResponse.ok || engineResult.error) {
      await client.query(
        'UPDATE nft_mint_log SET status = $1, error_message = $2 WHERE id = $3',
        ['FAILED', engineResult.error?.message || JSON.stringify(engineResult), logId]
      );
      return res.status(engineResponse.status).json({ 
        error: 'Thirdweb Engine API request failed', 
        details: engineResult.error || engineResult 
      });
    }

    // 5. Atualizar o log com o queueId
    const queueId = engineResult.result?.queueId; // Adapte conforme a resposta real do Engine
    if (queueId) {
      await client.query(
        'UPDATE nft_mint_log SET status = $1, thirdweb_engine_queue_id = $2 WHERE id = $3',
        ['QUEUED', queueId, logId]
      );
      return res.status(202).json({ 
        message: 'NFT minting process initiated.', 
        logId: logId,
        queueId: queueId 
      });
    } else {
      // Caso a resposta seja de sucesso mas não tenha queueId (pouco provável para 'write' operations)
      await client.query(
        'UPDATE nft_mint_log SET status = $1, error_message = $2 WHERE id = $3',
        ['FAILED', 'No queueId received from Engine despite a 2xx response.', logId]
      );
      return res.status(500).json({ 
        error: 'NFT minting process initiated but no queueId received.',
        details: engineResult 
      });
    }

  } catch (error: any) {
    console.error('Error in /api/mint-nft-batch:', error);
    // Tentar atualizar o log com erro, se logId estiver disponível
    // if (logId && client) { ... } 
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  } finally {
    if (client) {
      client.release();
    }
  }
} 