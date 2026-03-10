/**
 * Burn Staking Contract Functions
 *
 * Integração com StakeNFTWithFee - sistema de staking com fee
 * Usuário faz stake de NFTs e recebe recompensas em CHZ
 */

import { getContract, prepareContractCall, readContract, sendTransaction, sendBatchTransaction, waitForReceipt } from 'thirdweb';
import { thirdwebClient, getActiveChain } from './thirdweb-client';
import StakeNFTWithFeeABIData from '@/abis/StakeNFTWithFeeABI.json';
const StakeNFTWithFeeABI = StakeNFTWithFeeABIData as const;
import type { BurnStakeInfo, RewardBreakdown, BalanceInfo } from '@/types/burn-staking';

// Endereços dos contratos (configurar via env vars)
const BURN_STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BURN_STAKING_CONTRACT || '';
const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  const normalized = address.trim();
  return (
    normalized.length === 42 &&
    normalized.startsWith('0x') &&
    /^0x[a-fA-F0-9]{40}$/.test(normalized) &&
    normalized.toLowerCase() !== ZERO_ADDRESS
  );
}

/**
 * Validate if contract address is properly configured
 */
export function isContractConfigured(): boolean {
  return isValidAddress(BURN_STAKING_CONTRACT_ADDRESS);
}

/**
 * Validate if NFT contract address is properly configured
 */
export function isNFTContractConfigured(): boolean {
  return isValidAddress(NFT_CONTRACT_ADDRESS);
}

/**
 * Get contract instance
 */
function getStakingContract() {
  if (!isContractConfigured()) {
    throw new Error('Burn staking contract address not configured');
  }
  const chain = getActiveChain();
  const address = BURN_STAKING_CONTRACT_ADDRESS.trim();
  return getContract({
    client: thirdwebClient,
    chain,
    address,
    abi: StakeNFTWithFeeABI,
  });
}

/**
 * Get NFT contract instance
 */
function getNFTContract() {
  if (!isNFTContractConfigured()) {
    throw new Error('NFT contract address not configured');
  }
  const chain = getActiveChain();
  const address = NFT_CONTRACT_ADDRESS.trim();
  return getContract({
    client: thirdwebClient,
    chain,
    address,
  });
}

/**
 * Stake (burn) a single NFT
 */
export async function stakeBurnNFT(tokenId: number, account: any): Promise<void> {
  const contract = getStakingContract();

  // Prepare transaction
  const transaction = prepareContractCall({
    contract,
    method: 'function stake(uint256 _tokenId)',
    params: [BigInt(tokenId)],
  });

  // Send transaction
  await sendTransaction({
    transaction,
    account,
  });
}

/**
 * Stake (burn) multiple NFTs in a single batch transaction when supported
 */
export async function stakeBurnNFTsBatch(tokenIds: number[], account: any): Promise<void> {
  if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
    return;
  }

  // Fallback to single stake if only one token
  if (tokenIds.length === 1) {
    await stakeBurnNFT(tokenIds[0], account);
    return;
  }

  const contract = getStakingContract();
  const transactions = tokenIds.map(tokenId =>
    prepareContractCall({
      contract,
      method: 'function stake(uint256 _tokenId)',
      params: [BigInt(tokenId)],
    }),
  );

  try {
    const batchResult = await sendBatchTransaction({
      account,
      transactions,
    });
    await waitForReceipt(batchResult);
  } catch (error) {
    console.warn('Batch stake failed, falling back to sequential transactions:', error);
    for (const tokenId of tokenIds) {
      await stakeBurnNFT(tokenId, account);
    }
  }
}

/**
 * Unstake (recover) a single NFT
 */
export async function unstakeBurnNFT(tokenId: number, account: any): Promise<void> {
  const contract = getStakingContract();

  const transaction = prepareContractCall({
    contract,
    method: 'function unstake(uint256 _tokenId)',
    params: [BigInt(tokenId)],
  });

  await sendTransaction({
    transaction,
    account,
  });
}

/**
 * Claim rewards from staked NFTs
 */
export async function claimBurnRewards(account: any, tokenIds: number[]): Promise<void> {
  const contract = getStakingContract();

  const uniqueIds = [...new Set(tokenIds.map(id => Number(id)).filter(id => !Number.isNaN(id)))];
  if (uniqueIds.length === 0) {
    throw new Error('No token IDs provided to claim rewards');
  }

  if (uniqueIds.length === 1) {
    const transaction = prepareContractCall({
      contract,
      method: 'function claimReward(uint256 _tokenId)',
      params: [BigInt(uniqueIds[0])],
    });

    await sendTransaction({
      transaction,
      account,
    });
    return;
  }

  const transaction = prepareContractCall({
    contract,
    method: 'function claimRewardBatch(uint256[] _tokenIds)',
    params: [uniqueIds.map(id => BigInt(id))],
  });

  await sendTransaction({
    transaction,
    account,
  });
}

/**
 * Check if user can unstake a specific token
 */
export async function canUnstake(userAddress: string, tokenId: number): Promise<boolean> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'function canUnstake(address _user, uint256 _tokenId) view returns (bool)',
    params: [userAddress, BigInt(tokenId)],
  });

  return result;
}

