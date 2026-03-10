/**
 * Utility library for NFT staking contract interactions using Thirdweb SDK v5
 *
 * Contracts:
 * - Staking: 0x0CB05c7436ca864c41bd94DAEfc2B73030CAd34b (StakeERC721)
 * - NFT: 0x1e6F3a15ce830705914025DC2e9c1B5cDCA4C8Fd
 */

import { getContract, prepareContractCall, readContract, sendTransaction, type ThirdwebContract } from 'thirdweb';
import { thirdwebClient, getActiveChain } from '@/lib/thirdweb-client';
import StakeERC721ABI from '@/abis/StakeERC721ABI.json';
import ERC721ABI from '@/abis/ERC721ABI.json';
import type { StakeInfo, StakedNFT, StakingRewards } from '@/types/staking';

// Contract addresses on Chiliz Chain (88888)
export const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT || '';
export const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '';

/**
 * Get the StakeERC721 staking contract instance
 * @returns Thirdweb contract instance for staking operations
 */
export function getStakingContract(): ThirdwebContract {
  return getContract({
    client: thirdwebClient,
    chain: getActiveChain(),
    address: STAKING_CONTRACT_ADDRESS,
    abi: StakeERC721ABI as any,
  });
}

/**
 * Get the NFT contract instance for approval operations
 * @returns Thirdweb contract instance for NFT operations
 */
export function getNFTContract(): ThirdwebContract {
  return getContract({
    client: thirdwebClient,
    chain: getActiveChain(),
    address: NFT_CONTRACT_ADDRESS,
    abi: ERC721ABI as any,
  });
}

/**
 * Stake a single NFT token
 * @param tokenId - The ID of the NFT to stake
 * @param account - The wallet account to stake from
 */
export async function stakeNFT(tokenId: number, account: any) {
  const contract = getStakingContract();

  const transaction = prepareContractCall({
    contract,
    method: 'stake',
    params: [BigInt(tokenId)],
  });

  return await sendTransaction({
    transaction,
    account,
  });
}

/**
 * Stake multiple NFT tokens at once
 * @param tokenIds - Array of NFT token IDs to stake
 * @param account - The wallet account to stake from
 */
export async function stakeMultipleNFTs(tokenIds: number[], account: any) {
  const contract = getStakingContract();

  const transaction = prepareContractCall({
    contract,
    method: 'stake',
    params: [tokenIds.map(id => BigInt(id))],
  });

  return await sendTransaction({
    transaction,
    account,
  });
}

/**
 * Withdraw a single staked NFT
 * @param tokenId - The ID of the NFT to withdraw
 * @param account - The wallet account to withdraw to
 */
export async function withdrawNFT(tokenId: number, account: any) {
  const contract = getStakingContract();

  const transaction = prepareContractCall({
    contract,
    method: 'withdraw',
    params: [BigInt(tokenId)],
  });

  return await sendTransaction({
    transaction,
    account,
  });
}

/**
 * Withdraw multiple staked NFTs at once
 * @param tokenIds - Array of NFT token IDs to withdraw
 * @param account - The wallet account to withdraw to
 */
export async function withdrawMultipleNFTs(tokenIds: number[], account: any) {
  const contract = getStakingContract();

  const transaction = prepareContractCall({
    contract,
    method: 'withdraw',
    params: [tokenIds.map(id => BigInt(id))],
  });

  return await sendTransaction({
    transaction,
    account,
  });
}

/**
 * Claim accumulated staking rewards
 * @param account - The wallet account to claim rewards for
 */
export async function claimRewards(account: any) {
  const contract = getStakingContract();

  const transaction = prepareContractCall({
    contract,
    method: 'claimRewards',
    params: [],
  });

  return await sendTransaction({
    transaction,
    account,
  });
}

/**
 * Get staking information for an address
 * @param stakerAddress - The address to get staking info for
 * @returns StakeInfo object with staked tokens and rewards
 */
export async function getStakeInfo(stakerAddress: string): Promise<StakeInfo> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'getStakeInfo',
    params: [stakerAddress],
  });

  const [stakedTokenIds, rewards] = result as [bigint[], bigint];

  return {
    stakedTokenIds: stakedTokenIds.map(id => Number(id)),
    rewards: Number(rewards),
    stakerAddress,
  };
}

/**
 * Get list of staked token IDs for an address
 * @param stakerAddress - The address to get staked tokens for
 * @returns Array of staked token IDs
 */
export async function getStakedTokens(stakerAddress: string): Promise<number[]> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'getStakedTokens',
    params: [stakerAddress],
  });

  const stakedTokenIds = result as bigint[];
  return stakedTokenIds.map(id => Number(id));
}

/**
 * Calculate current rewards for a staker
 * @param stakerAddress - The address to calculate rewards for
 * @returns Current reward amount
 */
export async function calculateRewards(stakerAddress: string): Promise<number> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'calculateRewards',
    params: [stakerAddress],
  });

  return Number(result);
}

