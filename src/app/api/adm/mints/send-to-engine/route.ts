import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-pool';
import { getValidatedEnvConfig } from '@/lib/env-validator';

// Função para criar hash seguro usando Web Crypto API
async function createSecureHash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

interface ThirdwebMintRequest {
  receiver: string;
  tokenId: string;
  metadata: {
    name: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
}

interface ThirdwebMintResponse {
  result: {
    queueId: string;
  };
}

// Função para buscar dados do asset
async function getAssetData(assetId: string) {
  try {
    const assetResult = await query(
      'SELECT * FROM asset WHERE id = $1',
      [assetId]
    );
    
    if (assetResult.rows.length === 0) {
      console.error(`[Send to Engine] Asset not found: ${assetId}`);
      return null;
    }

    return assetResult.rows[0];
  } catch (error) {
    console.error(`[Send to Engine] Error fetching asset data:`, error);
    return null;
  }
}

// Função para enviar mint para o Thirdweb Engine
async function submitMintToEngine(mintData: any, assetData: any): Promise<string | null> {
  try {
    const engineUrl = process.env.THIRDWEB_ENGINE_URL;
    const accessToken = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
    const backendWallet = process.env.THIRDWEB_ENGINE_BACKEND_WALLET_ADDRESS;
    const contractAddress = process.env.THIRDWEB_NFT_CONTRACT_ADDRESS;
    const chainId = process.env.THIRDWEB_CHAIN_ID || '88888';

    if (!engineUrl || !accessToken || !backendWallet || !contractAddress) {
      console.error('[Send to Engine] Thirdweb Engine credentials not fully configured');
      return null;
    }

    // Usar o ID do asset como token_id (NFT ID)
    const tokenId = assetData.id.toString();

    // Preparar dados do mint
    let mintRequest: any;
    
    // Verificar se temos metadata_json com IPFS URI
    if (assetData.metadata_json && typeof assetData.metadata_json === 'string') {
      try {
        const metadata = JSON.parse(assetData.metadata_json);
        
        // Se o metadata_json contém um IPFS URI, usar metadataUri
        if (metadata.ipfs_uri || metadata.metadata_uri || (metadata.image && metadata.image.startsWith('ipfs://'))) {
          mintRequest = {
            receiver: mintData.user_wallet_address,
            tokenId: tokenId,
            metadataUri: metadata.ipfs_uri || metadata.metadata_uri || metadata.image
          };
          console.log(`[Send to Engine] Using IPFS metadataUri:`, mintRequest.metadataUri);
        } else {
          // Caso contrário, usar o metadata object do metadata_json
          mintRequest = {
            receiver: mintData.user_wallet_address,
            tokenId: tokenId,
            metadata: metadata
          };
          console.log(`[Send to Engine] Using metadata object from metadata_json`);
        }
      } catch (parseError) {
        console.error(`[Send to Engine] Error parsing metadata_json:`, parseError);
        // Fallback para o formato tradicional
        mintRequest = {
          receiver: mintData.user_wallet_address,
          tokenId: tokenId,
          metadata: {
            name: assetData.title || assetData.name || `Asset #${assetData.id}`,
            description: assetData.description || `NFT Asset ID ${assetData.id}`,
            image: assetData.ipfs_image_url || assetData.image_url || assetData.image || '',
            attributes: [
              {
                trait_type: 'Asset ID',
                value: assetData.id
              },
              {
                trait_type: 'Type',
                value: assetData.type || 'NFT'
              },
              ...(assetData.rarity ? [{
                trait_type: 'Rarity',
                value: assetData.rarity
              }] : []),
              ...(assetData.club ? [{
                trait_type: 'Club',
                value: assetData.club
              }] : [])
            ]
          }
        };
      }
    } else {
      // Se não tem metadata_json, usar o formato tradicional
      mintRequest = {
        receiver: mintData.user_wallet_address,
        tokenId: tokenId,
        metadata: {
          name: assetData.title || assetData.name || `Asset #${assetData.id}`,
          description: assetData.description || `NFT Asset ID ${assetData.id}`,
          image: assetData.image_url || assetData.image || '',
          attributes: [
            {
              trait_type: 'Asset ID',
              value: assetData.id
            },
            {
              trait_type: 'Type',
              value: assetData.type || 'NFT'
            },
            ...(assetData.rarity ? [{
              trait_type: 'Rarity',
              value: assetData.rarity
            }] : []),
            ...(assetData.club ? [{
              trait_type: 'Club',
              value: assetData.club
            }] : [])
          ]
        }
      };
    }

    console.log(`[Send to Engine] Submitting mint for asset ${assetData.id} (token_id: ${tokenId}) to wallet ${mintData.user_wallet_address}`);

    const response = await fetch(
      `${engineUrl}/contract/${chainId}/${contractAddress}/erc721/mint-to`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-backend-wallet-address': backendWallet
        },
        body: JSON.stringify(mintRequest)
      }
    );

