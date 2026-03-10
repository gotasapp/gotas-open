import { NextRequest, NextResponse } from 'next/server';
import { makeBrlaRequest } from '@/lib/brla-auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

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
    const tokens = await sql`
      SELECT symbol 
      FROM staking_tokens 
      WHERE is_fan_token = true 
        AND is_active = true 
        AND is_available_for_purchase = true
    `;
    
    fanTokensCache = tokens.map((token: any) => token.symbol);
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
    const { amount, token, outputCoin, chain = 'Chiliz', mode, walletAddress } = body;

    // Aceitar tanto 'token' quanto 'outputCoin' para compatibilidade
    const requestedToken = token || outputCoin || 'CHZ';

    if (!amount) {
      return NextResponse.json(
        { error: 'Amount é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar fan tokens dinamicamente
    const fanTokens = await getFanTokens();
    
    // Verificar se é um fan token ou token suportado
    const isFanToken = fanTokens.includes(requestedToken);
    const isTokenSupported = BRLA_SUPPORTED_TOKENS.includes(requestedToken) || isFanToken;
    const apiToken = isTokenSupported ? requestedToken : 'CHZ';

    // Para fan tokens, usar fixOutput=true e ajustar amount
    const fixOutput = isFanToken ? 'true' : 'false';
    
    // Ajustar amount baseado no tipo de token e modo
    let apiAmount = amount;
    if (isFanToken) {
      if (mode === 'token') {
        // Modo token: usuário quer X tokens, API espera múltiplos de 100
        // Para fan tokens, a API trabalha com múltiplos de 100
        // Se o usuário quer 500 tokens, enviar 50000 (500 * 100)
        apiAmount = Math.max(100, Math.round(amount) * 100);
      } else {
        // Modo real: amount já está em centavos, usar diretamente
        // Garantir que seja múltiplo de 100 centavos (R$ 1,00)
        apiAmount = Math.max(1000, Math.round(amount / 100) * 100);
      }
    }

    // Parâmetros corretos baseados na documentação
    const params = new URLSearchParams({
      operation: 'pix-to-token',
      amount: apiAmount.toString(),
      chain: chain,
      fixOutput: fixOutput,
      inputCoin: 'BRLA',
      outputCoin: apiToken,
      markup: '0.04'
    });

    console.log(`Cotação para ${apiToken}, amount: ${amount} -> ${apiAmount}, fixOutput: ${fixOutput}, isFanToken: ${isFanToken}`);

    // Usar GET com query parameters
    const response = await makeBrlaRequest(`/fast-quote?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na cotação BRLA:', response.status, errorText);
      return NextResponse.json(
        { error: 'Erro ao obter cotação', details: errorText },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);
    
    // Adicionar informações sobre o processamento
    data.originalAmount = amount;
    data.processedAmount = apiAmount;
    data.isFanToken = isFanToken;
    
    // Se não é suportado, modificar a resposta para mostrar o token solicitado
    if (!isTokenSupported) {
      data.outputCoin = requestedToken;
      data.simulatedToken = true;
      data.baseToken = 'CHZ';
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro na cotação rápida:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 