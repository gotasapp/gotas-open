/**
 * Type definitions for NFT staking system
 * Compatible with Thirdweb StakeERC721 contract standard
 */

/**
 * Complete staking information for a user
 */
export interface StakeInfo {
  /** Address of the staker */
  stakerAddress: string;

  /** Array of NFT token IDs currently staked */
  stakedTokenIds: number[];

  /** Total accumulated rewards (in wei or token units) */
  rewards: number;

  /** Optional: Total value of staked NFTs */
  totalStakedValue?: number;

  /** Optional: Timestamp of first stake */
  firstStakeTime?: number;

  /** Optional: Timestamp of last stake action */
  lastStakeTime?: number;
}

/**
 * Individual staked NFT details
 */
export interface StakedNFT {
  /** The NFT token ID */
  tokenId: number;

  /** Address of the user who staked this NFT */
  stakerAddress: string;

  /** Contract address where NFT is staked */
  stakingContract: string;

  /** Original NFT contract address */
  nftContract: string;

  /** Optional: Timestamp when this NFT was staked */
  stakedAt?: number;

  /** Optional: Accumulated rewards for this specific NFT */
  rewards?: number;

  /** Optional: NFT metadata */
  metadata?: NFTMetadata;
}

/**
 * NFT metadata structure
 */
export interface NFTMetadata {
  /** NFT name */
  name?: string;

  /** NFT description */
  description?: string;

  /** NFT image URL */
  image?: string;

  /** Additional attributes */
  attributes?: NFTAttribute[];

  /** External URL */
  external_url?: string;

  /** Animation URL */
  animation_url?: string;
}

/**
 * NFT attribute structure
 */
export interface NFTAttribute {
  /** Trait type or category */
  trait_type: string;

  /** Attribute value */
  value: string | number;

  /** Optional: Display type for special formatting */
  display_type?: 'number' | 'date' | 'boost_percentage' | 'boost_number';

  /** Optional: Max value for numeric attributes */
  max_value?: number;
}

/**
 * Reward calculation and distribution data
 */
export interface StakingRewards {
  /** Address of the staker */
  stakerAddress: string;

  /** Current reward amount available to claim */
  rewards: number;

  /** Timestamp of last reward calculation/claim */
  lastRewardTime: number;

  /** Optional: Pending rewards not yet available */
  pendingRewards?: number;

  /** Optional: Total rewards claimed historically */
  totalClaimedRewards?: number;

  /** Optional: Reward rate per time unit */
  rewardRate?: number;
}

/**
 * Staking transaction result
 */
export interface StakingTransaction {
  /** Transaction hash */
  transactionHash: string;

  /** Block number where transaction was mined */
  blockNumber: number;

  /** Transaction status */
  status: 'pending' | 'success' | 'failed';

  /** Gas used for the transaction */
  gasUsed?: string;

  /** Effective gas price */
  effectiveGasPrice?: string;

  /** Transaction type */
  type: 'stake' | 'withdraw' | 'claim' | 'approve';

  /** Token IDs involved (for stake/withdraw) */
  tokenIds?: number[];

  /** Reward amount (for claim) */
  rewardAmount?: number;

  /** Error message if failed */
  error?: string;
}

/**
 * Staking pool statistics
 */
export interface StakingPoolStats {
  /** Total number of NFTs staked in the pool */
  totalStaked: number;

  /** Total number of unique stakers */
  totalStakers: number;

  /** Total rewards distributed */
  totalRewardsDistributed: number;

  /** Available rewards in the pool */
  availableRewards: number;

  /** Rewards per time unit */
  rewardsPerUnitTime: number;

  /** Time unit in seconds */
  timeUnit: number;

  /** Whether staking is currently active */
  stakingActive: boolean;

  /** Contract addresses */
  contracts: {
    staking: string;
    nft: string;
    rewardToken: string;
  };
}

/**
 * User staking statistics
 */
export interface UserStakingStats {
  /** User address */
  userAddress: string;

  /** Number of NFTs currently staked */
  nftsStaked: number;

  /** Total time staked (in seconds) */
  totalStakedTime: number;

  /** Average staking duration per NFT */
  averageStakingDuration: number;

  /** Total rewards earned */
  totalRewardsEarned: number;

  /** Total rewards claimed */
  totalRewardsClaimed: number;

  /** Unclaimed rewards */
  unclaimedRewards: number;

  /** Estimated daily rewards */
  estimatedDailyRewards: number;

  /** Staking tier/level if applicable */
  stakingTier?: string;

  /** Boost multiplier if applicable */
  boostMultiplier?: number;
}

/**
 * Staking configuration parameters
 */
export interface StakingConfig {
  /** Minimum stake duration (in seconds) */
  minStakeDuration?: number;

  /** Maximum NFTs per stake transaction */
  maxNFTsPerStake?: number;

  /** Cooldown period for withdrawals (in seconds) */
  withdrawalCooldown?: number;

  /** Early withdrawal penalty percentage */
  earlyWithdrawalPenalty?: number;

  /** Reward token decimals */
  rewardTokenDecimals: number;

  /** Whether to auto-compound rewards */
  autoCompound?: boolean;

  /** Staking tiers configuration */
  stakingTiers?: StakingTier[];
}

/**
 * Staking tier configuration
 */
export interface StakingTier {
  /** Tier name */
  name: string;

  /** Minimum NFTs required for tier */
  minNFTs: number;

  /** Reward multiplier for this tier */
  rewardMultiplier: number;

  /** Additional benefits */
  benefits?: string[];

  /** Required staking duration for tier (in seconds) */
  requiredDuration?: number;
}

/**
 * Staking approval status
 */
export interface StakingApproval {
  /** Whether NFT contract is approved for staking */
  isApproved: boolean;

  /** Owner address */
  owner: string;

  /** Operator address (staking contract) */
  operator: string;

  /** NFT contract address */
  nftContract: string;

  /** Approval transaction hash if recently approved */
  approvalTxHash?: string;
}

/**
 * Batch staking operation result
 */
export interface BatchStakingResult {
  /** Successfully staked token IDs */
  successful: number[];

  /** Failed token IDs */
  failed: number[];

  /** Error messages for failed stakes */
  errors: Record<number, string>;

  /** Transaction hashes for successful operations */
  transactions: string[];

  /** Total gas used */
  totalGasUsed?: string;
}

/**
 * Staking event types
 */
export type StakingEventType =
  | 'TokensStaked'
  | 'TokensWithdrawn'
  | 'RewardsClaimed'
  | 'RewardsPerUnitTimeUpdated'
  | 'TimeUnitUpdated'
  | 'StakingStarted'
  | 'StakingStopped';

/**
 * Staking event data
 */
export interface StakingEvent {
  /** Event type */
  type: StakingEventType;

  /** Transaction hash */
  transactionHash: string;

  /** Block number */
  blockNumber: number;

  /** Timestamp */
  timestamp: number;

  /** Address that triggered the event */
  address: string;

  /** Event-specific data */
  data: {
    tokenIds?: number[];
    rewardAmount?: number;
    oldValue?: number;
    newValue?: number;
  };
}