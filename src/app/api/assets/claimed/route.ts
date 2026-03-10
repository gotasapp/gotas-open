import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '40');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const rarity = searchParams.get('rarity') || '';

    // Build WHERE conditions using safe string building
    const whereConditions: string[] = [];

    if (search.trim()) {
      const searchPattern = `%${search.trim().toLowerCase()}%`;
      whereConditions.push(`(
        LOWER(a.title) LIKE '${searchPattern.replace(/'/g, "''")}'
        OR LOWER(a.description) LIKE '${searchPattern.replace(/'/g, "''")}'
        OR LOWER(n.name) LIKE '${searchPattern.replace(/'/g, "''")}'
        OR LOWER(c.name) LIKE '${searchPattern.replace(/'/g, "''")}'
        OR LOWER(u.username) LIKE '${searchPattern.replace(/'/g, "''")}'
        OR LOWER(u.display_name) LIKE '${searchPattern.replace(/'/g, "''")}'
      )`);
    }

    if (category.trim()) {
      whereConditions.push(`LOWER(c.name) = '${category.trim().toLowerCase().replace(/'/g, "''")}'`);
    }

    if (rarity.trim() && rarity !== 'all') {
      whereConditions.push(`LOWER(n.rarity) = '${rarity.trim().toLowerCase().replace(/'/g, "''")}'`);
    }

    const whereClause = whereConditions.length > 0 
      ? whereConditions.join(' AND ')
      : '1=1';

    let claimedAssets: any[] = [];
    let totalCount = 0;
    
    try {
      // Enhanced query to fetch claimed assets with user information who claimed them
      claimedAssets = await sql`
        SELECT 
          a.id,
          a.title,
          a.description,
          a.image_url,
          a.claimed,
          a.nft_id,
          a.created_at,
          a.updated_at,
          n.name as nft_name,
          n.category,
          n.rarity,
          n.main_image_url as nft_main_image_url,
          c.name as category_name,
          c.image_url as category_image_url,
          u.username,
          u.display_name,
          u.wallet_address as user_wallet_address,
          u.email as user_email,
          u.profile_image_url,
          uac.claimed_at,
          uac.privy_user_id,
          uac.wallet_address as claim_wallet_address
        FROM userassetclaims uac
        INNER JOIN asset a ON uac.asset_id = a.id
        LEFT JOIN users u ON (uac.privy_user_id = u.privy_user_id OR uac.wallet_address = u.wallet_address)
        LEFT JOIN nfts n ON a.nft_id = n.id
        LEFT JOIN categories c ON n.category_id = c.id
        WHERE ${sql.unsafe(whereClause)}
        ORDER BY uac.claimed_at DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as any[];
    } catch (queryError) {
      console.error('Error executing main query:', queryError);
      throw queryError;
    }

    // Get total count for pagination info with same filters
    try {
      const totalCountResult = await sql`
        SELECT COUNT(*) as total
        FROM userassetclaims uac
        INNER JOIN asset a ON uac.asset_id = a.id
        LEFT JOIN users u ON (uac.privy_user_id = u.privy_user_id OR uac.wallet_address = u.wallet_address)
        LEFT JOIN nfts n ON a.nft_id = n.id
        LEFT JOIN categories c ON n.category_id = c.id
        WHERE ${sql.unsafe(whereClause)}
      ` as any[];
      
      if (totalCountResult && totalCountResult.length > 0 && totalCountResult[0] && totalCountResult[0].total !== undefined) {
        totalCount = parseInt(String(totalCountResult[0].total)) || 0;
      } else {
        console.warn('Count query returned unexpected result:', totalCountResult);
        totalCount = claimedAssets.length;
      }
    } catch (countError) {
      console.error('Error executing count query:', countError);
      totalCount = claimedAssets.length;
    }

    // Transform the data to camelCase for frontend consistency
    const transformedAssets = claimedAssets.map((asset: any, index: number) => ({
      id: asset.id,
      claimId: `${asset.id}-${asset.user_wallet_address || asset.claim_wallet_address}-${index}`, // Unique key for React
      title: asset.title,
      description: asset.description,
      imageUrl: asset.image_url,
      claimed: asset.claimed,
      nftId: asset.nft_id,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at,
      nftName: asset.nft_name,
      category: asset.category,
      rarity: asset.rarity,
      nftMainImageUrl: asset.nft_main_image_url,
      categoryName: asset.category_name,
      categoryImageUrl: asset.category_image_url,
      claimedBy: {
        username: asset.username,
        displayName: asset.display_name,
        walletAddress: asset.user_wallet_address || asset.claim_wallet_address,
        privyUserId: asset.privy_user_id,
        email: asset.user_email,
        profileImageUrl: asset.profile_image_url
      },
      claimedAt: asset.claimed_at
    }));

    return NextResponse.json({
      data: transformedAssets,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page < Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching claimed assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claimed assets' },
      { status: 500 }
    );
  }
} 