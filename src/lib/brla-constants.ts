/**
 * Constantes da integração BRLA
 */

// Endereço da carteira de markup para comissões da BRLA
export const BRLA_MARKUP_WALLET_ADDRESS = process.env.NEXT_PUBLIC_BRLA_MARKUP_WALLET || '';

// Configurações padrão
export const BRLA_DEFAULT_MARKUP = '0.04'; // 4%

// URLs e endpoints
export const BRLA_SUPPORTED_TOKENS = ['CHZ', 'BRLA', 'USDC', 'USDT', 'ETH', 'GLMR', 'MATIC']; 