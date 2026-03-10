import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Configuração para evitar o Edge Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const exclude = searchParams.get('exclude');

    if (exclude && limit) {
      const nfts = await sql`
        SELECT 
          n.id, 
          n.token_id, 
          n.name, 
          n.description, 
          n.main_image_url, 
          n.secondary_image_url1, 
          n.secondary_image_url2, 
          n.metadata_url, 
          n.category, 
          n.category_id,
          c.name as category_name,
          c.image_url as category_image_url,
          n.rarity, 
          n.total_supply, 
          n.claimed_supply, 
          n.max_per_user, 
          n.release_date, 
          n.expiration_date, 
          n.cooldown_minutes, 
          n.stake_required, 
          n.stake_token_amount, 
          n.stake_token_symbol, 
          n.stake_token_address, 
          n.assets_to_redeem_count,
          n.show_statistics,
          n.status, 
          n.created_at, 
          n.updated_at 
        FROM nfts n
        LEFT JOIN categories c ON n.category_id = c.id
        WHERE n.status = 'active' AND n.id != ${parseInt(exclude)}
        ORDER BY n.created_at DESC
        LIMIT ${parseInt(limit)}
      `;
      return NextResponse.json({ nfts });
    }

    if (exclude) {
      const nfts = await sql`
        SELECT 
          n.id, 
          n.token_id, 
          n.name, 
          n.description, 
          n.main_image_url, 
          n.secondary_image_url1, 
          n.secondary_image_url2, 
          n.metadata_url, 
          n.category, 
          n.category_id,
          c.name as category_name,
          c.image_url as category_image_url,
          n.rarity, 
          n.total_supply, 
          n.claimed_supply, 
          n.max_per_user, 
          n.release_date, 
          n.expiration_date, 
          n.cooldown_minutes, 
          n.stake_required, 
          n.stake_token_amount, 
          n.stake_token_symbol, 
          n.stake_token_address, 
          n.assets_to_redeem_count,
          n.show_statistics,
          n.status, 
          n.created_at, 
          n.updated_at 
        FROM nfts n
        LEFT JOIN categories c ON n.category_id = c.id
        WHERE n.status = 'active' AND n.id != ${parseInt(exclude)}
        ORDER BY n.created_at DESC
      `;
      return NextResponse.json(nfts);
    }

    if (limit) {
      const nfts = await sql`
        SELECT 
          n.id, 
          n.token_id, 
          n.name, 
          n.description, 
          n.main_image_url, 
          n.secondary_image_url1, 
          n.secondary_image_url2, 
          n.metadata_url, 
          n.category, 
          n.category_id,
          c.name as category_name,
          c.image_url as category_image_url,
          n.rarity, 
          n.total_supply, 
          n.claimed_supply, 
          n.max_per_user, 
          n.release_date, 
          n.expiration_date, 
          n.cooldown_minutes, 
          n.stake_required, 
          n.stake_token_amount, 
          n.stake_token_symbol, 
          n.stake_token_address, 
          n.assets_to_redeem_count,
          n.show_statistics,
          n.status, 
          n.created_at, 
          n.updated_at 
        FROM nfts n
        LEFT JOIN categories c ON n.category_id = c.id
        WHERE n.status = 'active'
        ORDER BY n.created_at DESC
        LIMIT ${parseInt(limit)}
      `;
      return NextResponse.json({ nfts });
    }

    const nfts = await sql`
      SELECT 
        n.id, 
        n.token_id, 
        n.name, 
        n.description, 
        n.main_image_url, 
        n.secondary_image_url1, 
        n.secondary_image_url2, 
        n.metadata_url, 
        n.category, 
        n.category_id,
        c.name as category_name,
        c.image_url as category_image_url,
        n.rarity, 
        n.total_supply, 
        n.claimed_supply, 
        n.max_per_user, 
        n.release_date, 
        n.expiration_date, 
        n.cooldown_minutes, 
        n.stake_required, 
        n.stake_token_amount, 
        n.stake_token_symbol, 
        n.stake_token_address, 
        n.assets_to_redeem_count,
        n.show_statistics,
        n.status, 
        n.created_at, 
        n.updated_at 
      FROM nfts n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.status = 'active' 
      ORDER BY n.created_at DESC
    `;

    return NextResponse.json(nfts);
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFTs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tokenId,
      name,
      description,
      mainImageUrl,
      secondaryImageUrl1,
      secondaryImageUrl2,
      metadataUrl,
      category,
      rarity,
      totalSupply,
      maxPerUser,
      releaseDate,
      expirationDate,
      cooldownMinutes,
      stakeRequired,
      stakeTokenAmount,
      stakeTokenSymbol,
      stakeTokenAddress,
      assetsToRedeemCount,
      showStatistics
    } = body;

    const result = await sql`
      INSERT INTO nfts (
        token_id, 
        name, 
        description, 
        main_image_url, 
        secondary_image_url1, 
        secondary_image_url2, 
        metadata_url, 
        category, 
        rarity, 
        total_supply, 
        max_per_user, 
        release_date, 
        expiration_date, 
        cooldown_minutes, 
        stake_required, 
        stake_token_amount, 
        stake_token_symbol, 
        stake_token_address, 
        assets_to_redeem_count,
        show_statistics
      ) VALUES (
        ${tokenId}, 
        ${name}, 
        ${description}, 
        ${mainImageUrl}, 
        ${secondaryImageUrl1}, 
        ${secondaryImageUrl2}, 
        ${metadataUrl}, 
        ${category}, 
        ${rarity}, 
        ${totalSupply}, 
        ${maxPerUser}, 
        ${releaseDate || null}, 
        ${expirationDate || null}, 
        ${cooldownMinutes}, 
        ${stakeRequired}, 
        ${stakeTokenAmount}, 
        ${stakeTokenSymbol}, 
        ${stakeTokenAddress}, 
        ${assetsToRedeemCount},
        ${showStatistics}
      ) RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating NFT:', error);
    return NextResponse.json(
      { error: 'Failed to create NFT' },
      { status: 500 }
    );
  }
}