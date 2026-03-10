/**
 * Burn Eligibility Utility Functions
 *
 * Functions to check if a user meets the minimum fan token balance requirement
 * to access the burn feature. Uses blockchain queries to verify token balances.
 */

import { getTokenDecimals } from '@/lib/tokens';

export interface TokenBalance {
  symbol: string;
  name: string;
  address: string;
  balance: string; // Raw balance as string
  formattedBalance: string; // Human-readable formatted balance
  decimals: number;
  icon_url?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  tokenBalances: TokenBalance[];
  minimumRequired: number;
  qualifyingTokens: TokenBalance[]; // Tokens that meet the minimum
}

/**
 * Check the balance of a single fan token for a wallet address
 *
 * @param walletAddress - The wallet address to check
 * @param tokenAddress - The token contract address
 * @param provider - EIP1193 provider (from wallet)
 * @param decimals - Number of decimals for the token (default: 0 for fan tokens)
 * @returns Raw balance as BigInt
 */
export async function checkFanTokenBalance(
  walletAddress: string,
  tokenAddress: string,
  provider: any,
  decimals: number = 0
): Promise<bigint> {
  try {
    // ERC-20 balanceOf function call
    // Function signature: balanceOf(address) -> uint256
    const data = `0x70a08231000000000000000000000000${walletAddress.slice(2)}`;

    const balanceHex = await provider.request({
      method: 'eth_call',
      params: [
        {
          to: tokenAddress,
          data: data
        },
        'latest'
      ]
    });

    return BigInt(balanceHex);
  } catch (error) {
    console.error(`Error checking balance for token ${tokenAddress}:`, error);
    return BigInt(0);
  }
}

/**
 * Check balances of all fan tokens for a wallet address
 *
 * @param walletAddress - The wallet address to check
 * @param tokens - Array of token objects with address, symbol, name, etc.
 * @param provider - EIP1193 provider (from wallet)
 * @returns Array of TokenBalance objects
 */
export async function checkAllFanTokenBalances(
  walletAddress: string,
  tokens: Array<{
    symbol: string;
    name: string;
    address: string;
    decimals?: number;
    icon_url?: string;
  }>,
  provider: any
): Promise<TokenBalance[]> {
  // Query all tokens in parallel for better performance
  const balancePromises = tokens.map(async (token) => {
    const correctDecimals = token.decimals ?? 0;
    const rawBalance = await checkFanTokenBalance(
      walletAddress,
      token.address,
      provider,
      correctDecimals
    );

    // Convert to number for formatting
    const balanceNumber = Number(rawBalance) / (10 ** correctDecimals);

    // Format based on decimals
    const formattedBalance = correctDecimals === 0
      ? balanceNumber.toString()
      : balanceNumber.toLocaleString('pt-BR', { maximumFractionDigits: 4 });

    return {
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      balance: rawBalance.toString(),
      formattedBalance,
      decimals: correctDecimals,
      icon_url: token.icon_url
    };
  });

  return Promise.all(balancePromises);
}

/**
 * Check if user meets the minimum fan token balance requirement
 *
 * @param balances - Array of TokenBalance objects
 * @param minimumRequired - Minimum balance required (in base units, no decimals)
 * @returns true if user has minimum balance in at least ONE token
 */
export function meetsMinimumRequirement(
  balances: TokenBalance[],
  minimumRequired: number
): boolean {
  // User needs minimum balance in AT LEAST ONE token (OR logic, not AND)
  return balances.some(tokenBalance => {
    const balance = BigInt(tokenBalance.balance);
    const minimum = BigInt(minimumRequired) * BigInt(10 ** tokenBalance.decimals);
    return balance >= minimum;
  });
}

/**
 * Get tokens that meet the minimum balance requirement
 *
 * @param balances - Array of TokenBalance objects
 * @param minimumRequired - Minimum balance required (in base units, no decimals)
 * @returns Array of TokenBalance objects that meet the requirement
 */
export function getQualifyingTokens(
  balances: TokenBalance[],
  minimumRequired: number
): TokenBalance[] {
  return balances.filter(tokenBalance => {
    const balance = BigInt(tokenBalance.balance);
    const minimum = BigInt(minimumRequired) * BigInt(10 ** tokenBalance.decimals);
    return balance >= minimum;
  });
}

/**
 * Calculate how many more tokens are needed to meet the minimum
 *
 * @param currentBalance - Current token balance (in base units)
 * @param minimumRequired - Minimum required (in base units)
 * @param decimals - Token decimals
 * @returns Deficit amount (0 if already meets requirement)
 */
export function calculateDeficit(
  currentBalance: string,
  minimumRequired: number,
  decimals: number
): number {
  const balance = BigInt(currentBalance);
  const minimum = BigInt(minimumRequired) * BigInt(10 ** decimals);

  if (balance >= minimum) {
    return 0;
  }

  const deficit = minimum - balance;
  return Number(deficit) / (10 ** decimals);
}

/**
 * Format eligibility result for display
 *
 * @param result - EligibilityResult object
 * @returns Human-readable eligibility status message
 */
export function formatEligibilityMessage(result: EligibilityResult): string {
  if (result.eligible) {
    const tokenNames = result.qualifyingTokens.map(t => t.symbol).join(', ');
    return `✅ Você tem tokens suficientes em stake para queimar NFTs (${tokenNames})`;
  }

  if (result.tokenBalances.length === 0) {
    return `⚠️ Você não possui nenhum fan token em stake. Faça stake de pelo menos ${result.minimumRequired} tokens de qualquer clube para queimar NFTs.`;
  }

  const maxBalance = result.tokenBalances.reduce((max, tb) => {
    const balance = parseFloat(tb.balance) / (10 ** tb.decimals);
    return balance > max ? balance : max;
  }, 0);

  return `⚠️ Você precisa ter pelo menos ${result.minimumRequired} tokens de um clube em stake para queimar NFTs. Seu maior saldo em stake: ${Math.floor(maxBalance)} tokens.`;
}

/**
 * Check eligibility via API (server-side validation)
 * This is the main function to use from components
 *
 * @param walletAddress - The wallet address to check
 * @returns EligibilityResult with detailed breakdown
 */
export async function checkBurnEligibility(
  walletAddress: string
): Promise<EligibilityResult> {
  try {
    const response = await fetch('/api/burn/check-eligibility', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking burn eligibility:', error);
    // Return safe default (not eligible) on error
    return {
      eligible: false,
      reason: 'Erro ao verificar elegibilidade',
      tokenBalances: [],
      minimumRequired: 100,
      qualifyingTokens: [],
    };
  }
}
