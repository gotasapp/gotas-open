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

// Função para enviar mint para o Thirdweb Engine
async function submitMintToEngine(mintData: any): Promise<string | null> {
  try {
    const engineUrl = process.env.THIRDWEB_ENGINE_URL;
    const accessToken = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
    const backendWallet = process.env.THIRDWEB_ENGINE_BACKEND_WALLET_ADDRESS;
    const contractAddress = process.env.THIRDWEB_NFT_CONTRACT_ADDRESS;
    const chainId = process.env.THIRDWEB_CHAIN_ID || '88888';

    if (!engineUrl || !accessToken || !backendWallet || !contractAddress) {
      console.error('[Retry Mint] Thirdweb Engine credentials not fully configured');
      return null;
    }

    // Preparar dados do mint
    const mintRequest: ThirdwebMintRequest = {
      receiver: mintData.user_wallet_address,
      metadata: {
        name: `Asset #${mintData.asset_id}`,
        description: `NFT Asset ID ${mintData.asset_id}`,
        image: mintData.image_url || '',
        attributes: [
          {
            trait_type: 'Asset ID',
            value: mintData.asset_id
          },
          {
            trait_type: 'Retry Count',
            value: mintData.retry_count + 1
          }
        ]
      }
    };

    console.log(`[Retry Mint] Submitting mint for asset ${mintData.asset_id} to wallet ${mintData.user_wallet_address}`);

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
      console.error(`[Retry Mint] Failed to submit mint: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[Retry Mint] Error response:`, errorText);
      return null;
    }

    const result: ThirdwebMintResponse = await response.json();
    console.log(`[Retry Mint] Mint submitted successfully, queue ID: ${result.result.queueId}`);
    
    return result.result.queueId;

  } catch (error) {
    console.error(`[Retry Mint] Error submitting mint:`, error);
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

    const { queueId } = await request.json();

    if (!queueId) {
      return NextResponse.json(
        { error: 'queueId is required' },
        { status: 400 }
      );
    }

    console.log(`[Retry Mint] Processing retry for queue ID: ${queueId}`);

    // Buscar dados do mint original
    const mintResult = await query(
      `SELECT * FROM nft_mint_log WHERE thirdweb_engine_queue_id = $1`,
      [queueId]
    );

    if (mintResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Mint not found' },
        { status: 404 }
      );
    }

    const mint = mintResult.rows[0];

    // Verificar se pode fazer retry
    if (mint.engine_status === 'MINTED') {
      return NextResponse.json(
        { error: 'Mint already completed successfully' },
        { status: 400 }
      );
    }

    // Enviar novo mint para o Engine
    const newQueueId = await submitMintToEngine(mint);

    if (!newQueueId) {
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
           retry_count = retry_count + 1,
           error_message = NULL,
           last_checked_at = NOW(),
           transaction_hash = NULL,
           block_number = NULL,
           gas_used = NULL,
           token_id = NULL,
           minted_at = NULL
       WHERE thirdweb_engine_queue_id = $2`,
      [newQueueId, queueId]
    );

    console.log(`[Retry Mint] Updated mint record: ${queueId} -> ${newQueueId}, retry count: ${mint.retry_count + 1}`);

    return NextResponse.json({
      success: true,
      message: 'Mint retry submitted successfully',
      data: {
        oldQueueId: queueId,
        newQueueId: newQueueId,
        retryCount: mint.retry_count + 1,
        assetId: mint.asset_id,
        userWallet: mint.user_wallet_address
      }
    });

  } catch (error) {
    console.error('[Retry Mint] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}