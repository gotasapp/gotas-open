import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API - Fetching NFTs with owners');

    // Enhanced query to fetch NFTs with their owners and better category support
    const nftsWithOwners = await sql`
      SELECT 
        n.id,
        n.name as title,
        n.description,
        n.category,
        n.rarity,
        n.total_supply,
        n.claimed_supply,
        n.max_per_user,
        n.release_date,
        n.expiration_date,
        n.cooldown_minutes,
        n.main_image_url,
        n.secondary_image_url1,
        n.secondary_image_url2,
        n.status,
        n.created_at,
        n.updated_at,
        n.stake_required,
        n.stake_token_address,
        n.stake_token_amount,
        n.stake_token_symbol,
        n.assets_to_redeem_count,
        c.name as category_name,
        c.image_url as category_image_url,
        COALESCE(
          JSON_AGG(
            CASE 
              WHEN u.id IS NOT NULL THEN
                JSON_BUILD_OBJECT(
                  'id', u.id,
                  'username', u.username,
                  'display_name', u.display_name,
                  'profile_image_url', u.profile_image_url,
                  'wallet_address', u.wallet_address,
                  'claimed_at', uac.claimed_at
                )
              ELSE NULL
            END
          ) FILTER (WHERE u.id IS NOT NULL), 
          '[]'::json
        ) as owners,
        COUNT(DISTINCT u.id) as total_owners
      FROM nfts n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN userassetclaims uac ON n.id = uac.nft_id
      LEFT JOIN users u ON uac.user_id = u.id
      WHERE n.status = 'active'
      GROUP BY 
        n.id, n.name, n.description, n.category, n.rarity, n.total_supply, 
        n.claimed_supply, n.max_per_user, n.release_date, n.expiration_date, 
        n.cooldown_minutes, n.main_image_url, n.secondary_image_url1, 
        n.secondary_image_url2, n.status, n.created_at, n.updated_at,
        n.stake_required, n.stake_token_address, n.stake_token_amount, 
        n.stake_token_symbol, n.assets_to_redeem_count, c.name, c.image_url
      ORDER BY n.created_at DESC
    `;

    // Process the data for the expected format
    const processedNFTs = nftsWithOwners.map((nft: any) => ({
      id: nft.id,
      title: nft.title,
      description: nft.description,
      category: nft.category,
      categoryName: nft.category_name,
      categoryImageUrl: nft.category_image_url,
      rarity: nft.rarity,
      totalSupply: nft.total_supply,
      claimedSupply: nft.claimed_supply,
      maxPerUser: nft.max_per_user,
      releaseDate: nft.release_date ? new Date(nft.release_date) : null,
      expirationDate: nft.expiration_date ? new Date(nft.expiration_date) : null,
      cooldownMinutes: nft.cooldown_minutes,
      mainImageUrl: nft.main_image_url,
      secondaryImageUrl1: nft.secondary_image_url1,
      secondaryImageUrl2: nft.secondary_image_url2,
      status: nft.status,
      createdAt: new Date(nft.created_at),
      updatedAt: new Date(nft.updated_at),
      stakeRequired: nft.stake_required,
      stakeTokenAddress: nft.stake_token_address,
      stakeTokenAmount: nft.stake_token_amount,
      stakeTokenSymbol: nft.stake_token_symbol,
      assetsToRedeemCount: nft.assets_to_redeem_count,
      owners: Array.isArray(nft.owners) ? nft.owners.filter((owner: any) => owner !== null) : [],
      totalOwners: parseInt(nft.total_owners) || 0,
      // Additional computed fields for better UX
      isAvailable: nft.claimed_supply < nft.total_supply,
      isSoldOut: nft.claimed_supply >= nft.total_supply,
      supplyPercentage: nft.total_supply > 0 ? Math.round((nft.claimed_supply / nft.total_supply) * 100) : 0,
      remainingSupply: Math.max(0, nft.total_supply - nft.claimed_supply)
    }));

    console.log(`✅ API - Found ${processedNFTs.length} NFTs with owners`);

    return NextResponse.json(processedNFTs);
  } catch (error) {
    console.error('❌ API Error fetching NFTs with owners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFTs with owners' },
      { status: 500 }
    );
  }
} 