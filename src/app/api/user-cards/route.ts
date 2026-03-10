import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL não está definida. Configure as variáveis de ambiente.');
  // Em um ambiente de produção real, você pode querer lançar um erro ou ter um fallback.
}

const pool = new Pool({
  connectionString,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const privyUserId = searchParams.get('privyUserId');

  if (!privyUserId) {
    return NextResponse.json({ error: 'privyUserId é obrigatório' }, { status: 400 });
  }

  let client;
  try {
    client = await pool.connect();
    const query = `
      SELECT
        uac.id as user_asset_claim_id,
        uac.claimed_at,
        a.id as asset_id,
        a.title as asset_title,
        a.description as asset_description,
        a.image_url as asset_image_url,
        a.asset_data,
        n.id as nft_id,
        n.name as nft_name,
        n.description as nft_description,
        n.main_image_url as nft_main_image_url,
        n.category as nft_category,
        n.rarity as nft_rarity
      FROM
        userassetclaims uac
      JOIN
        asset a ON uac.asset_id = a.id
      JOIN
        nfts n ON uac.nft_id = n.id
      WHERE
        uac.privy_user_id = $1
        AND uac.burned_at IS NULL
      ORDER BY
        uac.claimed_at DESC;
    `;
    const result = await client.query(query, [privyUserId]);
    return NextResponse.json(result.rows, { status: 200 });
  } catch (dbError: any) {
    console.error('Erro ao buscar cards do usuário no banco de dados:', dbError);
    return NextResponse.json(
      { error: 'Falha ao buscar cards do usuário', details: dbError.message || dbError },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
} 