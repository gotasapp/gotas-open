'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { Address, parseEther } from 'viem';
import FTStakingABI from '@/abis/FTStakingABI.json';

const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT as Address;

export interface StakeData {
  totalStake: bigint;
  totalUnstakable: bigint;
  totalLocked: bigint;
  totalClaimable: bigint;
  totalPendingUnstake: bigint;
}

export function useStaking() {
  const { address } = useAccount();
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Read stake data for current user
  const { data: stakeData, refetch: refetchStakeData } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: FTStakingABI,
    functionName: 'getStakeData',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Stake tokens
  const stake = useCallback(
    async (amount: string, tokenAddress: Address) => {
      if (!address) throw new Error('No wallet connected');

      setIsStaking(true);
      try {
        const amountWei = parseEther(amount);
        await writeContract({
          address: STAKING_CONTRACT_ADDRESS,
          abi: FTStakingABI,
          functionName: 'stake',
          args: [address, amountWei, tokenAddress],
        });
      } catch (error) {
        console.error('Stake error:', error);
        throw error;
      } finally {
        setIsStaking(false);
      }
    },
    [address, writeContract]
  );

  // Unstake tokens
  const unstake = useCallback(
    async (amount: string, tokenAddress: Address) => {
      if (!address) throw new Error('No wallet connected');

      setIsUnstaking(true);
      try {
        const amountWei = parseEther(amount);
        await writeContract({
          address: STAKING_CONTRACT_ADDRESS,
          abi: FTStakingABI,
          functionName: 'unstake',
          args: [amountWei, tokenAddress],
        });
      } catch (error) {
        console.error('Unstake error:', error);
        throw error;
      } finally {
        setIsUnstaking(false);
      }
    },
    [address, writeContract]
  );

  // Claim rewards
  const claim = useCallback(
    async (tokenAddress: Address) => {
      if (!address) throw new Error('No wallet connected');

      setIsClaiming(true);
      try {
        await writeContract({
          address: STAKING_CONTRACT_ADDRESS,
          abi: FTStakingABI,
          functionName: 'claim',
          args: [tokenAddress],
        });
      } catch (error) {
        console.error('Claim error:', error);
        throw error;
      } finally {
        setIsClaiming(false);
      }
    },
    [address, writeContract]
  );

  // Auto-refetch stake data on transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      refetchStakeData();
    }
  }, [isConfirmed, refetchStakeData]);

  return {
    // States
    isStaking,
    isUnstaking,
    isClaiming,
    isWritePending,
    isConfirming,
    isConfirmed,
    writeError,

    // Data
    stakeData: stakeData as StakeData | undefined,

    // Functions
    stake,
    unstake,
    claim,
    refetchStakeData,
  };
}
