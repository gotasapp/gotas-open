import { NextRequest, NextResponse } from 'next/server';
import { makeBrlaRequest } from '@/lib/brla-auth';
import { query } from '@/lib/db-pool';
import { pixSchema } from '@/lib/validation-schemas';
import { handleApiError, errorResponse } from '@/lib/error-handler';

// Tokens suportados nativamente pela BRLA
const BRLA_SUPPORTED_TOKENS = ['CHZ', 'BRLA', 'USDC', 'USDT', 'ETH', 'GLMR', 'MATIC'];

// Cache para fan tokens (atualizado a cada requisição)
let fanTokensCache: string[] = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

async function getFanTokens(): Promise<string[]> {
  const now = Date.now();
  
  // Se o cache ainda é válido, usar ele
  if (fanTokensCache.length > 0 && (now - lastCacheUpdate) < CACHE_DURATION) {
    return fanTokensCache;
  }
  
  try {
    const result = await query<{ symbol: string }>(`
      SELECT symbol 
      FROM staking_tokens 
      WHERE is_fan_token = true 
        AND is_active = true 
        AND is_available_for_purchase = true
    `);
    
    fanTokensCache = result.rows.map(token => token.symbol);
    lastCacheUpdate = now;
    
    return fanTokensCache;
  } catch (error) {
    console.error('Erro ao buscar fan tokens:', error);
    // Fallback para lista estática em caso de erro
    return ['FLU', 'MENGO', 'SACI', 'SPFC', 'VASCO', 'VERDAO'];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar entrada com Zod
    const validation = pixSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const { 
      taxId, 
      amount,
      token,
      receiverAddress,
      markup,
      markupAddress,
      externalId,
      quoteToken
    } = validation.data;

    if (!taxId || !amount || !receiverAddress) {
      return NextResponse.json(
        { error: 'Tax ID, amount e endereço do destinatário são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar fan tokens dinamicamente
    const fanTokens = await getFanTokens();

    // Verificar se é um fan token ou token suportado
    const isFanToken = fanTokens.includes(token);
    const isTokenSupported = BRLA_SUPPORTED_TOKENS.includes(token) || isFanToken;
    const apiToken = isTokenSupported ? token : 'CHZ';

    // Para fan tokens, verificar se temos o token da cotação
    if (isFanToken && !quoteToken) {
      return errorResponse('Token da cotação é obrigatório para fan tokens', 400);
    }

    // Garantir que externalId seja alfanumérico
    const cleanExternalId = externalId ? externalId.replace(/[^a-zA-Z0-9]/g, '') : `order${Date.now()}`;

    const requestBody: any = {
      token: apiToken,
      receiverAddress,
      amount: amount,
      externalId: cleanExternalId,
    };

    // Para fan tokens, substituir o token pelo quoteToken
    if (isFanToken && quoteToken) {
      requestBody.token = quoteToken;
    }

    // Para fan tokens, usar o mesmo endereço do receiver como markupAddress
    if (isFanToken) {
      requestBody.markup = markup || '0.04';
      requestBody.markupAddress = receiverAddress; // Usar o mesmo endereço do receiver
    } else {
      // Para tokens normais, adicionar markup apenas se fornecido
      if (markup && markupAddress) {
        requestBody.markup = markup;
        requestBody.markupAddress = markupAddress;
      }
    }

    // Construir URL simples
    const url = `/buy/pix-to-token?taxId=${taxId}`;

    const response = await makeBrlaRequest(url, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na criação do PIX:', response.status, errorText);
      return NextResponse.json(
        { error: 'Erro ao criar ordem PIX', details: errorText },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);
    
    // Se não é suportado, adicionar informações de simulação
    if (!isTokenSupported) {
      data.originalToken = token;
      data.simulatedToken = true;
      data.baseToken = 'CHZ';
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    return handleApiError(error);
  }
} 