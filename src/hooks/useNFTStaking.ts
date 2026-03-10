'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useUserNFTs, NFTMetadata } from './useUserNFTs';
import { useNFTStakingActions } from './useNFTStakingActions';
import { useUnifiedAuth } from './useUnifiedAuth';
import { Address } from 'viem';

export interface StakedNFT extends NFTMetadata {
  stakedAt?: number;
  claimableRewards?: bigint;
}

export function useNFTStaking() {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { user: unifiedUser, authProvider } = useUnifiedAuth();

  const [sociosAddressFromStorage, setSociosAddressFromStorage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('socios_wallet_address');
    }
    return null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkStorage = () => {
      const stored = localStorage.getItem('socios_wallet_address');
      if (stored !== sociosAddressFromStorage) {
        setSociosAddressFromStorage(stored);
      }
    };
    const interval = setInterval(checkStorage, 500);
    return () => clearInterval(interval);
  }, [sociosAddressFromStorage]);

  const address = wagmiAddress || (unifiedUser?.wallet?.address as Address) || (sociosAddressFromStorage as Address) || undefined;

  const {
    nfts,
    isLoading: isLoadingNFTs,
    refetch: refetchNFTs,
  } = useUserNFTs(undefined, { includeBurnStaked: true, includeLegacyStaked: true });
  const { stakeInfo, refetchStakeInfo } = useNFTStakingActions();

  // Memoize staked token IDs to prevent re-computation on every render
  const stakedTokenIdSet = useMemo(() => {
    const ids = stakeInfo?.stakedTokenIds || [];
    return new Set(ids.map(id => id.toString()));
  }, [stakeInfo?.stakedTokenIds]);

  // Use useMemo for derived state instead of useEffect + useState to avoid infinite loops
  const { stakedNFTs, legacyStakedNFTs, unstakedNFTs, isLoadingStaked } = useMemo(() => {
    if (!address || !nfts.length) {
      return {
        stakedNFTs: [] as StakedNFT[],
        legacyStakedNFTs: [] as StakedNFT[],
        unstakedNFTs: nfts,
        isLoadingStaked: false,
      };
    }

    const burnStaked: StakedNFT[] = [];
    const legacyStaked: StakedNFT[] = [];
    const unstaked: NFTMetadata[] = [];

    nfts.forEach(nft => {
      const isBurnStaked = nft.stakeSource === 'burn' || (!!nft.isStaked && nft.stakeSource === 'burn');
      const isLegacyStakedExplicit = nft.stakeSource === 'legacy';
      const isLegacyStakedByContract = stakedTokenIdSet.size > 0 && stakedTokenIdSet.has(nft.tokenId) && nft.stakeSource !== 'burn';

      if (isBurnStaked) {
        burnStaked.push(nft);
        return;
      }

      if (isLegacyStakedExplicit || isLegacyStakedByContract) {
        legacyStaked.push(nft);
        return;
      }

      unstaked.push(nft);
    });

    return {
      stakedNFTs: burnStaked,
      legacyStakedNFTs: legacyStaked,
      unstakedNFTs: unstaked,
      isLoadingStaked: false,
    };
  }, [address, nfts, stakedTokenIdSet]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refetchNFTs(),
      refetchStakeInfo(),
    ]);
  }, [refetchNFTs, refetchStakeInfo]);

  return {
    // NFT data
    stakedNFTs,
    legacyStakedNFTs,
    unstakedNFTs,
    allNFTs: nfts,

    // Loading states
    isLoading: isLoadingNFTs || isLoadingStaked,
    isLoadingNFTs,
    isLoadingStaked,

    // Staking data
    stakeInfo,

    // Functions
    refreshAll,
    refetchNFTs,
    refetchStakeInfo,

    // Derived states
    hasNFTs: nfts.length > 0,
    hasStakedNFTs: stakedNFTs.length > 0,
    hasLegacyStakedNFTs: legacyStakedNFTs.length > 0,
    hasUnstakedNFTs: unstakedNFTs.length > 0,
  };
}