/**
 * Get detailed reward information for a staker
 * @param stakerAddress - The address to get reward info for
 * @returns StakingRewards object with rewards and timing data
 */
export async function getRewardInfo(stakerAddress: string): Promise<StakingRewards> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'getRewardInfo',
    params: [stakerAddress],
  });

  const [rewards, lastRewardTime] = result as [bigint, bigint];

  return {
    rewards: Number(rewards),
    lastRewardTime: Number(lastRewardTime),
    stakerAddress,
  };
}

/**
 * Get total number of NFTs currently staked in the contract
 * @returns Total number of staked NFTs
 */
export async function getTotalStaked(): Promise<number> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'totalStaked',
    params: [],
  });

  return Number(result);
}

/**
 * Check if a user has approved the staking contract to transfer their NFTs
 * @param ownerAddress - The NFT owner's address
 * @returns True if approved, false otherwise
 */
export async function isApprovedForStaking(ownerAddress: string): Promise<boolean> {
  const nftContract = getNFTContract();

  const result = await readContract({
    contract: nftContract,
    method: 'isApprovedForAll',
    params: [ownerAddress, STAKING_CONTRACT_ADDRESS],
  });

  return result as boolean;
}

/**
 * Approve the staking contract to transfer user's NFTs
 * @param account - The wallet account to approve from
 */
export async function approveForStaking(account: any) {
  const nftContract = getNFTContract();

  const transaction = prepareContractCall({
    contract: nftContract,
    method: 'setApprovalForAll',
    params: [STAKING_CONTRACT_ADDRESS, true],
  });

  return await sendTransaction({
    transaction,
    account,
  });
}

/**
 * Revoke approval for the staking contract
 * @param account - The wallet account to revoke approval from
 */
export async function revokeStakingApproval(account: any) {
  const nftContract = getNFTContract();

  const transaction = prepareContractCall({
    contract: nftContract,
    method: 'setApprovalForAll',
    params: [STAKING_CONTRACT_ADDRESS, false],
  });

  return await sendTransaction({
    transaction,
    account,
  });
}

/**
 * Get the staker's balance (number of NFTs staked)
 * @param stakerAddress - The address to check balance for
 * @returns Number of NFTs staked by the address
 */
export async function getStakerBalance(stakerAddress: string): Promise<number> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'stakerBalance',
    params: [stakerAddress],
  });

  return Number(result);
}

/**
 * Check if staking is currently active
 * @returns True if staking is active, false otherwise
 */
export async function isStakingActive(): Promise<boolean> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'stakingStarted',
    params: [],
  });

  return result as boolean;
}

/**
 * Get rewards per unit time configuration
 * @returns Rewards distributed per time unit
 */
export async function getRewardsPerUnitTime(): Promise<number> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'rewardsPerUnitTime',
    params: [],
  });

  return Number(result);
}

/**
 * Get time unit configuration (in seconds)
 * @returns Time unit in seconds
 */
export async function getTimeUnit(): Promise<number> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'timeUnit',
    params: [],
  });

  return Number(result);
}

/**
 * Get the reward token address
 * @returns Address of the reward token contract
 */
export async function getRewardTokenAddress(): Promise<string> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'rewardToken',
    params: [],
  });

  return result as string;
}

/**
 * Get the staking NFT token address
 * @returns Address of the NFT contract being staked
 */
export async function getStakingTokenAddress(): Promise<string> {
  const contract = getStakingContract();

  const result = await readContract({
    contract,
    method: 'stakingToken',
    params: [],
  });

  return result as string;
}

/**
 * Helper function to get detailed staked NFT information
 * @param tokenId - The token ID to get info for
 * @returns StakedNFT object with token details
 */
export async function getStakedNFTInfo(tokenId: number): Promise<StakedNFT | null> {
  const contract = getStakingContract();

  try {
    const stakerAddress = await readContract({
      contract,
      method: 'getStakerForToken',
      params: [BigInt(tokenId)],
    });

    if (!stakerAddress || stakerAddress === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    return {
      tokenId,
      stakerAddress: stakerAddress as string,
      stakingContract: STAKING_CONTRACT_ADDRESS,
      nftContract: NFT_CONTRACT_ADDRESS,
    };
  } catch (error) {
    console.error(`Error getting staked NFT info for token ${tokenId}:`, error);
    return null;
  }
}

/**
 * Batch check if multiple NFTs are staked
 * @param tokenIds - Array of token IDs to check
 * @returns Object mapping token IDs to their staking status
 */
export async function checkMultipleNFTsStaked(tokenIds: number[]): Promise<Record<number, boolean>> {
  const results: Record<number, boolean> = {};

  await Promise.all(
    tokenIds.map(async (tokenId) => {
      const info = await getStakedNFTInfo(tokenId);
      results[tokenId] = info !== null;
    })
  );

  return results;
}