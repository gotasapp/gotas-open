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

    // Obter parâmetros de filtro de tempo
    const searchParams = request.nextUrl.searchParams;
    const timeFilter = searchParams.get('timeFilter') || 'total';
    
    let dateFilter = '';
    switch (timeFilter) {
      case 'day':
        dateFilter = "AND created_at >= NOW() - INTERVAL '1 day'";
        break;
      case 'week':
        dateFilter = "AND created_at >= NOW() - INTERVAL '1 week'";
        break;
      case 'month':
        dateFilter = "AND created_at >= NOW() - INTERVAL '1 month'";
        break;
      default:
        dateFilter = '';
    }

    // Usuários únicos registrados  
    const uniqueUsersResult = await query(`
      SELECT COUNT(DISTINCT wallet_address) as unique_users
      FROM users
      WHERE 1=1 ${dateFilter.replace('created_at', 'created_at')}
    `);

    // Total de mints
    const totalMintsResult = await query(`
      SELECT COUNT(*) as total_mints
      FROM nft_mint_log
      WHERE 1=1 ${dateFilter}
    `);

    // Mints bem-sucedidos
    const successfulMintsResult = await query(`
      SELECT COUNT(*) as successful_mints
      FROM nft_mint_log
      WHERE engine_status = 'MINTED' ${dateFilter}
    `);

    // Assets únicos mintados
    const uniqueAssetsResult = await query(`
      SELECT COUNT(DISTINCT ml.asset_id) as unique_assets
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      WHERE ml.engine_status = 'MINTED' AND a.id IS NOT NULL ${dateFilter.replace('created_at', 'ml.created_at')}
    `);

    // Usuários ativos (que fizeram mint)
    const activeUsersResult = await query(`
      SELECT COUNT(DISTINCT user_wallet_address) as active_users
      FROM nft_mint_log
      WHERE 1=1 ${dateFilter}
    `);

    // Tempo médio de mint
    const avgMintTimeResult = await query(`
      SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(minted_at, NOW()) - created_at))) as avg_mint_time
      FROM nft_mint_log
      WHERE engine_status = 'MINTED' 
        AND minted_at IS NOT NULL
        ${dateFilter}
    `);

    // Mints por dia (últimos 7 dias)
    const dailyMintsResult = await query(`
      SELECT 
        DATE(created_at) as mint_date,
        COUNT(*) as mint_count
      FROM nft_mint_log
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY mint_date DESC
      LIMIT 7
    `);

    // Taxa de sucesso
    const totalMints = parseInt(totalMintsResult.rows[0]?.total_mints || '0');
    const successfulMints = parseInt(successfulMintsResult.rows[0]?.successful_mints || '0');
    const successRate = totalMints > 0 ? (successfulMints / totalMints) * 100 : 0;

    // Usuários únicos que fizeram mint
    const uniqueUsers = parseInt(uniqueUsersResult.rows[0]?.unique_users || '0');
    const activeUsers = parseInt(activeUsersResult.rows[0]?.active_users || '0');
    const userEngagementRate = uniqueUsers > 0 ? (activeUsers / uniqueUsers) * 100 : 0;

    // Média de mints por usuário ativo
    const avgMintsPerUser = activeUsers > 0 ? totalMints / activeUsers : 0;

    const result = {
      uniqueUsers,
      totalMints,
      successfulMints,
      uniqueAssets: parseInt(uniqueAssetsResult.rows[0]?.unique_assets || '0'),
      activeUsers,
      successRate: Math.round(successRate * 100) / 100,
      userEngagementRate: Math.round(userEngagementRate * 100) / 100,
      avgMintsPerUser: Math.round(avgMintsPerUser * 100) / 100,
      avgMintTime: avgMintTimeResult.rows[0]?.avg_mint_time 
        ? Math.round(parseFloat(avgMintTimeResult.rows[0].avg_mint_time))
        : null,
      dailyMints: dailyMintsResult.rows.map(row => ({
        date: row.mint_date,
        count: parseInt(row.mint_count)
      })),
      timeFilter
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Admin Statistics Adoption API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}