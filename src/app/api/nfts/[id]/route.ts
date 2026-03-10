import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Configuração para evitar o Edge Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sql = neon(process.env.DATABASE_URL!);

// Função auxiliar para validar ID
const validateId = (id: string | undefined): number | null => {
  if (id === undefined || id === null || isNaN(Number(id))) {
    return null;
  }
  return Number(id);
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await sql`
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
      WHERE n.id = ${id}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'NFT not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching NFT:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFT' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      showStatistics,
      status
    } = body;

    const result = await sql`
      UPDATE nfts SET
        token_id = ${tokenId},
        name = ${name},
        description = ${description},
        main_image_url = ${mainImageUrl},
        secondary_image_url1 = ${secondaryImageUrl1},
        secondary_image_url2 = ${secondaryImageUrl2},
        metadata_url = ${metadataUrl},
        category = ${category},
        rarity = ${rarity},
        total_supply = ${totalSupply},
        max_per_user = ${maxPerUser},
        release_date = ${releaseDate || null},
        expiration_date = ${expirationDate || null},
        cooldown_minutes = ${cooldownMinutes},
        stake_required = ${stakeRequired},
        stake_token_amount = ${stakeTokenAmount},
        stake_token_symbol = ${stakeTokenSymbol},
        stake_token_address = ${stakeTokenAddress},
        assets_to_redeem_count = ${assetsToRedeemCount},
        show_statistics = ${showStatistics},
        status = ${status},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'NFT not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating NFT:', error);
    return NextResponse.json(
      { error: 'Failed to update NFT' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await sql`
      DELETE FROM nfts 
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'NFT not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'NFT deleted successfully' });
  } catch (error) {
    console.error('Error deleting NFT:', error);
    return NextResponse.json(
      { error: 'Failed to delete NFT' },
      { status: 500 }
    );
  }
}