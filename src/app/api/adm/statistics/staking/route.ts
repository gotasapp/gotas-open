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

    // Usuários com NFTs elegíveis para staking (estimativa)
    const eligibleStakersResult = await query(`
      SELECT 
        COUNT(DISTINCT ml.user_wallet_address) as eligible_stakers,
        COUNT(ml.id) as total_stakeable_nfts
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      WHERE ml.engine_status = 'MINTED' AND n.id IS NOT NULL ${dateFilter}
    `);

    // Distribuição por raridade de NFTs mintados (proxy para staking potential)
    const stakingPotentialByRarityResult = await query(`
      SELECT 
        n.rarity,
        COUNT(ml.id) as nft_count,
        COUNT(DISTINCT ml.user_wallet_address) as unique_holders
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      WHERE ml.engine_status = 'MINTED' AND n.id IS NOT NULL ${dateFilter}
      GROUP BY n.rarity
      ORDER BY nft_count DESC
    `);

    // Usuários com múltiplos NFTs (mais propensos a fazer staking)
    const multiNFTHoldersResult = await query(`
      SELECT 
        user_wallet_address,
        COUNT(DISTINCT ml.asset_id) as nft_count
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      WHERE ml.engine_status = 'MINTED' AND a.id IS NOT NULL ${dateFilter}
      GROUP BY user_wallet_address
      HAVING COUNT(DISTINCT ml.asset_id) > 1
      ORDER BY nft_count DESC
      LIMIT 10
    `);

    // Atividade de staking estimada por categoria
    const stakingByCategoryResult = await query(`
      SELECT 
        c.name as category_name,
        COUNT(ml.id) as nft_count,
        COUNT(DISTINCT ml.user_wallet_address) as unique_holders
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE ml.engine_status = 'MINTED' AND n.id IS NOT NULL ${dateFilter}
      GROUP BY c.name
      ORDER BY nft_count DESC
    `);

    // Estimativa de valor em staking baseado em raridade (requisitos reais de tokens)
    const rarityStakeRequirements = {
      'common': 100,
      'epic': 200,
      'legendary': 1000
    };

    let estimatedStakingValue = 0;
    stakingPotentialByRarityResult.rows.forEach(row => {
      const tokenRequirement = rarityStakeRequirements[row.rarity?.toLowerCase() as keyof typeof rarityStakeRequirements] || 100;
      estimatedStakingValue += parseInt(row.nft_count) * tokenRequirement;
    });

    // Atividade mensal estimada (baseada em mints)
    const monthlyActivityResult = await query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(DISTINCT user_wallet_address) as active_users,
        COUNT(id) as total_activity
      FROM nft_mint_log
      WHERE engine_status = 'MINTED'
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `);

    const eligibleStakers = parseInt(eligibleStakersResult.rows[0]?.eligible_stakers || '0');
    const totalStakeableNFTs = parseInt(eligibleStakersResult.rows[0]?.total_stakeable_nfts || '0');
    
    // Estimar taxa de staking (usuários com 2+ NFTs têm maior probabilidade)
    const multiHolders = multiNFTHoldersResult.rows.length;
    const estimatedStakingRate = eligibleStakers > 0 ? (multiHolders / eligibleStakers) * 100 : 0;

    const result = {
      eligibleStakers,
      totalStakeableNFTs,
      estimatedActiveStakers: multiHolders,
      estimatedStakingRate: Math.round(estimatedStakingRate * 100) / 100,
      estimatedStakingValue,
      stakingPotentialByRarity: stakingPotentialByRarityResult.rows.map(row => ({
        rarity: row.rarity || 'Unknown',
        nftCount: parseInt(row.nft_count),
        uniqueHolders: parseInt(row.unique_holders),
        tokenRequirement: rarityStakeRequirements[row.rarity?.toLowerCase() as keyof typeof rarityStakeRequirements] || 100,
        estimatedTokensNeeded: parseInt(row.nft_count) * (rarityStakeRequirements[row.rarity?.toLowerCase() as keyof typeof rarityStakeRequirements] || 100)
      })),
      topMultiHolders: multiNFTHoldersResult.rows.map(row => ({
        wallet: row.user_wallet_address,
        nftCount: parseInt(row.nft_count)
      })),
      stakingByCategory: stakingByCategoryResult.rows.map(row => ({
        category: row.category_name,
        nftCount: parseInt(row.nft_count),
        uniqueHolders: parseInt(row.unique_holders)
      })),
      monthlyActivity: monthlyActivityResult.rows.map(row => ({
        month: row.month,
        activeUsers: parseInt(row.active_users),
        totalActivity: parseInt(row.total_activity)
      })),
      timeFilter
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Admin Statistics Staking API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}