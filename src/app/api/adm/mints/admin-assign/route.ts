import { NextRequest, NextResponse } from 'next/server';
import { getPool, query } from '@/lib/db-pool';
import { getValidatedEnvConfig, getCleanEnv, validateThirdwebConfig } from '@/lib/env-validator';

// Função para criar hash seguro usando Web Crypto API
async function createSecureHash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

interface AdminMintRequest {
  assetId: string;
  username: string;
}

export async function POST(request: NextRequest) {
  console.error(`[ADMIN-ASSIGN] Requisição recebida em ${new Date().toISOString()}`);

  try {
    // Verificar autenticação admin
    const adminAuthCookie = request.cookies.get('adminAuth')?.value;
    const adminEmail = getValidatedEnvConfig().ADMIN_EMAIL;
    const adminPassword = getValidatedEnvConfig().ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 500 });
    }

    const expectedHash = await createSecureHash(`${adminEmail}:${adminPassword}`);

    if (!adminAuthCookie || adminAuthCookie !== expectedHash) {
      return NextResponse.json({ error: 'Unauthorized - Admin authentication required' }, { status: 401 });
    }

    const body = await request.json() as AdminMintRequest;
    const { assetId, username } = body;

    if (!assetId || !username) {
      return NextResponse.json({ error: 'assetId e username são obrigatórios' }, { status: 400 });
    }

    console.error(`[ADMIN-ASSIGN] Processando: Asset ${assetId} → User ${username}`);

    // 1. Buscar asset e verificar se está disponível
    const assetResult = await query(
      `SELECT id, nft_id, title, description, image_url, ipfs_image_url, metadata_json, rarity, claimed, nft_number
       FROM asset WHERE id = $1`,
      [assetId]
    );

    if (assetResult.rows.length === 0) {
      return NextResponse.json({
        error: `Asset não encontrado: ${assetId}`,
        success: false
      }, { status: 404 });
    }

    const asset = assetResult.rows[0];

    if (asset.claimed) {
      return NextResponse.json({
        error: `Asset já foi claimed: ${assetId}`,
        assetTitle: asset.title,
        success: false
      }, { status: 400 });
    }

    // 2. Buscar usuário por username
    const userResult = await query(
      `SELECT id, wallet_address, privy_user_id, email, username, display_name
       FROM users WHERE username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        error: `Usuário não encontrado: ${username}`,
        success: false
      }, { status: 404 });
    }

    const user = userResult.rows[0];

    if (!user.wallet_address) {
      return NextResponse.json({
        error: `Usuário ${username} não tem wallet configurada`,
        success: false
      }, { status: 400 });
    }

    const walletAddress = user.wallet_address.toLowerCase();

    console.error(`[ADMIN-ASSIGN] Asset: ${asset.title} (${asset.rarity})`);
    console.error(`[ADMIN-ASSIGN] Usuário: ${user.display_name || user.username} - Wallet: ${walletAddress}`);

    // 3. Executar transação de claim
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar novamente com lock
      const lockCheck = await client.query(
        'SELECT claimed FROM asset WHERE id = $1 FOR UPDATE',
        [assetId]
      );

      if (lockCheck.rows[0]?.claimed) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          error: `Asset foi claimed por outro processo: ${assetId}`,
          success: false
        }, { status: 400 });
      }

      // Criar userassetclaims
      await client.query(
        `INSERT INTO userassetclaims (user_id, asset_id, nft_id, claimed_at, privy_user_id, wallet_address)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)`,
        [user.id, assetId, asset.nft_id, user.privy_user_id || 'admin-assigned', walletAddress]
      );

      // Marcar asset como claimed
      await client.query(
        'UPDATE asset SET claimed = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [assetId]
      );

      // Atualizar supply do NFT
      await client.query(
        'UPDATE nfts SET claimed_supply = claimed_supply + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [asset.nft_id]
      );

      // Criar mint log
      const mintLogResult = await client.query(
        `INSERT INTO nft_mint_log (asset_id, user_wallet_address, quantity_minted, status, engine_status, created_at)
         VALUES ($1, $2, 1, 'PENDING_ENGINE_CALL', 'PENDING', CURRENT_TIMESTAMP)
         RETURNING id`,
        [assetId, walletAddress]
      );

      const mintLogId = mintLogResult.rows[0].id;

      await client.query('COMMIT');

      console.error(`[ADMIN-ASSIGN] ✅ Claim registrado no banco. Mint Log ID: ${mintLogId}`);

      // 4. Chamar Thirdweb Engine (async)
      const thirdwebResult = await callThirdwebEngine(assetId, walletAddress, asset, mintLogId);

      return NextResponse.json({
        success: true,
        message: 'Asset atribuído com sucesso!',
        data: {
          assetId: assetId,
          assetTitle: asset.title,
          assetRarity: asset.rarity,
          userId: user.id,
          username: user.username,
          displayName: user.display_name,
          walletAddress: walletAddress,
          mintLogId: mintLogId,
          thirdweb: thirdwebResult
        }
      });

    } catch (dbError: any) {
      await client.query('ROLLBACK');
      console.error('[ADMIN-ASSIGN] Erro na transação:', dbError);
      return NextResponse.json({
        error: 'Erro na transação do banco',
        details: dbError.message,
        success: false
      }, { status: 500 });
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('[ADMIN-ASSIGN] Erro:', error);
    return NextResponse.json({
      error: 'Erro ao processar requisição',
      details: error.message,
      success: false
    }, { status: 500 });
  }
}

// Função para chamar Thirdweb Engine
async function callThirdwebEngine(
  assetId: string,
  walletAddress: string,
  asset: any,
  mintLogId: number
): Promise<{ queueId?: string; status: string; error?: string }> {

  const thirdwebValidation = validateThirdwebConfig();

  if (!thirdwebValidation.configured) {
    console.error('[ADMIN-ASSIGN] Thirdweb Engine não configurado');
    return { status: 'SKIPPED', error: 'Thirdweb Engine não configurado' };
  }

  if (!thirdwebValidation.isValid) {
    console.error('[ADMIN-ASSIGN] Configuração Thirdweb incompleta:', thirdwebValidation.missing);
    return { status: 'SKIPPED', error: `Configuração incompleta: ${thirdwebValidation.missing?.join(', ')}` };
  }

  try {
    // Construir payload
    let enginePayload: any;

    if (asset.metadata_json && typeof asset.metadata_json === 'string') {
      try {
        const metadata = JSON.parse(asset.metadata_json);

        if (metadata.ipfs_uri || metadata.metadata_uri || (metadata.image && metadata.image.startsWith('ipfs://'))) {
          enginePayload = {
            receiver: walletAddress,
            tokenId: assetId,
            metadataUri: metadata.ipfs_uri || metadata.metadata_uri || metadata.image
          };
        } else {
          enginePayload = {
            receiver: walletAddress,
            tokenId: assetId,
            metadata: metadata
          };
        }
      } catch {
        enginePayload = buildFallbackPayload(assetId, walletAddress, asset);
      }
    } else {
      enginePayload = buildFallbackPayload(assetId, walletAddress, asset);
    }

    console.error(`[ADMIN-ASSIGN] Payload Thirdweb:`, JSON.stringify(enginePayload, null, 2));

    const engineUrl = `${getCleanEnv('THIRDWEB_ENGINE_URL')}/contract/${getCleanEnv('THIRDWEB_CHAIN_ID')}/${getCleanEnv('THIRDWEB_NFT_CONTRACT_ADDRESS')}/erc721/mint-to`;

    console.error(`[ADMIN-ASSIGN] Chamando Engine: ${engineUrl}`);

    const response = await fetch(engineUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getCleanEnv('THIRDWEB_ENGINE_ACCESS_TOKEN')}`,
        'x-backend-wallet-address': getCleanEnv('THIRDWEB_ENGINE_BACKEND_WALLET_ADDRESS')!
      },
      body: JSON.stringify(enginePayload),
    });

    const responseData = await response.json();
    console.error(`[ADMIN-ASSIGN] Resposta Engine (${response.status}):`, JSON.stringify(responseData, null, 2));

    if (response.ok && responseData.result?.queueId) {
      // Atualizar mint log com queueId
      await query(
        `UPDATE nft_mint_log
         SET status = 'ENGINE_QUEUED',
             thirdweb_engine_queue_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [responseData.result.queueId, mintLogId]
      );

      console.error(`[ADMIN-ASSIGN] ✅ Engine Queue ID: ${responseData.result.queueId}`);

      return {
        queueId: responseData.result.queueId,
        status: 'ENGINE_QUEUED'
      };
    } else {
      const errorMsg = responseData.error?.message || JSON.stringify(responseData);

      await query(
        `UPDATE nft_mint_log
         SET status = 'ENGINE_CALL_FAILED',
             error_message = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [errorMsg, mintLogId]
      );

      return {
        status: 'ENGINE_CALL_FAILED',
        error: errorMsg
      };
    }

  } catch (error: any) {
    console.error('[ADMIN-ASSIGN] Erro ao chamar Engine:', error);

    await query(
      `UPDATE nft_mint_log
       SET status = 'ENGINE_CALL_FAILED',
           error_message = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [error.message, mintLogId]
    );

    return {
      status: 'ENGINE_CALL_FAILED',
      error: error.message
    };
  }
}

function buildFallbackPayload(assetId: string, walletAddress: string, asset: any) {
  return {
    receiver: walletAddress,
    tokenId: assetId,
    metadata: {
      name: asset.title || `Asset #${assetId}`,
      description: asset.description || `NFT Asset ID ${assetId}`,
      image: asset.ipfs_image_url || asset.image_url || '',
      attributes: [
        { trait_type: 'Asset ID', value: assetId },
        { trait_type: 'Rarity', value: asset.rarity || 'Common' }
      ]
    }
  };
}