    if (!response.ok) {
      console.error(`[Send to Engine] Failed to submit mint: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[Send to Engine] Error response:`, errorText);
      return null;
    }

    const result: ThirdwebMintResponse = await response.json();
    console.log(`[Send to Engine] Mint submitted successfully, queue ID: ${result.result.queueId}`);
    
    return result.result.queueId;

  } catch (error) {
    console.error(`[Send to Engine] Error submitting mint:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação admin
    const adminAuthCookie = request.cookies.get('adminAuth')?.value;
    
    const adminEmail = getValidatedEnvConfig().ADMIN_EMAIL;
    const adminPassword = getValidatedEnvConfig().ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Admin credentials not configured' },
        { status: 500 }
      );
    }
    
    const expectedHash = await createSecureHash(`${adminEmail}:${adminPassword}`);

    if (!adminAuthCookie || adminAuthCookie !== expectedHash) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { mintId } = await request.json();

    if (!mintId) {
      return NextResponse.json(
        { error: 'mintId is required' },
        { status: 400 }
      );
    }

    console.log(`[Send to Engine] Processing mint ID: ${mintId}`);

    // Buscar dados do mint
    const mintResult = await query(
      `SELECT * FROM nft_mint_log WHERE id = $1`,
      [mintId]
    );

    if (mintResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Mint not found' },
        { status: 404 }
      );
    }

    const mint = mintResult.rows[0];

    // Verificar se já tem queue_id
    if (mint.thirdweb_engine_queue_id) {
      return NextResponse.json(
        { error: 'Mint already has a queue ID' },
        { status: 400 }
      );
    }

    // Verificar se já foi mintado
    if (mint.engine_status === 'MINTED') {
      return NextResponse.json(
        { error: 'Mint already completed successfully' },
        { status: 400 }
      );
    }

    // Buscar dados do asset
    const assetData = await getAssetData(mint.asset_id);
    if (!assetData) {
      return NextResponse.json(
        { error: 'Asset data not found' },
        { status: 404 }
      );
    }

    // Enviar mint para o Engine
    const queueId = await submitMintToEngine(mint, assetData);

    if (!queueId) {
      return NextResponse.json(
        { error: 'Failed to submit mint to Thirdweb Engine' },
        { status: 500 }
      );
    }

    // Atualizar registro no banco
    await query(
      `UPDATE nft_mint_log 
       SET thirdweb_engine_queue_id = $1,
           engine_status = 'PENDING',
           last_checked_at = NOW()
       WHERE id = $2`,
      [queueId, mintId]
    );

    console.log(`[Send to Engine] Updated mint record ID ${mintId} with queue ID: ${queueId}`);

    return NextResponse.json({
      success: true,
      message: 'Mint sent to engine successfully',
      data: {
        mintId: mintId,
        queueId: queueId,
        assetId: mint.asset_id,
        tokenId: assetData.id,
        userWallet: mint.user_wallet_address
      }
    });

  } catch (error) {
    console.error('[Send to Engine] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}