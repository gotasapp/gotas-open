import { NextRequest, NextResponse } from 'next/server';
import { markCardsAsBurnedByTokenIds } from '@/lib/burn-rewards-db';

export const runtime = 'nodejs';

interface BurnSyncRequest {
  walletAddress?: string;
  privyUserId?: string | null;
  tokenIds?: Array<string | number>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BurnSyncRequest;
    const walletAddress = body.walletAddress?.trim();
    const tokenIds = Array.isArray(body.tokenIds) ? body.tokenIds : [];

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress é obrigatório' },
        { status: 400 }
      );
    }

    if (tokenIds.length === 0) {
      return NextResponse.json(
        { error: 'tokenIds deve ser um array não vazio' },
        { status: 400 }
      );
    }

    const burnedIds = await markCardsAsBurnedByTokenIds(walletAddress, tokenIds);

    if (burnedIds.length === 0) {
      return NextResponse.json(
        {
          message: 'Nenhum card foi atualizado. Verifique se os tokens pertencem a esta wallet.',
          burnedCardIds: burnedIds,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Status dos cards atualizado com sucesso.',
      burnedCardIds: burnedIds,
    });
  } catch (error) {
    console.error('Erro ao sincronizar queima de cards:', error);
    return NextResponse.json(
      { error: 'Falha ao atualizar status dos cards queimados.' },
      { status: 500 }
    );
  }
}
