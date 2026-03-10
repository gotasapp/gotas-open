import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '40');
    const category = searchParams.get('category');
    const rarity = searchParams.get('rarity');
    const showClaimed = searchParams.get('showClaimed') === 'true';
    
    const offset = (page - 1) * limit;

    let whereConditions = [];

    if (!showClaimed) {
      whereConditions.push("a.claimed = false");
    }

    if (category && category !== 'all') {
      whereConditions.push(`c.name = '${category.replace(/'/g, "''")}'`);
    }

    if (rarity && rarity !== 'all') {
      whereConditions.push(`a.rarity = '${rarity.replace(/'/g, "''")}'`);
    }

    const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';

    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM asset a
      LEFT JOIN nfts n ON a.nft_id = n.id
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE ${sql.unsafe(whereClause)}
    `;
    
    const total = parseInt(countResult[0].total);

    const assets = await sql`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.image_url,
        a.rarity,
        a.nft_number,
        a.nft_id,
        a.claimed,
        a.created_at,
        a.updated_at,
        n.name as nft_name,
        c.name as category_name,
        c.image_url as category_image_url,
        n.total_supply,
        n.claimed_supply
      FROM asset a
      LEFT JOIN nfts n ON a.nft_id = n.id
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE ${sql.unsafe(whereClause)}
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const hasMore = offset + limit < total;

    return NextResponse.json({
      data: assets,
      pagination: {
        page,
        limit,
        total,
        hasMore,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching assets for gallery:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
} 