/**
 * Utilities for interacting with tokens
 */

/**
 * Get token contract addresses
 * Maps token symbols to their contract addresses on Chiliz Chain
 * These are the verified token contract addresses from the Chiliz Chain
 */
export const TOKEN_CONTRACTS: Record<string, string> = {
  'CHZ': '0x0000000000000000000000000000000000000000', // Native token
  'BAR': '0xa1a72fc9dd4be8f6e7a88a7433e961642c93b8e3', // FC Barcelona token
  'PSG': '0x37520dc988b7c1d9724c1e61997fe0ed02f43957', // Paris Saint-Germain token
  'JUV': '0x8fd105ba3ffda0e6774f6732781a0e3a5a5cc46d', // Juventus token
  'ATM': '0x26b8df2a6a6ec267aeee2cf3af8061a6531fb0a8', // Atletico Madrid token
  'MENGO': '0xd1723eb9e7c6ee7c7e2d421b2758dc0f2166eddc', // Flamengo token - verified contract address
};

/**
 * Get token decimals
 * Most ERC20 tokens use 18 decimals, but some might differ
 */
export const TOKEN_DECIMALS: Record<string, number> = {
  'CHZ': 18,
  'BAR': 18,
  'PSG': 18,
  'JUV': 18,
  'ATM': 18,
  'MENGO': 18,
};

/**
 * Get token contract address by symbol
 * @param symbol Token symbol
 * @returns Contract address
 */
export function getTokenContractAddress(symbol: string): string {
  return TOKEN_CONTRACTS[symbol] || '0x0000000000000000000000000000000000000000';
}

/**
 * Get token decimals by symbol
 * @param symbol Token symbol
 * @returns Token decimals
 */
export function getTokenDecimals(symbol: string): number {
  return TOKEN_DECIMALS[symbol] || 18;
}