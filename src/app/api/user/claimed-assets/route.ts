import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const walletAddress = searchParams.get('wallet');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '40');
    const offset = (page - 1) * limit;

    if (!username && !walletAddress) {
      return NextResponse.json(
        { error: 'Username or wallet address is required' },
        { status: 400 }
      );
    }

    // Query to fetch claimed assets by user with pagination
    let claimedAssets;
    let totalCountResult;
    
    if (username) {
      claimedAssets = await sql`
        SELECT 
          uac.id as user_asset_claim_id,
          uac.burned_at,
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
          u.profile_image_url,
          uac.claimed_at,
          uac.privy_user_id,
          (
            SELECT token_id::text
            FROM nft_mint_log nml
            WHERE nml.asset_id = a.id
              AND LOWER(COALESCE(nml.user_wallet_address, u.wallet_address)) = LOWER(u.wallet_address)
            ORDER BY nml.minted_at DESC NULLS LAST, nml.created_at DESC
            LIMIT 1
          ) as blockchain_token_id
        FROM userassetclaims uac
        INNER JOIN asset a ON uac.asset_id = a.id
        INNER JOIN users u ON uac.user_id = u.id
        LEFT JOIN nfts n ON a.nft_id = n.id
        LEFT JOIN categories c ON n.category_id = c.id
        WHERE u.username = ${username}
        ORDER BY uac.claimed_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      totalCountResult = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE uac.burned_at IS NULL) as active_total,
          COUNT(*) FILTER (WHERE uac.burned_at IS NOT NULL) as burned_total
        FROM userassetclaims uac
        INNER JOIN users u ON uac.user_id = u.id
        WHERE u.username = ${username}
      `;
    } else {
      claimedAssets = await sql`
        SELECT 
          uac.id as user_asset_claim_id,
          uac.burned_at,
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
          u.profile_image_url,
          uac.claimed_at,
          uac.privy_user_id,
          (
            SELECT token_id::text
            FROM nft_mint_log nml
            WHERE nml.asset_id = a.id
              AND LOWER(COALESCE(nml.user_wallet_address, u.wallet_address)) = LOWER(u.wallet_address)
            ORDER BY nml.minted_at DESC NULLS LAST, nml.created_at DESC
            LIMIT 1
          ) as blockchain_token_id
        FROM userassetclaims uac
        INNER JOIN asset a ON uac.asset_id = a.id
        INNER JOIN users u ON uac.user_id = u.id
        LEFT JOIN nfts n ON a.nft_id = n.id
        LEFT JOIN categories c ON n.category_id = c.id
        WHERE u.wallet_address = ${walletAddress}
        ORDER BY uac.claimed_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      totalCountResult = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE uac.burned_at IS NULL) as active_total,
          COUNT(*) FILTER (WHERE uac.burned_at IS NOT NULL) as burned_total
        FROM userassetclaims uac
        INNER JOIN users u ON uac.user_id = u.id
        WHERE u.wallet_address = ${walletAddress}
      `;
    }
    
    const totalCount = parseInt(totalCountResult[0]?.total || '0');

    // Transform the data to camelCase for frontend consistency
    const transformedAssets = claimedAssets.map((asset: any, index: number) => ({
      id: asset.id,
      claimId: asset.user_asset_claim_id || `${asset.id}-${asset.user_wallet_address}-${index}`,
      userAssetClaimId: asset.user_asset_claim_id,
      burnedAt: asset.burned_at,
      isBurned: !!asset.burned_at,
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
        walletAddress: asset.user_wallet_address,
        privyUserId: asset.privy_user_id,
        profileImageUrl: asset.profile_image_url
      },
      claimedAt: asset.claimed_at,
      blockchainTokenId: asset.blockchain_token_id
    }));

    return NextResponse.json({
      data: transformedAssets,
      pagination: {
        page,
        limit,
        total: totalCount,
        activeTotal: parseInt(totalCountResult[0]?.active_total || '0'),
        burnedTotal: parseInt(totalCountResult[0]?.burned_total || '0'),
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page < Math.ceil(totalCount / limit)
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching user claimed assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user claimed assets' },
      { status: 500 }
    );
  }
} 
