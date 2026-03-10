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

interface ThirdwebEngineStatusResponse {
  queueId: string;
  status: 'queued' | 'sent' | 'mined' | 'errored' | 'cancelled';
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
  sentAt?: string;
  minedAt?: string;
  cancelledAt?: string;
  erroredAt?: string;
  tokenId?: string;
}

// Mapear status do Engine para nosso status interno
function mapEngineStatusToInternal(engineStatus: string): string {
  const statusMap: Record<string, string> = {
    'queued': 'PENDING',
    'sent': 'PENDING', 
    'mined': 'MINTED',
    'errored': 'FAILED',
    'cancelled': 'CANCELLED'
  };
  return statusMap[engineStatus] || 'PENDING';
}

// Função para buscar status no Thirdweb Engine
async function fetchEngineStatus(queueId: string): Promise<ThirdwebEngineStatusResponse | null> {
  try {
    const engineUrl = process.env.THIRDWEB_ENGINE_URL;
    const accessToken = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;

    if (!engineUrl || !accessToken) {
      console.error('[Manual Verify] Thirdweb Engine credentials not configured');
      return null;
    }

    const response = await fetch(
      `${engineUrl}/transaction/status/${queueId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`[Manual Verify] Failed to fetch status for ${queueId}: ${response.status}`);
      const errorText = await response.text();
      console.error(`[Manual Verify] Error response:`, errorText);
      return null;
    }

    const data = await response.json();
    console.log(`[Manual Verify] Engine response for ${queueId}:`, JSON.stringify(data, null, 2));
    
    // O Thirdweb Engine retorna dados em result
    return data.result || data;
  } catch (error) {
    console.error(`[Manual Verify] Error fetching status for ${queueId}:`, error);
    return null;
  }
}

// POST endpoint para verificar status específicos
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

    const { queueIds } = await request.json();

    if (!Array.isArray(queueIds) || queueIds.length === 0) {
      return NextResponse.json(
        { error: 'queueIds array is required' },
        { status: 400 }
      );
    }

    // Limitar a 20 IDs por vez para não sobrecarregar
    if (queueIds.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 queue IDs allowed per request' },
        { status: 400 }
      );
    }

    console.log(`[Manual Verify] Checking ${queueIds.length} mints...`);

    const results = [];
    let updatedCount = 0;

    for (const queueId of queueIds) {
      try {
        // Buscar dados locais primeiro
        const localResult = await query(
          `SELECT * FROM nft_mint_log WHERE thirdweb_engine_queue_id = $1`,
          [queueId]
        );

        if (localResult.rows.length === 0) {
          results.push({
            queueId,
            error: 'Mint not found in database',
            updated: false
          });
          continue;
        }

        const mint = localResult.rows[0];
        
        // Se já foi finalizado, pular
        if (['MINTED', 'FAILED', 'CANCELLED'].includes(mint.engine_status)) {
          results.push({
            queueId,
            status: mint.engine_status,
            message: 'Already finalized',
            updated: false
          });
          continue;
        }

        // Buscar status no Engine
        const engineStatus = await fetchEngineStatus(queueId);
        
        if (!engineStatus) {
          results.push({
            queueId,
            error: 'Could not fetch status from Engine',
            updated: false
          });
          continue;
        }

        const newStatus = mapEngineStatusToInternal(engineStatus.status);
        
        console.log(`[Manual Verify] Queue ${queueId}: Engine status '${engineStatus.status}' -> Internal status '${newStatus}' (current: '${mint.engine_status}')`);
        
        // Sempre atualizar last_checked_at
        // Se o status mudou, atualizar no banco
        if (newStatus !== mint.engine_status || mint.engine_status === 'PENDING') {
          console.log(`[Manual Verify] Updating ${queueId}: ${mint.engine_status} -> ${newStatus}`);
          const updateParams: any[] = [queueId, newStatus];
          let updateFields = ['engine_status = $2', 'last_checked_at = NOW()'];

          if (engineStatus.transactionHash) {
            updateFields.push('transaction_hash = $' + (updateParams.length + 1));
            updateParams.push(engineStatus.transactionHash);
          }

          if (engineStatus.blockNumber) {
            updateFields.push('block_number = $' + (updateParams.length + 1));
            updateParams.push(engineStatus.blockNumber);
          }

          if (engineStatus.gasUsed) {
            updateFields.push('gas_used = $' + (updateParams.length + 1));
            updateParams.push(engineStatus.gasUsed);
          }

          if (engineStatus.tokenId) {
            updateFields.push('token_id = $' + (updateParams.length + 1));
            updateParams.push(engineStatus.tokenId);
          }

          if (engineStatus.error) {
            updateFields.push('error_message = $' + (updateParams.length + 1));
            updateParams.push(engineStatus.error);
          }

          if (engineStatus.minedAt) {
            updateFields.push('minted_at = $' + (updateParams.length + 1));
            updateParams.push(new Date(engineStatus.minedAt));
          }

          await query(
            `UPDATE nft_mint_log SET ${updateFields.join(', ')} WHERE thirdweb_engine_queue_id = $1`,
            updateParams
          );

          // Se foi mintado com sucesso, criar asset se não existe (se houver tabela user_assets)
          if (newStatus === 'MINTED' && engineStatus.tokenId) {
            try {
              const existingAsset = await query(
                'SELECT id FROM user_assets WHERE asset_id = $1 AND user_id = $2',
                [mint.asset_id, mint.user_wallet_address]
              );

              if (existingAsset.rows.length === 0) {
                await query(
                  `INSERT INTO user_assets (user_id, asset_id, token_id, acquired_at)
                   VALUES ($1, $2, $3, NOW())`,
                  [mint.user_wallet_address, mint.asset_id, engineStatus.tokenId]
                );
              }
            } catch (assetError) {
              console.log('[Manual Verify] user_assets table may not exist, skipping asset creation');
            }
          }

          updatedCount++;
          results.push({
            queueId,
            oldStatus: mint.engine_status,
            newStatus,
            transactionHash: engineStatus.transactionHash,
            updated: true
          });

          console.log(`[Manual Verify] Updated ${queueId}: ${mint.engine_status} -> ${newStatus}`);
        } else {
          // Status não mudou, apenas atualizar timestamp
          await query(
            'UPDATE nft_mint_log SET last_checked_at = NOW() WHERE thirdweb_engine_queue_id = $1',
            [queueId]
          );
          
          results.push({
            queueId,
            status: newStatus,
            message: 'No status change',
            updated: false
          });
        }

      } catch (error) {
        console.error(`[Manual Verify] Error processing ${queueId}:`, error);
        results.push({
          queueId,
          error: error instanceof Error ? error.message : 'Unknown error',
          updated: false
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Verified ${queueIds.length} mints, updated ${updatedCount}`,
      results,
      summary: {
        total: queueIds.length,
        updated: updatedCount,
        errors: results.filter(r => r.error).length
      }
    });

  } catch (error) {
    console.error('[Manual Verify] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint para verificar todos os mints pendentes
export async function GET(request: NextRequest) {
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

    // Buscar todos os mints pendentes
    const pendingMints = await query(
      `SELECT thirdweb_engine_queue_id as queue_id
       FROM nft_mint_log
       WHERE engine_status = 'PENDING' OR engine_status IS NULL
       ORDER BY created_at DESC
       LIMIT 50`
    );

    const queueIds = pendingMints.rows.map(row => row.queue_id);

    if (queueIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending mints found',
        results: [],
        summary: { total: 0, updated: 0, errors: 0 }
      });
    }

    console.log(`[Manual Verify] Auto-checking ${queueIds.length} pending mints...`);

    // Reutilizar a lógica do POST
    const mockRequest = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queueIds })
    });

    // Copiar cookies
    const newRequest = new NextRequest(mockRequest);
    newRequest.cookies.set('adminAuth', adminAuthCookie);

    return await POST(newRequest);

  } catch (error) {
    console.error('[Manual Verify] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}