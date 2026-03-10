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

    // Distribuição por raridade
    const rarityDistributionResult = await query(`
      SELECT 
        n.rarity,
        COUNT(ml.id) as mint_count,
        COUNT(DISTINCT ml.user_wallet_address) as unique_owners
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      WHERE ml.engine_status = 'MINTED' AND n.id IS NOT NULL ${dateFilter}
      GROUP BY n.rarity
      ORDER BY mint_count DESC
    `);

    // Mapeamento de categorias para nomes completos dos clubes
    const categoryClubMapping: Record<string, string> = {
      'MENGO': 'CR Flamengo',
      'SPFC': 'São Paulo FC',
      'SCCP': 'SC Corinthians Paulista',
      'VERDAO': 'SE Palmeiras',
      'SACI': 'Santos FC',
      'VASCO': 'CR Vasco da Gama'
    };

    // Distribuição por categoria
    const categoryDistributionResult = await query(`
      SELECT 
        c.name as category_name,
        COUNT(ml.id) as mint_count,
        COUNT(DISTINCT ml.user_wallet_address) as unique_owners
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE ml.engine_status = 'MINTED' AND n.id IS NOT NULL ${dateFilter}
      GROUP BY c.name
      ORDER BY mint_count DESC
    `);

    // Top NFTs mais mintados - usando dados da tabela nfts
    const topNFTsResult = await query(`
      SELECT 
        n.id,
        n.name as nft_name,
        n.rarity,
        c.name as category_name,
        n.total_supply,
        n.claimed_supply,
        COUNT(ml.id) as mint_count,
        COUNT(DISTINCT ml.user_wallet_address) as unique_owners
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE ml.engine_status = 'MINTED' AND n.id IS NOT NULL ${dateFilter}
      GROUP BY n.id, n.name, n.rarity, c.name, n.total_supply, n.claimed_supply
      ORDER BY mint_count DESC
      LIMIT 10
    `);

    // Distribuição por supply (NFTs disponíveis vs esgotados)
    const supplyDistributionResult = await query(`
      SELECT 
        'Esgotado' as status,
        COUNT(*) as nft_count
      FROM nfts n
      WHERE n.total_supply <= n.claimed_supply
      UNION ALL
      SELECT 
        'Disponível' as status,
        COUNT(*) as nft_count
      FROM nfts n
      WHERE n.total_supply > n.claimed_supply
    `);

    // Calcular totais para porcentagens
    const totalMints = rarityDistributionResult.rows.reduce((sum, row) => sum + parseInt(row.mint_count), 0);
    const totalCategoryMints = categoryDistributionResult.rows.reduce((sum, row) => sum + parseInt(row.mint_count), 0);

    const result = {
      rarityDistribution: rarityDistributionResult.rows.map(row => ({
        rarity: row.rarity || 'Unknown',
        mintCount: parseInt(row.mint_count),
        uniqueOwners: parseInt(row.unique_owners),
        percentage: totalMints > 0 ? (parseInt(row.mint_count) / totalMints) * 100 : 0
      })),
      categoryDistribution: categoryDistributionResult.rows.map(row => ({
        category: categoryClubMapping[row.category_name] || row.category_name,
        originalCategory: row.category_name,
        mintCount: parseInt(row.mint_count),
        uniqueOwners: parseInt(row.unique_owners),
        percentage: totalCategoryMints > 0 ? (parseInt(row.mint_count) / totalCategoryMints) * 100 : 0
      })),
      topNFTs: topNFTsResult.rows.map(row => ({
        id: row.id,
        name: row.nft_name,
        rarity: row.rarity,
        category: categoryClubMapping[row.category_name] || row.category_name,
        originalCategory: row.category_name,
        totalSupply: parseInt(row.total_supply),
        claimedSupply: parseInt(row.claimed_supply),
        mintCount: parseInt(row.mint_count),
        uniqueOwners: parseInt(row.unique_owners),
        availabilityPercentage: parseInt(row.total_supply) > 0 ? 
          ((parseInt(row.total_supply) - parseInt(row.claimed_supply)) / parseInt(row.total_supply)) * 100 : 0
      })),
      supplyDistribution: supplyDistributionResult.rows.map(row => ({
        status: row.status,
        count: parseInt(row.nft_count)
      })),
      timeFilter
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Admin Statistics Distribution API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}