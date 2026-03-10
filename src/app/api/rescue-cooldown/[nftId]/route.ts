import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL não está definida. Configure as variáveis de ambiente.');
}

const pool = new Pool({
  connectionString,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nftId: string }> }
) {
  let client;
  
  try {
    const { nftId } = await params;
    const { searchParams } = new URL(request.url);
    const privyUserId = searchParams.get('privyUserId');
    
    if (!privyUserId) {
      return NextResponse.json(
        { error: 'privyUserId é obrigatório' },
        { status: 400 }
      );
    }

    client = await pool.connect();
    
    // Buscar dados do NFT
    const nftDetailsQuery = 'SELECT cooldown_minutes FROM nfts WHERE id = $1';
    const nftDetailsResult = await client.query(nftDetailsQuery, [nftId]);

    if (nftDetailsResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'NFT não encontrado' },
        { status: 404 }
      );
    }

    const nftData = nftDetailsResult.rows[0];
    const cooldownMinutes = nftData.cooldown_minutes;

    // Se não há cooldown, o resgate está sempre disponível
    if (cooldownMinutes === 0) {
      return NextResponse.json({
        canRescue: true,
        cooldownActive: false,
        remainingSeconds: 0,
        message: 'Resgate disponível'
      });
    }

    // Verificar último claim do usuário
    const lastClaimQuery = `
      SELECT MAX(claimed_at) as last_claimed_at
      FROM userassetclaims
      WHERE privy_user_id = $1 AND nft_id = $2
    `;
    const lastClaimResult = await client.query(lastClaimQuery, [privyUserId, nftId]);
    const lastClaimedAt = lastClaimResult.rows[0]?.last_claimed_at;

    if (!lastClaimedAt) {
      // Nunca resgatou, pode resgatar
      return NextResponse.json({
        canRescue: true,
        cooldownActive: false,
        remainingSeconds: 0,
        message: 'Resgate disponível'
      });
    }

    // Calcular tempo de cooldown - mesma lógica do claim-asset route
    const cooldownEndTime = new Date(new Date(lastClaimedAt).getTime() + cooldownMinutes * 60 * 1000);
    
    if (new Date() < cooldownEndTime) {
      // Ainda em cooldown
      const remainingTime = Math.ceil((cooldownEndTime.getTime() - new Date().getTime()) / 1000);
      return NextResponse.json({
        canRescue: false,
        cooldownActive: true,
        remainingSeconds: remainingTime,
        cooldownEndsAt: cooldownEndTime.toISOString(),
        message: `Próximo resgate disponível em ${Math.ceil(remainingTime / 60)} minutos`
      });
    }

    // Cooldown expirou, pode resgatar
    return NextResponse.json({
      canRescue: true,
      cooldownActive: false,
      remainingSeconds: 0,
      message: 'Resgate disponível'
    });

  } catch (error: any) {
    console.error('Erro ao verificar cooldown do resgate:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}