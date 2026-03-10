'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { Address } from 'viem';
import StakeERC721ABI from '@/abis/StakeERC721ABI.json';
import ERC721ABI from '@/abis/ERC721ABI.json';

const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT as Address;
const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as Address;

export interface StakeInfo {
  stakedTokenIds: bigint[];
  rewards: bigint;
}

export function useNFTStakingActions() {
  const { address } = useAccount();
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Separate transaction tracking for approval and staking
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | undefined>();
  const [stakingHash, setStakingHash] = useState<`0x${string}` | undefined>();
  const [currentOperation, setCurrentOperation] = useState<'approval' | 'staking' | 'unstaking' | 'claiming' | null>(null);

  const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract();

  // Track approval transaction separately
  const {
    isLoading: isApprovalConfirming,
    isSuccess: isApprovalConfirmed
  } = useWaitForTransactionReceipt({
    hash: approvalHash
  });

  // Track staking/unstaking/claiming transaction
  const {
    isLoading: isOperationConfirming,
    isSuccess: isOperationConfirmed
  } = useWaitForTransactionReceipt({
    hash: stakingHash
  });

  // Read stake info for current user - This correctly returns an array of token IDs!
  const { data: stakeInfo, refetch: refetchStakeInfo } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: StakeERC721ABI,
    functionName: 'getStakeInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Alternative: Also read from getStakedTokens for redundancy
  const { data: stakedTokens, refetch: refetchStakedTokens } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: StakeERC721ABI,
    functionName: 'getStakedTokens',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read approval status
  const { data: isApprovedForAll, refetch: refetchApproval } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: ERC721ABI,
    functionName: 'isApprovedForAll',
    args: address ? [address, STAKING_CONTRACT_ADDRESS] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read calculated rewards
  const { data: calculatedRewards, refetch: refetchRewards } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: StakeERC721ABI,
    functionName: 'calculateRewards',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read reward token balance (available rewards to claim)
  const { data: rewardTokenBalance, refetch: refetchRewardBalance } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: StakeERC721ABI,
    functionName: 'getRewardTokenBalance',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Update hash tracking when writeContract is called
  useEffect(() => {
    if (hash && currentOperation) {
      if (currentOperation === 'approval') {
        setApprovalHash(hash);
      } else {
        setStakingHash(hash);
      }
    }
  }, [hash, currentOperation]);

  // Handle approval confirmation
  useEffect(() => {
    if (isApprovalConfirmed && isApproving) {
      setIsApproving(false);
      setApprovalHash(undefined);
      setCurrentOperation(null);
      refetchApproval();
    }
  }, [isApprovalConfirmed, isApproving, refetchApproval]);

  // Handle operation confirmation
  useEffect(() => {
    if (isOperationConfirmed) {
      setIsStaking(false);
      setIsUnstaking(false);
      setIsClaiming(false);
      setStakingHash(undefined);
      setCurrentOperation(null);

      // Refetch all data
      refetchStakeInfo();
      refetchStakedTokens();
      refetchRewards();
      refetchRewardBalance();
    }
  }, [isOperationConfirmed, refetchStakeInfo, refetchStakedTokens, refetchRewards, refetchRewardBalance]);

  // Approve staking contract to transfer NFTs
  const approveStaking = useCallback(async () => {
    if (!address) throw new Error('No wallet connected');

    setIsApproving(true);
    setCurrentOperation('approval');

    try {
      await writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: ERC721ABI,
        functionName: 'setApprovalForAll',
        args: [STAKING_CONTRACT_ADDRESS, true],
      });
      // Don't set isApproving to false here - wait for confirmation
    } catch (error) {
      console.error('Approval error:', error);
      setIsApproving(false);
      setCurrentOperation(null);
      throw error;
    }
  }, [address, writeContract]);

  // Stake single NFT
  const stakeSingleNFT = useCallback(
    async (tokenId: bigint) => {
      if (!address) throw new Error('No wallet connected');
      if (!isApprovedForAll) throw new Error('Please approve staking contract first');

      setIsStaking(true);
      setCurrentOperation('staking');

      try {
        await writeContract({
          address: STAKING_CONTRACT_ADDRESS,
          abi: StakeERC721ABI,
          functionName: 'stake',
          args: [tokenId],
        });
        // Don't set isStaking to false here - wait for confirmation
      } catch (error) {
        console.error('Stake error:', error);
        setIsStaking(false);
        setCurrentOperation(null);
        throw error;
      }
    },
    [address, writeContract, isApprovedForAll]
  );

  // Stake multiple NFTs
  const stakeMultipleNFTs = useCallback(
    async (tokenIds: bigint[]) => {
      if (!address) throw new Error('No wallet connected');
      if (tokenIds.length === 0) throw new Error('No NFTs selected');
      if (!isApprovedForAll) throw new Error('Please approve staking contract first');

      setIsStaking(true);
      setCurrentOperation('staking');

      try {
        await writeContract({
          address: STAKING_CONTRACT_ADDRESS,
          abi: StakeERC721ABI,
          functionName: 'stake',
          args: [tokenIds],
        });
        // Don't set isStaking to false here - wait for confirmation
      } catch (error) {
        console.error('Stake multiple error:', error);
        setIsStaking(false);
        setCurrentOperation(null);
        throw error;
      }
    },
    [address, writeContract, isApprovedForAll]
  );

  // Unstake single NFT
  const unstakeSingleNFT = useCallback(
    async (tokenId: bigint) => {
      if (!address) throw new Error('No wallet connected');

      setIsUnstaking(true);
      setCurrentOperation('unstaking');

      try {
        await writeContract({
          address: STAKING_CONTRACT_ADDRESS,
          abi: StakeERC721ABI,
          functionName: 'withdraw',
          args: [tokenId],
        });
        // Don't set isUnstaking to false here - wait for confirmation
      } catch (error) {
        console.error('Unstake error:', error);
        setIsUnstaking(false);
        setCurrentOperation(null);
        throw error;
      }
    },
    [address, writeContract]
  );

  // Unstake multiple NFTs
  const unstakeMultipleNFTs = useCallback(
    async (tokenIds: bigint[]) => {
      if (!address) throw new Error('No wallet connected');
      if (tokenIds.length === 0) throw new Error('No NFTs selected');

      setIsUnstaking(true);
      setCurrentOperation('unstaking');

      try {
        await writeContract({
          address: STAKING_CONTRACT_ADDRESS,
          abi: StakeERC721ABI,
          functionName: 'withdraw',
          args: [tokenIds],
        });
        // Don't set isUnstaking to false here - wait for confirmation
      } catch (error) {
        console.error('Unstake multiple error:', error);
        setIsUnstaking(false);
        setCurrentOperation(null);
        throw error;
      }
    },
    [address, writeContract]
  );

  // Claim rewards
  const claimRewards = useCallback(async () => {
    if (!address) throw new Error('No wallet connected');

    setIsClaiming(true);
    setCurrentOperation('claiming');

    try {
      await writeContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: StakeERC721ABI,
        functionName: 'claimRewards',
        args: [],
      });
      // Don't set isClaiming to false here - wait for confirmation
    } catch (error) {
      console.error('Claim rewards error:', error);
      setIsClaiming(false);
      setCurrentOperation(null);
      throw error;
    }
  }, [address, writeContract]);

  // Parse stake info - Correctly parse the array of token IDs
  const parsedStakeInfo = stakeInfo ? {
    stakedTokenIds: (stakeInfo as any)[0] as bigint[],
    rewards: (stakeInfo as any)[1] as bigint,
  } : null;

  // Use stakedTokens as fallback or primary source
  const finalStakedTokenIds = parsedStakeInfo?.stakedTokenIds || (stakedTokens as bigint[]) || [];

  return {
    // States
    isStaking,
    isUnstaking,
    isClaiming,
    isApproving,
    isWritePending,

    // Separate confirmation states for better UI feedback
    isApprovalConfirming,
    isApprovalConfirmed,
    isOperationConfirming,
    isOperationConfirmed,

    // Combined confirming state for backward compatibility
    isConfirming: isApprovalConfirming || isOperationConfirming,
    isConfirmed: isApprovalConfirmed || isOperationConfirmed,

    writeError,

    // Data - Now correctly returning array of staked token IDs
    stakeInfo: parsedStakeInfo ? {
      ...parsedStakeInfo,
      stakedTokenIds: finalStakedTokenIds,
    } : null,
    isApprovedForAll: isApprovedForAll as boolean | undefined,
    calculatedRewards: calculatedRewards as bigint | undefined,
    rewardTokenBalance: rewardTokenBalance as bigint | undefined,

    // Additional data for UI
    stakedTokenIds: finalStakedTokenIds,

    // Functions
    approveStaking,
    stakeSingleNFT,
    stakeMultipleNFTs,
    unstakeSingleNFT,
    unstakeMultipleNFTs,
    claimRewards,

    // Refetch functions
    refetchStakeInfo,
    refetchStakedTokens,
    refetchApproval,
    refetchRewards,
    refetchRewardBalance,

    // Derived states
    hasApproval: isApprovedForAll === true,
    needsApproval: isApprovedForAll === false,
    totalStaked: finalStakedTokenIds.length,
    hasRewardsToClaim: rewardTokenBalance ? rewardTokenBalance > 0n : false,

    // Transaction states for UI
    currentOperation,
    isWaitingForApproval: isApproving && !isApprovalConfirmed,
    isWaitingForStaking: isStaking && !isOperationConfirmed,
  };
}