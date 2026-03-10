/**
 * API Route: Check Burn Eligibility
 *
 * POST /api/burn/check-eligibility
 *
 * Checks if a wallet address meets the minimum fan token balance requirement
 * to access the burn feature. Queries blockchain for actual token balances.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-pool';
import { createPublicClient, http } from 'viem';
import { chiliz } from '@/lib/chains';
import type { EligibilityResult, TokenBalance } from '@/utils/burn-eligibility';
import {
  checkAllFanTokenBalances,
  meetsMinimumRequirement,
  getQualifyingTokens
} from '@/utils/burn-eligibility';
import stakingABI from '@/abis/FTStakingABI.json';
import { isFanToken } from '@/lib/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RequestBody {
  walletAddress: string;
}

interface StakingToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon_url?: string;
  is_active: boolean;
}

/**
 * Helper function to retry database queries on connection errors
 */
async function queryWithRetry<T = any>(
  text: string,
  params: any[],
  maxRetries = 2
): Promise<{ rows: T[]; rowCount: number | null }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await query(text, params);
    } catch (error) {
      lastError = error as Error;
      const isConnectionError =
        error instanceof Error &&
        (error.message.includes('Connection terminated') ||
         error.message.includes('timeout'));

      // Only retry on connection errors and if we have attempts left
      if (isConnectionError && attempt < maxRetries) {
        console.log(`Query failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * POST handler to check burn eligibility
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: RequestBody = await request.json();
    const { walletAddress } = body;

    // Validate wallet address
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Check if wallet address is valid format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // 1. Get burn configuration from database (with retry)
    const configResult = await queryWithRetry(
      `SELECT setting_key, setting_value, setting_type
       FROM burn_global_settings
       WHERE setting_key IN ('burn_feature_enabled', 'minimum_fantoken_balance')`,
      []
    );

    const config = configResult.rows.reduce((acc: any, row: any) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});

    // Check if burn feature is enabled
    if (config.burn_feature_enabled !== 'true') {
      return NextResponse.json<EligibilityResult>({
        eligible: false,
        reason: 'Burn feature is currently disabled',
        tokenBalances: [],
        minimumRequired: 0,
        qualifyingTokens: []
      });
    }

    // Get minimum required balance
    const minimumRequired = parseInt(config.minimum_fantoken_balance || '1');

    // 2. Get all active fan tokens from database (with retry)
    const tokensResult = await queryWithRetry(
      `SELECT symbol, name, address, decimals, icon_url
       FROM public.staking_tokens
       WHERE is_active = TRUE
       AND address IS NOT NULL
       AND address != ''
       AND UPPER(symbol) != 'CHZ'
       ORDER BY symbol ASC`,
      []
    );

    const fanTokens = tokensResult.rows as StakingToken[];

    if (fanTokens.length === 0) {
      return NextResponse.json<EligibilityResult>({
        eligible: false,
        reason: 'No fan tokens configured',
        tokenBalances: [],
        minimumRequired,
        qualifyingTokens: []
      });
    }

    // 3. Create public client for blockchain queries
    // Usar EXATAMENTE a mesma configuração que funciona na página de Stake
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://rpc.chiliz.com';
    const stakingContractAddress = process.env.NEXT_PUBLIC_STAKE_CONTRACT;
    
    if (!rpcUrl || !stakingContractAddress) {
      console.error('[ELIGIBILITY API] Configuração RPC ou contrato de stake ausente');
      return NextResponse.json<EligibilityResult>({
        eligible: false,
        reason: 'Configuração de staking não disponível',
        tokenBalances: [],
        minimumRequired,
        qualifyingTokens: []
      });
    }

    const client = createPublicClient({
      chain: chiliz,
      transport: http(rpcUrl)
    });
    
    console.log(`[ELIGIBILITY API] Wallet: ${walletAddress}`);
    console.log(`[ELIGIBILITY API] Staking Contract: ${stakingContractAddress}`);
    console.log(`[ELIGIBILITY API] RPC URL: ${rpcUrl}`);
    console.log(`[ELIGIBILITY API] Fan Tokens to check: ${fanTokens.length}`);

    // 4. Check STAKED balances for all fan tokens
    // IMPORTANTE: Usar EXATAMENTE a mesma lógica que funciona na página de Stake (nft-requirements-tab.tsx linhas 100-124)
    const tokenBalances: TokenBalance[] = [];

    for (const token of fanTokens) {
      try {
        console.log(`[ELIGIBILITY] Verificando ${token.symbol} (${token.address})...`);
        
        // EXATAMENTE a mesma chamada que funciona na página de Stake
        const stakeData = await client.readContract({
          address: stakingContractAddress as `0x${string}`,
          abi: stakingABI,
          functionName: 'getStakeData',
          args: [walletAddress as `0x${string}`, token.address as `0x${string}`, false]
        });

        console.log(`[ELIGIBILITY] stakeData para ${token.symbol}:`, JSON.stringify(stakeData, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ));

        // EXATAMENTE a mesma verificação que funciona na página de Stake (linha 109)
        if (stakeData && (stakeData as {totalStake?: bigint}).totalStake) {
          // Verificar se é fan token para determinar decimais (mesma lógica - linha 111)
          const isFan = isFanToken({ 
            id: '', 
            symbol: token.symbol, 
            name: token.name, 
            description: '', 
            address: token.address 
          });
          const decimals = isFan ? 0 : 18;
          const divisor = 10 ** decimals;
          const totalStake = Number((stakeData as {totalStake: bigint}).totalStake) / divisor;
          
          console.log(`[ELIGIBILITY] ✅ ${token.symbol}: ${totalStake} tokens em stake (raw: ${(stakeData as {totalStake: bigint}).totalStake.toString()})`);
          
          tokenBalances.push({
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            balance: (stakeData as {totalStake: bigint}).totalStake.toString(),
            formattedBalance: totalStake.toString(),
            decimals,
            icon_url: token.icon_url
          });
        } else {
          console.log(`[ELIGIBILITY] ⚠️ ${token.symbol}: Sem stake`);
          tokenBalances.push({
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            balance: '0',
            formattedBalance: '0',
            decimals: token.decimals ?? 0,
            icon_url: token.icon_url
          });
        }
      } catch (err) {
        console.error(`[ELIGIBILITY] Erro ao buscar stake para ${token.symbol}:`, err);
        tokenBalances.push({
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          balance: '0',
          formattedBalance: '0',
          decimals: token.decimals ?? 0,
          icon_url: token.icon_url
        });
      }
    }

    // 5. Check if user meets minimum requirement
    const eligible = meetsMinimumRequirement(tokenBalances, minimumRequired);
    const qualifyingTokens = getQualifyingTokens(tokenBalances, minimumRequired);

    // 6. Build result
    const result: EligibilityResult = {
      eligible,
      reason: eligible
        ? `Você possui ${minimumRequired}+ tokens em stake: ${qualifyingTokens.map(t => t.symbol).join(', ')}`
        : `Você precisa ter pelo menos ${minimumRequired} tokens de qualquer clube brasileiro em stake para queimar Cards`,
      tokenBalances,
      minimumRequired,
      qualifyingTokens
    };

    return NextResponse.json<EligibilityResult>(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });

  } catch (error) {
    console.error('Error in check-eligibility API:', error);

    return NextResponse.json(
      {
        error: 'Internal server error checking eligibility',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - return API info
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/burn/check-eligibility',
    method: 'POST',
    description: 'Check if wallet address meets minimum fan token balance requirement for burn feature',
    body: {
      walletAddress: 'string (0x...)'
    },
    response: {
      eligible: 'boolean',
      reason: 'string',
      tokenBalances: 'TokenBalance[]',
      minimumRequired: 'number',
      qualifyingTokens: 'TokenBalance[]'
    }
  });
}
