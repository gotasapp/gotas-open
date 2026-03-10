// Token interface
export interface Token {
  id: string;
  symbol: string;
  name: string;
  description: string;
  address?: string;
  icon?: string;
  decimals?: number;
}

// Staking token interface
export interface StakingToken extends Token {
  address: string;
  icon_url: string;
}

// Temporary token list for display only
export const AVAILABLE_TOKENS: Token[] = [
  {
    id: 'chz',
    symbol: 'CHZ',
    name: 'Chiliz',
    description: 'token nativo da Chiliz Chain',
  },
  {
    id: 'bar',
    symbol: 'BAR',
    name: 'FC Barcelona Fan Token',
    description: 'token oficial de torcedor do FC Barcelona',
  },
  {
    id: 'psg',
    symbol: 'PSG',
    name: 'Paris Saint-Germain Fan Token',
    description: 'token oficial de torcedor do Paris Saint-Germain',
  },
  {
    id: 'juv',
    symbol: 'JUV',
    name: 'Juventus Fan Token',
    description: 'token oficial de torcedor da Juventus',
  },
  {
    id: 'atm',
    symbol: 'ATM',
    name: 'Atletico Madrid Fan Token',
    description: 'token oficial de torcedor do Atletico Madrid',
  },
  {
    id: 'mengo',
    symbol: 'MENGO',
    name: 'Flamengo Fan Token',
    description: 'token oficial de torcedor do Flamengo',
  },
];

// Lista de tokens disponíveis para stake na Chiliz Chain
/**
 * IMPORTANTE: Manipulação de Fan Tokens e Decimais
 * 
 * Os Fan Tokens (como MENGO) usam 0 decimais, enquanto tokens nativos (CHZ) usam 18 decimais.
 * Qualquer manipulação de valores deve considerar esta diferença ao converter de/para valores wei.
 * 
 * Exemplos:
 * - Para o CHZ (18 decimais): 1 CHZ = 1 * 10^18 wei
 * - Para o MENGO (0 decimais): 1 MENGO = 1 wei (sem multiplicação)
 * 
 * Use as funções auxiliares abaixo para detectar o tipo de token e obter o número correto de decimais.
 */

// Helper function to detect if a token is a fan token
export const isFanToken = (token: Token): boolean => {
  // Native CHZ is not a fan token
  if (token.id === 'chz') return false;
  
  // All other tokens in our context are fan tokens
  return true;
};

// Helper to get token decimals with safety checks
export const getTokenDecimals = (token: Token): number => {
  // If token has explicit decimals, use that
  if (token.decimals !== undefined) return token.decimals;
  
  // If it's a fan token, use 0 decimals
  if (isFanToken(token)) return 0;
  
  // Default to 18 for native tokens
  return 18;
};

export const AVAILABLE_STAKING_TOKENS: StakingToken[] = [
  {
    id: 'mengo',
    symbol: 'MENGO',
    name: 'Flamengo Fan Token',
    description: 'token oficial de torcedor do Flamengo',
    address: '0xD1723Eb9e7C6eE7c7e2d421B2758dc0f2166eDDc',
    icon_url: 'https://assets.coingecko.com/coins/images/19461/standard/MENGO.png?1741579338',
    decimals: 0, // Fan tokens have 0 decimals
  },
  {
    id: 'flu',
    symbol: 'FLU',
    name: 'Fluminense Fan Token',
    description: 'token oficial de torcedor do Fluminense',
    address: '0xPLACEHOLDER_FLU_ADDRESS', // TODO: Atualizar com o endereço correto
    icon_url: 'https://example.com/placeholder_flu_icon.png', // TODO: Atualizar com o ícone correto
    decimals: 0,
  },
  {
    id: 'vasco',
    symbol: 'VASCO',
    name: 'Vasco da Gama Fan Token',
    description: 'token oficial de torcedor do Vasco da Gama',
    address: '0xPLACEHOLDER_VASCO_ADDRESS', // TODO: Atualizar com o endereço correto
    icon_url: 'https://example.com/placeholder_vasco_icon.png', // TODO: Atualizar com o ícone correto
    decimals: 0,
  },
  {
    id: 'spfc',
    symbol: 'SPFC',
    name: 'São Paulo FC Fan Token',
    description: 'token oficial de torcedor do São Paulo FC',
    address: '0xPLACEHOLDER_SPFC_ADDRESS', // TODO: Atualizar com o endereço correto
    icon_url: 'https://example.com/placeholder_spfc_icon.png', // TODO: Atualizar com o ícone correto
    decimals: 0,
  },
  {
    id: 'verdao',
    symbol: 'VERDAO',
    name: 'Palmeiras Fan Token',
    description: 'token oficial de torcedor do Palmeiras',
    address: '0xPLACEHOLDER_VERDAO_ADDRESS', // TODO: Atualizar com o endereço correto
    icon_url: 'https://example.com/placeholder_verdao_icon.png', // TODO: Atualizar com o ícone correto
    decimals: 0,
  },
  {
    id: 'saci',
    symbol: 'SACI',
    name: 'Internacional Fan Token', // Assumindo que SACI é o Internacional
    description: 'token oficial de torcedor do Internacional',
    address: '0xPLACEHOLDER_SACI_ADDRESS', // TODO: Atualizar com o endereço correto
    icon_url: 'https://example.com/placeholder_saci_icon.png', // TODO: Atualizar com o ícone correto
    decimals: 0,
  },
];