/**
 * Get stake info for a specific token
 */
export async function getStakeInfo(tokenId: number): Promise<BurnStakeInfo> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'function getStakeInfo(uint256 _tokenId) view returns ((address owner, uint256 tokenId, uint256 stakedAt, bool active))',
    params: [BigInt(tokenId)],
  });

  return {
    owner: result.owner,
    tokenId: Number(result.tokenId),
    stakedAt: Number(result.stakedAt),
    active: result.active,
  };
}

/**
 * Get all staked tokens for a user
 */
export async function getStakedTokens(userAddress: string): Promise<number[]> {
  try {
    if (!isContractConfigured()) {
      console.warn('Burn staking contract not configured, returning empty array');
      return [];
    }

    const contract = getStakingContract();
    const result = await readContract({
      contract,
      method: 'function getStakedTokens(address _user) view returns (uint256[])',
      params: [userAddress],
    });

    return result.map((id: bigint) => Number(id));
  } catch (error) {
    console.error('Error getting staked tokens:', error);
    return [];
  }
}

/**
 * Get tokens with claimable rewards for a user
 */
export async function getClaimableTokens(userAddress: string): Promise<number[]> {
  if (!isContractConfigured()) {
    console.warn('Burn staking contract not configured, returning empty claimable array');
    return [];
  }

  if (!userAddress) {
    return [];
  }

  const contract = getStakingContract();
  const result = await readContract({
    contract,
    method: 'function getClaimableTokens(address _user) view returns (uint256[])',
    params: [userAddress],
  });

  return result.map((id: bigint) => Number(id));
}

/**
 * Check if a token's reward has already been claimed
 */
export async function isTokenRewardClaimed(tokenId: number): Promise<boolean> {
  if (!isContractConfigured()) {
    console.warn('Burn staking contract not configured, assuming token reward not claimed');
    return false;
  }

  const contract = getStakingContract();
  const result = await readContract({
    contract,
    method: 'function tokenRewardClaimed(uint256 _tokenId) view returns (bool)',
    params: [BigInt(tokenId)],
  });

  return result;
}

/**
 * Calculate reward breakdown (gross, net, fee)
 */
export async function calculateRewardBreakdown(userAddress: string): Promise<RewardBreakdown> {
  try {
    if (!isContractConfigured()) {
      console.warn('Burn staking contract not configured, returning zero rewards');
      return {
        grossReward: BigInt(0),
        netReward: BigInt(0),
        feeAmount: BigInt(0),
      };
    }

    const contract = getStakingContract();
    const result = await readContract({
      contract,
      method: 'function calculateRewardBreakdown(address _user) view returns (uint256 grossReward, uint256 netReward, uint256 feeAmount)',
      params: [userAddress],
    });

    return {
      grossReward: result[0],
      netReward: result[1],
      feeAmount: result[2],
    };
  } catch (error) {
    console.error('Error calculating reward breakdown:', error);
    return {
      grossReward: BigInt(0),
      netReward: BigInt(0),
      feeAmount: BigInt(0),
    };
  }
}

/**
 * Get reward amount available for user
 */
export async function getRewardAmount(userAddress: string): Promise<bigint> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'function rewardAmount(address) view returns (uint256)',
    params: [userAddress],
  });

  return result;
}

/**
 * Check if reward has been claimed
 */
export async function isRewardClaimed(userAddress: string): Promise<boolean> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'function rewardClaimed(address) view returns (bool)',
    params: [userAddress],
  });

  return result;
}

/**
 * Get total staked NFTs in the contract
 */
export async function getTotalStaked(): Promise<number> {
  try {
    if (!isContractConfigured()) {
      console.warn('Burn staking contract not configured, returning 0');
      return 0;
    }

    const contract = getStakingContract();
    const result = await readContract({
      contract,
      method: 'function totalStaked() view returns (uint256)',
      params: [],
    });

    return Number(result);
  } catch (error) {
    console.error('Error getting total staked:', error);
    return 0;
  }
}

/**
 * Get contract balance info
 */
export async function getBalanceInfo(): Promise<BalanceInfo> {
  try {
    if (!isContractConfigured()) {
      console.warn('Burn staking contract not configured, returning default values');
      return {
        totalBalance: BigInt(0),
        availableRewards: BigInt(0),
        excess: BigInt(0),
      };
    }

    const contract = getStakingContract();
    const result = await readContract({
      contract,
      method: 'function getBalanceInfo() view returns (uint256 totalBalance, uint256 availableRewards, uint256 excess)',
      params: [],
    });

    return {
      totalBalance: result[0],
      availableRewards: result[1],
      excess: result[2],
    };
  } catch (error) {
    console.error('Error getting balance info:', error);
    return {
      totalBalance: BigInt(0),
      availableRewards: BigInt(0),
      excess: BigInt(0),
    };
  }
}

/**
 * Check if staking is paused
 */
