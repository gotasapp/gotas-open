import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-pool';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queueId: string }> }
) {
  try {
    const { queueId } = await params;

    if (!queueId) {
      return NextResponse.json(
        { error: 'Queue ID is required' },
        { status: 400 }
      );
    }

    // 1. Buscar status no banco de dados local primeiro
    const localResult = await query(
      `SELECT 
        ml.*,
        n.name as nft_name,
        n.main_image_url
      FROM nft_mint_log ml
      JOIN nfts n ON ml.nft_id = n.id
      WHERE ml.queue_id = $1`,
      [queueId]
    );

    if (localResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Queue ID not found' },
        { status: 404 }
      );
    }

    const mintLog = localResult.rows[0];

    // 2. Se o status for PENDING, consultar o Thirdweb Engine
    if (mintLog.engine_status === 'PENDING' || !mintLog.engine_status) {
      try {
        const engineUrl = process.env.THIRDWEB_ENGINE_URL;
        const accessToken = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;

        if (!engineUrl || !accessToken) {
          console.error('[Status API] Thirdweb Engine credentials not configured');
          return NextResponse.json({
            queueId,
            status: mintLog.engine_status || 'PENDING',
            localData: true,
            nft: {
              id: mintLog.nft_id,
              name: mintLog.nft_name,
              image: mintLog.main_image_url
            },
            message: 'Engine status check not available'
          });
        }

        // Fazer requisição para o Engine
        const engineResponse = await fetch(
          `${engineUrl}/transaction/status/${queueId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (engineResponse.ok) {
          const engineData: ThirdwebEngineStatusResponse = await engineResponse.json();
          
          // Atualizar status no banco se mudou
          const newStatus = mapEngineStatusToInternal(engineData.status);
          
          if (newStatus !== mintLog.engine_status) {
            const updateParams: any[] = [queueId, newStatus];
            let updateFields = ['engine_status = $2', 'last_checked_at = NOW()'];

            if (engineData.transactionHash) {
              updateFields.push('transaction_hash = $' + (updateParams.length + 1));
              updateParams.push(engineData.transactionHash);
            }

            if (engineData.blockNumber) {
              updateFields.push('block_number = $' + (updateParams.length + 1));
              updateParams.push(engineData.blockNumber);
            }

            if (engineData.gasUsed) {
              updateFields.push('gas_used = $' + (updateParams.length + 1));
              updateParams.push(engineData.gasUsed);
            }

            if (engineData.error) {
              updateFields.push('error_message = $' + (updateParams.length + 1));
              updateParams.push(engineData.error);
            }

            if (engineData.minedAt) {
              updateFields.push('minted_at = $' + (updateParams.length + 1));
              updateParams.push(new Date(engineData.minedAt));
            }

            await query(
              `UPDATE nft_mint_log SET ${updateFields.join(', ')} WHERE queue_id = $1`,
              updateParams
            );
          }

          return NextResponse.json({
            queueId,
            status: newStatus,
            engineStatus: engineData.status,
            transactionHash: engineData.transactionHash,
            blockNumber: engineData.blockNumber,
            gasUsed: engineData.gasUsed,
            error: engineData.error,
            timestamps: {
              created: mintLog.created_at,
              sent: engineData.sentAt,
              mined: engineData.minedAt,
              cancelled: engineData.cancelledAt,
              errored: engineData.erroredAt
            },
            nft: {
              id: mintLog.nft_id,
              name: mintLog.nft_name,
              image: mintLog.main_image_url
            },
            userWallet: mintLog.user_wallet,
            retryCount: mintLog.retry_count
          });
        }
      } catch (engineError) {
        console.error('[Status API] Error fetching from Engine:', engineError);
        // Continuar com dados locais se falhar
      }
    }

    // 3. Retornar dados locais
    return NextResponse.json({
      queueId,
      status: mintLog.engine_status || 'PENDING',
      transactionHash: mintLog.transaction_hash,
      blockNumber: mintLog.block_number,
      gasUsed: mintLog.gas_used,
      error: mintLog.error_message,
      timestamps: {
        created: mintLog.created_at,
        lastChecked: mintLog.last_checked_at,
        minted: mintLog.minted_at,
        webhookReceived: mintLog.webhook_received_at
      },
      nft: {
        id: mintLog.nft_id,
        name: mintLog.nft_name,
        image: mintLog.main_image_url
      },
      userWallet: mintLog.user_wallet,
      retryCount: mintLog.retry_count,
      localData: true
    });

  } catch (error) {
    console.error('[Status API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Endpoint para buscar múltiplos status de uma vez (batch)
export async function POST(request: NextRequest) {
  try {
    const { queueIds } = await request.json();

    if (!Array.isArray(queueIds) || queueIds.length === 0) {
      return NextResponse.json(
        { error: 'queueIds array is required' },
        { status: 400 }
      );
    }

    // Limitar a 50 IDs por vez
    if (queueIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 queue IDs allowed per request' },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT 
        ml.*,
        n.name as nft_name,
        n.main_image_url
      FROM nft_mint_log ml
      JOIN nfts n ON ml.nft_id = n.id
      WHERE ml.queue_id = ANY($1)`,
      [queueIds]
    );

    const statuses = result.rows.map(row => ({
      queueId: row.queue_id,
      status: row.engine_status || 'PENDING',
      transactionHash: row.transaction_hash,
      error: row.error_message,
      nft: {
        id: row.nft_id,
        name: row.nft_name
      },
      userWallet: row.user_wallet
    }));

    return NextResponse.json({ statuses });

  } catch (error) {
    console.error('[Status API Batch] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}