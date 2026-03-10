import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-pool';
import { getValidatedEnvConfig } from '@/lib/env-validator';

interface RetryMintRequest {
  queueId: string;
  reason?: string;
}

// Função para criar hash seguro usando Web Crypto API
async function createSecureHash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação admin
    const adminAuthCookie = request.cookies.get('adminAuth')?.value;
    
    // Verificar se temos as credenciais no ENV
    const adminEmail = getValidatedEnvConfig().ADMIN_EMAIL;
    const adminPassword = getValidatedEnvConfig().ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Admin credentials not configured' },
        { status: 500 }
      );
    }
    
    // Verificar se o cookie tem o hash correto das credenciais
    const expectedHash = await createSecureHash(
      `${adminEmail}:${adminPassword}`
    );

    if (!adminAuthCookie || adminAuthCookie !== expectedHash) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: RetryMintRequest = await request.json();
    const { queueId, reason } = body;

    if (!queueId) {
      return NextResponse.json(
        { error: 'Queue ID is required' },
        { status: 400 }
      );
    }

    // Buscar o mint original
    const originalMint = await query(
      `SELECT * FROM nft_mint_log WHERE queue_id = $1`,
      [queueId]
    );

    if (originalMint.rows.length === 0) {
      return NextResponse.json(
        { error: 'Original mint not found' },
        { status: 404 }
      );
    }

    const mint = originalMint.rows[0];

    // Verificar se o mint falhou ou foi cancelado
    if (!['FAILED', 'CANCELLED'].includes(mint.engine_status)) {
      return NextResponse.json(
        { error: 'Can only retry failed or cancelled mints' },
        { status: 400 }
      );
    }

    // Verificar se já existe um NFT mintado para este usuário
    const existingAsset = await query(
      `SELECT id FROM user_assets WHERE nft_id = $1 AND user_id = $2`,
      [mint.nft_id, mint.user_wallet]
    );

    if (existingAsset.rows.length > 0) {
      return NextResponse.json(
        { error: 'NFT already minted for this user' },
        { status: 400 }
      );
    }

    // Buscar dados do NFT
    const nftResult = await query(
      'SELECT * FROM nfts WHERE id = $1',
      [mint.nft_id]
    );

    if (nftResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'NFT not found' },
        { status: 404 }
      );
    }

    const nft = nftResult.rows[0];

    // Preparar payload para o Thirdweb Engine
    const engineUrl = process.env.THIRDWEB_ENGINE_URL;
    const accessToken = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
    const backendWallet = process.env.THIRDWEB_BACKEND_WALLET_ADDRESS;

    if (!engineUrl || !accessToken || !backendWallet) {
      return NextResponse.json(
        { error: 'Thirdweb Engine not configured' },
        { status: 500 }
      );
    }

    // Criar novo mint request para o Engine
    const mintPayload = {
      receiver: mint.user_wallet,
      metadata: {
        name: nft.name,
        description: nft.description,
        image: nft.main_image_url,
        attributes: nft.attributes ? JSON.parse(nft.attributes) : [],
        collection: nft.collection_name || 'Socios NFT Collection'
      }
    };

    const engineResponse = await fetch(
      `${engineUrl}/contract/${nft.chain_id}/${nft.contract_address}/erc721/mint-to`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-backend-wallet-address': backendWallet
        },
        body: JSON.stringify(mintPayload)
      }
    );

    if (!engineResponse.ok) {
      const errorData = await engineResponse.json();
      console.error('[Retry] Engine error:', errorData);
      return NextResponse.json(
        { 
          error: 'Failed to retry mint',
          details: errorData 
        },
        { status: 500 }
      );
    }

    const engineResult = await engineResponse.json();
    const newQueueId = engineResult.queueId;

    // Usar transações com query pool
    try {
      // 1. Atualizar mint original com contagem de retry
      await query(
        `UPDATE nft_mint_log 
         SET retry_count = retry_count + 1
         WHERE queue_id = $1`,
        [queueId]
      );

      // 2. Criar novo registro de mint
      await query(
        `INSERT INTO nft_mint_log (
          user_wallet, 
          nft_id, 
          queue_id, 
          engine_status,
          retry_count,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          mint.user_wallet,
          mint.nft_id,
          newQueueId,
          'PENDING',
          0
        ]
      );

      // 3. Registrar histórico de retry
      await query(
        `INSERT INTO mint_retry_history (
          original_queue_id,
          new_queue_id,
          nft_id,
          user_wallet,
          retry_reason,
          retry_status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          queueId,
          newQueueId,
          mint.nft_id,
          mint.user_wallet,
          reason || 'Manual retry by admin',
          'PENDING'
        ]
      );

      console.log(`[Retry] Successfully created retry for ${queueId} -> ${newQueueId}`);

      return NextResponse.json({
        success: true,
        originalQueueId: queueId,
        newQueueId,
        message: 'Mint retry initiated successfully'
      });

    } catch (error) {
      // Em caso de erro, as queries individuais falharão
      throw error;
    }

  } catch (error) {
    console.error('[Retry] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint para verificar se um mint pode ser refeito
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queueId = searchParams.get('queueId');

    if (!queueId) {
      return NextResponse.json(
        { error: 'Queue ID is required' },
        { status: 400 }
      );
    }

    // Buscar o mint
    const mintResult = await query(
      `SELECT 
        ml.*,
        n.name as nft_name,
        EXISTS(
          SELECT 1 FROM user_assets 
          WHERE nft_id = ml.nft_id 
          AND user_id = ml.user_wallet
        ) as already_minted
      FROM nft_mint_log ml
      JOIN nfts n ON ml.nft_id = n.id
      WHERE ml.queue_id = $1`,
      [queueId]
    );

    if (mintResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Mint not found' },
        { status: 404 }
      );
    }

    const mint = mintResult.rows[0];

    // Verificar histórico de retry
    const retryHistory = await query(
      `SELECT * FROM mint_retry_history 
       WHERE original_queue_id = $1 
       ORDER BY created_at DESC`,
      [queueId]
    );

    const canRetry = ['FAILED', 'CANCELLED'].includes(mint.engine_status) && 
                     !mint.already_minted &&
                     mint.retry_count < 3; // Limite de 3 retries

    return NextResponse.json({
      queueId,
      nftId: mint.nft_id,
      nftName: mint.nft_name,
      userWallet: mint.user_wallet,
      status: mint.engine_status,
      canRetry,
      retryCount: mint.retry_count,
      alreadyMinted: mint.already_minted,
      error: mint.error_message,
      retryHistory: retryHistory.rows.map(r => ({
        newQueueId: r.new_queue_id,
        reason: r.retry_reason,
        status: r.retry_status,
        createdAt: r.created_at
      }))
    });

  } catch (error) {
    console.error('[Retry Check] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}