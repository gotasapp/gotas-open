/**
 * Type definitions for the burn rewards system
 */

/**
 * NFT rarity levels in Portuguese
 */
export type NFTRarityPortuguese = 'comum' | 'raro' | 'lendário';

/**
 * Burn reward configuration for a specific fan token and rarity
 */
export interface BurnRewardConfig {
  id?: number;
  fanTokenSymbol: string;
  rarity: NFTRarityPortuguese;
  chzRewardAmount: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Global burn settings
 */
export interface BurnGlobalSettings {
  burnFeatureEnabled: boolean;
  minimumCardsPerBurn: number;
  maximumCardsPerBurn: number;
  burnCooldownSeconds: number;
  chzRewardMultiplier: number;
  burnTransactionTimeout: number;
  autoClaimRewards: boolean;
}

/**
 * Fan token information
 */
export interface FanToken {
  id?: number;
  symbol: string;
  name: string;
  teamName?: string;
  contractAddress?: string;
  decimals: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Burn history record
 */
export interface BurnHistory {
  id?: number;
  privyUserId: string;
  cardIds: string[];
  cardCount: number;
  burnedAt: Date;
  rewardsGranted?: BurnRewards;
  createdAt: Date;
}

/**
 * Rewards granted for a burn operation
 */
export interface BurnRewards {
  totalChz: number;
  fanToken: string;
  breakdown: BurnRewardBreakdown[];
  multiplierApplied?: number;
  transactionHash?: string;
}

/**
 * Breakdown of rewards by rarity
 */
export interface BurnRewardBreakdown {
  rarity: NFTRarityPortuguese;
  quantity: number;
  chzPerCard: number;
  totalChz: number;
}

/**
 * Card to be burned
 */
export interface CardToBurn {
  userAssetClaimId: string;
  assetId: string;
  fanToken: string;
  rarity: NFTRarityPortuguese;
  playerName?: string;
  imageUrl?: string;
}

/**
 * Burn session request
 */
export interface BurnSessionRequest {
  userId: string;
  cards: CardToBurn[];
  walletAddress?: string;
}

/**
 * Burn session response
 */
export interface BurnSessionResponse {
  success: boolean;
  burnId?: string;
  totalChzReward: number;
  cardsBurned: number;
  transactionHash?: string;
  error?: string;
}

/**
 * Burn rewards view (joined data)
 */
export interface BurnRewardsView {
  fanToken: string;
  tokenName: string;
  teamName?: string;
  rarity: NFTRarityPortuguese;
  chzRewardAmount: number;
  rewardActive: boolean;
  tokenActive: boolean;
  fullyActive: boolean;
}

/**
 * Maps English rarity to Portuguese
 */
export const rarityToPortuguese = (rarity: string): NFTRarityPortuguese => {
  const mapping: Record<string, NFTRarityPortuguese> = {
    'common': 'comum',
    'rare': 'raro',
    'epic': 'raro', // Map epic to raro
    'legendary': 'lendário',
    // Portuguese versions (in case they're already in Portuguese)
    'comum': 'comum',
    'raro': 'raro',
    'lendário': 'lendário'
  };

  return mapping[rarity.toLowerCase()] || 'comum';
};

/**
 * Maps Portuguese rarity to English
 */
export const rarityToEnglish = (rarity: NFTRarityPortuguese): string => {
  const mapping: Record<NFTRarityPortuguese, string> = {
    'comum': 'common',
    'raro': 'rare',
    'lendário': 'legendary'
  };

  return mapping[rarity] || 'common';
};

/**
 * Get rarity display information
 */
export const getRarityDisplay = (rarity: NFTRarityPortuguese) => {
  const displays = {
    'comum': {
      label: 'Comum',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      icon: '●'
    },
    'raro': {
      label: 'Raro',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      borderColor: 'border-purple-300',
      icon: '♦'
    },
    'lendário': {
      label: 'Lendário',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-300',
      icon: '👑'
    }
  };

  return displays[rarity] || displays['comum'];
};