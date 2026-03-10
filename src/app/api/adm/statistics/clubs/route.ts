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
        dateFilter = "AND ml.created_at >= NOW() - INTERVAL '1 day'";
        break;
      case 'week':
        dateFilter = "AND ml.created_at >= NOW() - INTERVAL '1 week'";
        break;
      case 'month':
        dateFilter = "AND ml.created_at >= NOW() - INTERVAL '1 month'";
        break;
      default:
        dateFilter = '';
    }

    // Engajamento por categoria (proxy para clubes)
    const clubEngagementResult = await query(`
      SELECT 
        c.name as club_name,
        c.image_url,
        COUNT(ml.id) as total_mints,
        COUNT(CASE WHEN ml.engine_status = 'MINTED' THEN 1 END) as successful_mints,
        COUNT(DISTINCT ml.user_wallet_address) as unique_collectors,
        COUNT(DISTINCT n.id) as unique_nfts
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.id IS NOT NULL ${dateFilter}
      GROUP BY c.id, c.name, c.image_url
      ORDER BY total_mints DESC
    `);

    // Raridade mais popular por clube
    const rarityByClubResult = await query(`
      SELECT 
        c.name as club_name,
        n.rarity,
        COUNT(ml.id) as mint_count
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE ml.engine_status = 'MINTED' AND n.id IS NOT NULL ${dateFilter}
      GROUP BY c.name, n.rarity
      ORDER BY c.name, mint_count DESC
    `);

    // Top collectors por clube - os 3 que mais têm assets daquele time específico
    const topCollectorsByClubResult = await query(`
      SELECT 
        c.name as club_name,
        ml.user_wallet_address,
        COUNT(DISTINCT a.id) as asset_count,
        COUNT(ml.id) as mint_count,
        COUNT(DISTINCT n.rarity) as unique_rarities
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE ml.engine_status = 'MINTED' AND n.id IS NOT NULL ${dateFilter}
      GROUP BY c.name, ml.user_wallet_address
      ORDER BY c.name, asset_count DESC, mint_count DESC
    `);

    // Atividade recente por clube (últimos 7 dias)
    const recentActivityResult = await query(`
      SELECT 
        c.name as club_name,
        DATE(ml.created_at) as activity_date,
        COUNT(ml.id) as daily_mints,
        COUNT(DISTINCT ml.user_wallet_address) as daily_users
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE ml.created_at >= NOW() - INTERVAL '7 days' AND n.id IS NOT NULL
      GROUP BY c.name, DATE(ml.created_at)
      ORDER BY c.name, activity_date DESC
    `);

    // Taxa de conversão por clube (mints tentados vs bem-sucedidos)
    const conversionRateByClub = clubEngagementResult.rows.map(club => ({
      ...club,
      total_mints: parseInt(club.total_mints),
      successful_mints: parseInt(club.successful_mints),
      unique_collectors: parseInt(club.unique_collectors),
      unique_nfts: parseInt(club.unique_nfts),
      conversion_rate: parseInt(club.total_mints) > 0 
        ? (parseInt(club.successful_mints) / parseInt(club.total_mints)) * 100 
        : 0
    }));

    // Agrupar raridades por clube
    const rarityData: { [key: string]: { [key: string]: number } } = {};
    rarityByClubResult.rows.forEach(row => {
      if (!rarityData[row.club_name]) {
        rarityData[row.club_name] = {};
      }
      rarityData[row.club_name][row.rarity || 'Unknown'] = parseInt(row.mint_count);
    });

    // Agrupar top collectors por clube
    const collectorsData: { [key: string]: any[] } = {};
    topCollectorsByClubResult.rows.forEach(row => {
      if (!collectorsData[row.club_name]) {
        collectorsData[row.club_name] = [];
      }
      if (collectorsData[row.club_name].length < 3) { // Top 3 por clube
        collectorsData[row.club_name].push({
          wallet: row.user_wallet_address,
          assetCount: parseInt(row.asset_count),
          mintCount: parseInt(row.mint_count),
          uniqueRarities: parseInt(row.unique_rarities)
        });
      }
    });

    // Agrupar atividade recente por clube
    const activityData: { [key: string]: any[] } = {};
    recentActivityResult.rows.forEach(row => {
      if (!activityData[row.club_name]) {
        activityData[row.club_name] = [];
      }
      activityData[row.club_name].push({
        date: row.activity_date,
        dailyMints: parseInt(row.daily_mints),
        dailyUsers: parseInt(row.daily_users)
      });
    });

    const result = {
      clubEngagement: conversionRateByClub.map(club => ({
        ...club,
        rarityDistribution: rarityData[club.club_name] || {},
        topCollectors: collectorsData[club.club_name] || [],
        recentActivity: activityData[club.club_name] || []
      })),
      summary: {
        totalClubs: conversionRateByClub.length,
        totalMints: conversionRateByClub.reduce((sum, club) => sum + club.total_mints, 0),
        totalCollectors: conversionRateByClub.reduce((sum, club) => sum + club.unique_collectors, 0),
        avgConversionRate: conversionRateByClub.length > 0 
          ? conversionRateByClub.reduce((sum, club) => sum + club.conversion_rate, 0) / conversionRateByClub.length 
          : 0
      },
      timeFilter
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Admin Statistics Clubs API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}