/**
 * Types for Burn/Staking NFT system with fee-based rewards
 */

export interface BurnStakeInfo {
  owner: string;
  tokenId: number;
  stakedAt: number;
  active: boolean;
}

export interface RewardBreakdown {
  grossReward: bigint;
  netReward: bigint;
  feeAmount: bigint;
}

export interface BurnStakingStats {
  totalStaked: number;
  availableRewards: bigint;
  netRewards: bigint;
  feeAmount: bigint;
  userStakedTokens: number[];
  isLoading: boolean;
  error: string | null;
}

export interface BalanceInfo {
  totalBalance: bigint;
  availableRewards: bigint;
  excess: bigint;
}
