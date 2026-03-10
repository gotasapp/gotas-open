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

export async function GET(request: NextRequest) {
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

    // Buscar estatísticas
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN engine_status = 'PENDING' OR engine_status IS NULL THEN 1 END) as pending,
        COUNT(CASE WHEN engine_status = 'MINTED' THEN 1 END) as minted,
        COUNT(CASE WHEN engine_status = 'FAILED' OR status LIKE '%FAILED%' THEN 1 END) as failed,
        COUNT(CASE WHEN engine_status = 'CANCELLED' THEN 1 END) as cancelled,
        COUNT(CASE WHEN engine_status = 'PENDING' AND created_at < NOW() - INTERVAL '30 minutes' THEN 1 END) as stale,
        AVG(CASE 
          WHEN engine_status = 'MINTED' AND minted_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (minted_at - created_at))
          ELSE NULL 
        END) as avg_minting_time_seconds,
        MAX(created_at) as last_mint_attempt,
        MAX(minted_at) as last_successful_mint
      FROM nft_mint_log
    `);

    const stats = statsResult.rows[0];

    // Buscar erros mais comuns
    const errorStatsResult = await query(`
      SELECT 
        error_message,
        COUNT(*) as count
      FROM nft_mint_log
      WHERE (engine_status = 'FAILED' OR status LIKE '%FAILED%') AND error_message IS NOT NULL
      GROUP BY error_message
      ORDER BY count DESC
      LIMIT 5
    `);

    return NextResponse.json({
      total: parseInt(stats.total),
      pending: parseInt(stats.pending),
      minted: parseInt(stats.minted),
      failed: parseInt(stats.failed),
      cancelled: parseInt(stats.cancelled),
      stale: parseInt(stats.stale),
      avgMintingTimeSeconds: stats.avg_minting_time_seconds ? parseFloat(stats.avg_minting_time_seconds) : null,
      lastMintAttempt: stats.last_mint_attempt,
      lastSuccessfulMint: stats.last_successful_mint,
      commonErrors: errorStatsResult.rows
    });

  } catch (error) {
    console.error('[Admin Mints Stats API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}