export async function isPaused(): Promise<boolean> {
  try {
    if (!isContractConfigured()) {
      console.warn('Burn staking contract not configured, returning paused state');
      return true; // Return paused state when not configured for safety
    }

    const contract = getStakingContract();
    const result = await readContract({
      contract,
      method: 'function paused() view returns (bool)',
      params: [],
    });

    return result;
  } catch (error) {
    console.error('Error checking paused state:', error);
    return true; // Return paused state on error for safety
  }
}

/**
 * Get fixed reward amount per NFT
 */
export async function getFixedReward(): Promise<bigint> {
  try {
    if (!isContractConfigured()) {
      console.warn('Burn staking contract not configured, returning 0');
      return BigInt(0);
    }

    const contract = getStakingContract();
    const result = await readContract({
      contract,
      method: 'function fixedReward() view returns (uint256)',
      params: [],
    });

    return result;
  } catch (error) {
    console.error('Error getting fixed reward:', error);
    return BigInt(0);
  }
}

/**
 * Get minimum staking duration in seconds
 */
export async function getMinStakingDuration(): Promise<number> {
  try {
    if (!isContractConfigured()) {
      console.warn('Burn staking contract not configured, returning default 24 hours');
      return 86400; // Default 24 hours
    }

    const contract = getStakingContract();
    const result = await readContract({
      contract,
      method: 'function minStakingDuration() view returns (uint256)',
      params: [],
    });

    return Number(result);
  } catch (error) {
    console.error('Error getting minimum staking duration:', error);
    return 86400; // Default 24 hours
  }
}

/**
 * Get fee percentage (in basis points, e.g., 500 = 5%)
 */
export async function getFeePercentage(): Promise<number> {
  try {
    if (!isContractConfigured()) {
      console.warn('Burn staking contract not configured, returning 0');
      return 0;
    }

    const contract = getStakingContract();
    const result = await readContract({
      contract,
      method: 'function feePercentage() view returns (uint256)',
      params: [],
    });

    return Number(result);
  } catch (error) {
    console.error('Error getting fee percentage:', error);
    return 0;
  }
}

/**
 * Get maximum stakes per user allowed by contract
 */
export async function getMaxStakesPerUser(): Promise<number> {
  try {
    if (!isContractConfigured()) {
      console.warn('Burn staking contract not configured, returning default limit of 50');
      return 50; // Default fallback
    }

    const contract = getStakingContract();
    const result = await readContract({
      contract,
      method: 'function maxStakesPerUser() view returns (uint256)',
      params: [],
    });

    return Number(result);
  } catch (error) {
    console.error('Error getting max stakes per user:', error);
    return 50; // Default fallback
  }
}

/**
 * Approve NFT for staking
 */
export async function approveNFTForStaking(account: any): Promise<void> {
  const nftContract = getNFTContract();

  const transaction = prepareContractCall({
    contract: nftContract,
    method: 'function setApprovalForAll(address operator, bool approved)',
    params: [BURN_STAKING_CONTRACT_ADDRESS, true],
  });

  await sendTransaction({
    transaction,
    account,
  });
}

/**
 * Check if NFT is approved for staking
 */
export async function isApprovedForStaking(userAddress: string): Promise<boolean> {
  try {
    if (!isNFTContractConfigured() || !isContractConfigured()) {
      console.warn('Contracts not configured, returning false for approval status');
      return false;
    }

    const nftContract = getNFTContract();
    const result = await readContract({
      contract: nftContract,
      method: 'function isApprovedForAll(address owner, address operator) view returns (bool)',
      params: [userAddress, BURN_STAKING_CONTRACT_ADDRESS],
    });

    return result;
  } catch (error) {
    console.error('Error checking approval status:', error);
    return false;
  }
}

/**
 * Check if user is whitelisted
 * Uses the contract's isWhitelisted() function
 */
export async function isWhitelisted(userAddress: string): Promise<boolean> {
  try {
    if (!isContractConfigured()) {
      console.warn('Burn staking contract not configured, returning false for whitelist status');
      return false;
    }

    console.log(`[CONTRACT RPC] Checking whitelist status for ${userAddress}...`);
    const contract = getStakingContract();
    const result = await readContract({
      contract,
      method: 'function isWhitelisted(address _user) view returns (bool)',
      params: [userAddress],
    });

    console.log(`[CONTRACT RPC] Whitelist status for ${userAddress}: ${result}`);
    return result;
  } catch (error) {
    console.error('[CONTRACT RPC ERROR] Error checking whitelist status:', error);
    return false;
  }
}

/**
 * Add user to whitelist
 * Uses the contract's setWhitelist() function
 * This requires the caller to have admin permissions on the contract
 * Returns transaction receipt after waiting for confirmation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addToWhitelist(userAddress: string, account: any): Promise<any> {
  const contract = getStakingContract();

  const transaction = prepareContractCall({
    contract,
    method: 'function setWhitelist(address _user, bool _whitelisted)',
    params: [userAddress, true],
  });

  const result = await sendTransaction({
    transaction,
    account,
  });

  console.log(`[CONTRACT] Transaction sent: ${result.transactionHash}`);

  // Aguardar confirmação da transação
  const receipt = await waitForReceipt(result);
  console.log(`[CONTRACT] Transaction confirmed in block ${receipt.blockNumber}`);

  return receipt;
}
