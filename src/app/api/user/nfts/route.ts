import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Buscar NFTs reais do usuário através do nft_mint_log
    const userNFTs = await sql`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.image_url,
        a.asset_data,
        a.metadata_json,
        nml.quantity_minted,
        nml.transaction_hash,
        nml.status,
        nml.created_at as claimed_at
      FROM asset a
      INNER JOIN nft_mint_log nml ON a.id = nml.asset_id
      WHERE nml.user_wallet_address = ${walletAddress}
        AND nml.status = 'completed'
      ORDER BY nml.created_at DESC
    `;

    // Processar os dados para o formato esperado pelo frontend
    const processedNFTs = userNFTs.map(nft => {
      let rarity = null;
      
      // Tentar extrair rarity do asset_data ou metadata_json
      if (nft.asset_data && typeof nft.asset_data === 'object') {
        rarity = nft.asset_data.rarity || nft.asset_data.attributes?.find((attr: any) => attr.trait_type === 'Rarity')?.value;
      }
      
      if (!rarity && nft.metadata_json) {
        try {
          const metadata = JSON.parse(nft.metadata_json);
          rarity = metadata.rarity || metadata.attributes?.find((attr: any) => attr.trait_type === 'Rarity')?.value;
        } catch (e) {
          // Ignore JSON parse errors
        }
      }

      return {
        id: nft.id,
        title: nft.title,
        description: nft.description,
        image_url: nft.image_url,
        rarity: rarity,
        claimed_at: nft.claimed_at,
        transaction_hash: nft.transaction_hash,
        quantity: nft.quantity_minted
      };
    });

    return NextResponse.json(processedNFTs);
  } catch (error) {
    console.error('Error fetching user NFTs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 