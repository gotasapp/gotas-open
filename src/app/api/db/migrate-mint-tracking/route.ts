import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-pool';

export async function POST(request: NextRequest) {
  try {
    console.log('[Migration] Starting mint tracking system migration...');

    // 1. Adicionar novos campos na tabela nft_mint_log
    await query(`
      ALTER TABLE nft_mint_log 
      ADD COLUMN IF NOT EXISTS engine_status VARCHAR(50) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS block_number BIGINT,
      ADD COLUMN IF NOT EXISTS gas_used VARCHAR(50),
      ADD COLUMN IF NOT EXISTS error_message TEXT,
      ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS minted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP
    `);

    console.log('[Migration] ✓ Added columns to nft_mint_log');

    // 2. Criar índices para melhor performance
    await query(`CREATE INDEX IF NOT EXISTS idx_nft_mint_log_queue_id ON nft_mint_log(thirdweb_engine_queue_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_nft_mint_log_engine_status ON nft_mint_log(engine_status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_nft_mint_log_asset_id ON nft_mint_log(asset_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_nft_mint_log_user_wallet ON nft_mint_log(user_wallet_address)`);

    console.log('[Migration] ✓ Created indexes');

    // 3. Criar view para visualização consolidada do status de minting
    await query(`
      CREATE OR REPLACE VIEW v_mint_status_dashboard AS
      SELECT 
          ml.id,
          ml.asset_id,
          ml.user_wallet_address,
          ml.thirdweb_engine_queue_id as queue_id,
          ml.engine_status,
          ml.transaction_hash,
          ml.block_number,
          ml.error_message,
          ml.retry_count,
          ml.created_at,
          ml.minted_at,
          ml.last_checked_at,
          CASE 
              WHEN ml.engine_status = 'MINTED' THEN 'success'
              WHEN ml.engine_status = 'FAILED' THEN 'error'
              WHEN ml.engine_status = 'CANCELLED' THEN 'cancelled'
              WHEN ml.last_checked_at < NOW() - INTERVAL '30 minutes' THEN 'stale'
              ELSE 'pending'
          END as status_category,
          EXTRACT(EPOCH FROM (COALESCE(ml.minted_at, NOW()) - ml.created_at)) as processing_time_seconds
      FROM nft_mint_log ml
      ORDER BY ml.created_at DESC
    `);

    console.log('[Migration] ✓ Created view');

    // 4. Verificar se as colunas foram criadas
    const checkResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'nft_mint_log' 
      AND column_name = 'engine_status'
    `);

    if (checkResult.rows.length === 0) {
      throw new Error('engine_status column was not created');
    }

    console.log('[Migration] ✓ Verified engine_status column exists');

    return NextResponse.json({
      success: true,
      message: 'Mint tracking system migration completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Migration] Error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to /api/db/migrate-mint-tracking to run migration',
    status: 'ready'
  });
}