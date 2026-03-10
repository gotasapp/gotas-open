import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-pool';
import { getValidatedEnvConfig } from '@/lib/env-validator';

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

    // Obter parâmetros
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    // Atividade recente de mints
    const recentMintsResult = await query(`
      SELECT 
        ml.id,
        ml.thirdweb_engine_queue_id as queue_id,
        ml.user_wallet_address,
        ml.engine_status,
        ml.created_at,
        ml.minted_at,
        a.title as nft_title,
        n.rarity,
        c.name as category_name,
        c.image_url as category_image
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.id IS NOT NULL
      ORDER BY ml.created_at DESC
      LIMIT $1
    `, [limit]);

    // Novos usuários (últimos 30 dias)
    const newUsersResult = await query(`
      SELECT 
        wallet_address,
        username,
        display_name,
        created_at
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 20
    `);

    // Atividade por hora nas últimas 24 horas
    const hourlyActivityResult = await query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as activity_count
      FROM nft_mint_log
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `);

    // Picos de atividade (dias com mais mints)
    const activityPeaksResult = await query(`
      SELECT 
        DATE(created_at) as activity_date,
        COUNT(*) as total_mints,
        COUNT(CASE WHEN engine_status = 'MINTED' THEN 1 END) as successful_mints,
        COUNT(DISTINCT user_wallet_address) as unique_users
      FROM nft_mint_log
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY total_mints DESC
      LIMIT 10
    `);

    // Erros mais recentes
    const recentErrorsResult = await query(`
      SELECT 
        ml.user_wallet_address,
        ml.error_message,
        ml.created_at,
        a.title as nft_title,
        c.name as category_name
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE ml.engine_status = 'FAILED' 
        AND ml.error_message IS NOT NULL
        AND n.id IS NOT NULL
      ORDER BY ml.created_at DESC
      LIMIT 20
    `);

    // Usuários mais ativos (por número de mints)
    const activeUsersResult = await query(`
      SELECT 
        user_wallet_address,
        COUNT(*) as total_mints,
        COUNT(CASE WHEN engine_status = 'MINTED' THEN 1 END) as successful_mints,
        MAX(created_at) as last_activity,
        COUNT(DISTINCT asset_id) as unique_nfts
      FROM nft_mint_log
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY user_wallet_address
      ORDER BY total_mints DESC
      LIMIT 10
    `);

    // Estatísticas de tempo real
    const realTimeStatsResult = await query(`
      SELECT 
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour_mints,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h_mints,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d_mints,
        COUNT(CASE WHEN engine_status = 'PENDING' THEN 1 END) as pending_mints,
        COUNT(CASE WHEN engine_status = 'FAILED' AND created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as recent_failures
      FROM nft_mint_log
    `);

    const result = {
      recentMints: recentMintsResult.rows.map(row => ({
        id: row.id,
        queueId: row.queue_id,
        userWallet: row.user_wallet_address,
        status: row.engine_status,
        createdAt: row.created_at,
        mintedAt: row.minted_at,
        nftTitle: row.nft_title,
        rarity: row.rarity,
        category: row.category_name,
        categoryImage: row.category_image
      })),
      newUsers: newUsersResult.rows.map(row => ({
        walletAddress: row.wallet_address,
        username: row.username,
        displayName: row.display_name,
        joinedAt: row.created_at
      })),
      hourlyActivity: Array.from({ length: 24 }, (_, i) => {
        const hourData = hourlyActivityResult.rows.find(row => parseInt(row.hour) === i);
        return {
          hour: i,
          count: hourData ? parseInt(hourData.activity_count) : 0
        };
      }),
      activityPeaks: activityPeaksResult.rows.map(row => ({
        date: row.activity_date,
        totalMints: parseInt(row.total_mints),
        successfulMints: parseInt(row.successful_mints),
        uniqueUsers: parseInt(row.unique_users)
      })),
      recentErrors: recentErrorsResult.rows.map(row => ({
        userWallet: row.user_wallet_address,
        errorMessage: row.error_message,
        timestamp: row.created_at,
        nftTitle: row.nft_title,
        category: row.category_name
      })),
      activeUsers: activeUsersResult.rows.map(row => ({
        wallet: row.user_wallet_address,
        totalMints: parseInt(row.total_mints),
        successfulMints: parseInt(row.successful_mints),
        lastActivity: row.last_activity,
        uniqueNfts: parseInt(row.unique_nfts),
        successRate: parseInt(row.total_mints) > 0 
          ? (parseInt(row.successful_mints) / parseInt(row.total_mints)) * 100 
          : 0
      })),
      realTimeStats: {
        lastHourMints: parseInt(realTimeStatsResult.rows[0]?.last_hour_mints || '0'),
        last24hMints: parseInt(realTimeStatsResult.rows[0]?.last_24h_mints || '0'),
        last7dMints: parseInt(realTimeStatsResult.rows[0]?.last_7d_mints || '0'),
        pendingMints: parseInt(realTimeStatsResult.rows[0]?.pending_mints || '0'),
        recentFailures: parseInt(realTimeStatsResult.rows[0]?.recent_failures || '0')
      }
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Admin Statistics Activity API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}