// GET para verificar status de um mint específico
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação admin
    const adminAuthCookie = request.cookies.get('adminAuth')?.value;
    const adminEmail = getValidatedEnvConfig().ADMIN_EMAIL;
    const adminPassword = getValidatedEnvConfig().ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 500 });
    }

    const expectedHash = await createSecureHash(`${adminEmail}:${adminPassword}`);

    if (!adminAuthCookie || adminAuthCookie !== expectedHash) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queueId = searchParams.get('queueId');
    const mintLogId = searchParams.get('mintLogId');

    if (!queueId && !mintLogId) {
      return NextResponse.json({ error: 'queueId ou mintLogId é obrigatório' }, { status: 400 });
    }

    // Buscar do banco
    let mintLog;
    if (queueId) {
      const result = await query(
        `SELECT * FROM nft_mint_log WHERE thirdweb_engine_queue_id = $1`,
        [queueId]
      );
      mintLog = result.rows[0];
    } else {
      const result = await query(
        `SELECT * FROM nft_mint_log WHERE id = $1`,
        [mintLogId]
      );
      mintLog = result.rows[0];
    }

    if (!mintLog) {
      return NextResponse.json({ error: 'Mint log não encontrado' }, { status: 404 });
    }

    // Se tem queueId, verificar status no Engine
    if (mintLog.thirdweb_engine_queue_id) {
      const thirdwebValidation = validateThirdwebConfig();

      if (thirdwebValidation.configured && thirdwebValidation.isValid) {
        try {
          const statusUrl = `${getCleanEnv('THIRDWEB_ENGINE_URL')}/transaction/status/${mintLog.thirdweb_engine_queue_id}`;

          const response = await fetch(statusUrl, {
            headers: {
              'Authorization': `Bearer ${getCleanEnv('THIRDWEB_ENGINE_ACCESS_TOKEN')}`
            }
          });

          if (response.ok) {
            const engineStatus = await response.json();

            // Atualizar banco se status mudou
            if (engineStatus.result) {
              const { status, transactionHash, blockNumber, gasUsed } = engineStatus.result;

              let dbStatus = mintLog.engine_status;
              if (status === 'mined') dbStatus = 'MINTED';
              else if (status === 'errored') dbStatus = 'FAILED';
              else if (status === 'cancelled') dbStatus = 'CANCELLED';
              else if (status === 'queued' || status === 'sent') dbStatus = 'PENDING';

              if (transactionHash || dbStatus !== mintLog.engine_status) {
                await query(
                  `UPDATE nft_mint_log
                   SET engine_status = $1,
                       transaction_hash = COALESCE($2, transaction_hash),
                       block_number = COALESCE($3, block_number),
                       gas_used = COALESCE($4, gas_used),
                       minted_at = CASE WHEN $1 = 'MINTED' THEN CURRENT_TIMESTAMP ELSE minted_at END,
                       last_checked_at = CURRENT_TIMESTAMP,
                       updated_at = CURRENT_TIMESTAMP
                   WHERE id = $5`,
                  [dbStatus, transactionHash, blockNumber, gasUsed, mintLog.id]
                );
              }

              return NextResponse.json({
                success: true,
                mintLog: {
                  ...mintLog,
                  engine_status: dbStatus,
                  transaction_hash: transactionHash || mintLog.transaction_hash,
                  block_number: blockNumber || mintLog.block_number
                },
                engineStatus: engineStatus.result,
                explorerUrl: transactionHash ? `https://scan.chiliz.com/tx/${transactionHash}` : null
              });
            }
          }
        } catch (engineError) {
          console.error('[ADMIN-ASSIGN] Erro ao verificar status no Engine:', engineError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      mintLog: mintLog,
      explorerUrl: mintLog.transaction_hash ? `https://scan.chiliz.com/tx/${mintLog.transaction_hash}` : null
    });

  } catch (error: any) {
    console.error('[ADMIN-ASSIGN] Erro ao verificar status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
