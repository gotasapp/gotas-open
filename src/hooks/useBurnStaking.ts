/**
 * useBurnStaking Hook
 *
 * React hook for NFT burn/staking operations with fee-based rewards
 * User stakes NFTs, earns CHZ rewards from the contract
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnectorClient } from 'wagmi';
import type { WalletClient } from 'viem';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useSociosSession } from '@/components/providers/SociosSessionProvider';
import { EIP1193 } from 'thirdweb/wallets';
import { thirdwebClient } from '@/lib/thirdweb-client';
import {
  stakeBurnNFT,
  stakeBurnNFTsBatch,
  unstakeBurnNFT,
  claimBurnRewards,
  getStakedTokens,
  getClaimableTokens,
  calculateRewardBreakdown,
  getRewardAmount,
  isRewardClaimed,
  getTotalStaked,
  getBalanceInfo,
  isPaused,
  getFixedReward,
  getMinStakingDuration,
  getFeePercentage,
  getMaxStakesPerUser,
  approveNFTForStaking,
  isApprovedForStaking,
  canUnstake,
  isContractConfigured,
  isWhitelisted as checkWhitelisted,
  isTokenRewardClaimed,
} from '@/lib/burn-staking-contract';

import type { BurnStakingStats, RewardBreakdown } from '@/types/burn-staking';

interface UseBurnStakingReturn {
  // State
  stats: BurnStakingStats;
  rewardBreakdown: RewardBreakdown | null;
  isApproved: boolean;
  isWhitelisted: boolean;
  isPaused: boolean;
  fixedReward: bigint;
  minDuration: number;
  feePercentage: number;
  maxStakesPerUser: number;
  isContractConfigured: boolean;

  // Actions
  stake: (tokenId: number) => Promise<void>;
  stakeBatch: (tokenIds: number[]) => Promise<void>;
  unstake: (tokenId: number) => Promise<void>;
  claim: () => Promise<void>;
  approve: () => Promise<void>;
  addToWhitelist: () => Promise<void>;
  checkWhitelist: () => Promise<boolean>;

  // Utilities
  refresh: () => Promise<void>;
  canUnstakeToken: (tokenId: number) => Promise<boolean>;
}

type EIP1193ProviderLike = {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
};

function createProviderFromWalletClient(walletClient: WalletClient): EIP1193ProviderLike {
  const request = async ({ method, params }: { method: string; params?: any[] }) => {
    if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
      const address = walletClient.account?.address;
      return address ? [address] : [];
    }

    if (method === 'eth_chainId') {
      const chainId = walletClient.chain?.id;
      if (typeof chainId === 'number') {
        return `0x${chainId.toString(16)}`;
      }
    }

    return walletClient.request({
      method: method as any,
      params: params as any,
    });
  };

  const noop = () => {};

  return {
    request,
    on: noop,
    removeListener: noop,
  };
}

async function resolveProvider(
  connector: any,
  connectorClient: WalletClient | undefined | null,
  sociosProvider?: any, // Provider direto do Socios se disponível
): Promise<EIP1193ProviderLike | null> {
  // Se tiver sociosProvider, usar ele diretamente
  if (sociosProvider) {
    console.log('[BURN] Usando sociosProvider direto');
    return sociosProvider as EIP1193ProviderLike;
  }

  if (connector && typeof connector.getProvider === 'function') {
    const provider = await connector.getProvider();
    if (provider) {
      return provider as EIP1193ProviderLike;
    }
  }

  if (connectorClient) {
    return createProviderFromWalletClient(connectorClient);
  }

  return null;
}

/**
 * Hook for managing burn/staking operations
 */
export function useBurnStaking(): UseBurnStakingReturn {
  const { address: wagmiAddress, connector, chainId } = useAccount();
  const { data: connectorClient } = useConnectorClient({ chainId });
  const { user: unifiedUser, authProvider } = useUnifiedAuth();
  
  const address = (unifiedUser?.wallet?.address as `0x${string}` | undefined) || wagmiAddress;

  // Tentar obter sessão Socios (com fallback se fora do contexto)
  let sociosSession: { getProvider: () => Promise<any> } | null = null;
  try {
    sociosSession = useSociosSession();
  } catch {
    // Fora do contexto Socios - ok, usar Privy
  }

  // State
  const [thirdwebAccount, setThirdwebAccount] = useState<any>(null);
  const [stats, setStats] = useState<BurnStakingStats>({
    totalStaked: 0,
    availableRewards: BigInt(0),
    netRewards: BigInt(0),
    feeAmount: BigInt(0),
    userStakedTokens: [],
    isLoading: true,
    error: null,
  });
  const [rewardBreakdown, setRewardBreakdown] = useState<RewardBreakdown | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [isPausedState, setIsPausedState] = useState(false);
  const [fixedReward, setFixedReward] = useState(BigInt(0));
  const [minDuration, setMinDuration] = useState(0);
  const [feePercentage, setFeePercentage] = useState(0);
  const [maxStakesPerUser, setMaxStakesPerUser] = useState(50);

  /**
   * Create Thirdweb account from Wagmi connector
   * Detecta se é Socios Wallet e usa o provider correto do contexto Socios
   */
  useEffect(() => {
    async function createThirdwebAdapter() {
      if (!address) {
        setThirdwebAccount(null);
        return;
      }

      try {
        let provider: EIP1193ProviderLike | null = null;

        // Se for Socios, usar provider do contexto Socios (wagmi do Socios, não do Privy)
        if (authProvider === 'socios' && sociosSession) {
          console.log('[BURN] Detectado authProvider=socios, obtendo provider do SociosSession');
          const sociosProvider = await sociosSession.getProvider();
          provider = await resolveProvider(null, null, sociosProvider);
        } else {
          // Privy: usar lógica existente (connector/connectorClient do wagmi Privy)
          console.log('[BURN] Usando provider do Privy/Wagmi padrão');
          provider = await resolveProvider(connector, connectorClient);
        }

        if (!provider) {
          console.warn('[BURN] No EIP-1193 provider resolved for burn staking');
          setThirdwebAccount(null);
          return;
        }

        const wallet = EIP1193.fromProvider({
          provider,
        });

        const account = await wallet.connect({
          client: thirdwebClient,
        });

        console.log('[BURN] Thirdweb adapter criado com sucesso');
        setThirdwebAccount(account);
      } catch (err) {
        console.error('[BURN] Error creating Thirdweb adapter:', err);
        setStats(prev => ({
          ...prev,
          error: 'Failed to create wallet adapter',
        }));
      }
    }

    createThirdwebAdapter();
  }, [address, connector, connectorClient, authProvider, sociosSession]);

  /**
   * Load all burn/staking data
   */
  const loadStakingData = useCallback(async () => {
    if (!address) {
      setStats(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Check if contract is configured
    if (!isContractConfigured()) {
      console.warn('[BURN HOOK] Burn staking contract not configured');
      setStats({
        totalStaked: 0,
        availableRewards: BigInt(0),
        netRewards: BigInt(0),
        feeAmount: BigInt(0),
        userStakedTokens: [],
        isLoading: false,
        error: 'Burn staking contract not configured',
      });
      setRewardBreakdown(null);
      setIsApproved(false);
      setIsWhitelisted(false);
      setIsPausedState(true);
      setFixedReward(BigInt(0));
      setMinDuration(0);
      setFeePercentage(0);
      return;
    }

    setStats(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Parallel data fetching (whitelist check removed - only on burn click)
      const [
        totalStaked,
        userStaked,
        breakdown,
        approved,
        paused,
        reward,
        duration,
        fee,
        maxStakes,
      ] = await Promise.all([
        getTotalStaked(),
        getStakedTokens(address),
        calculateRewardBreakdown(address),
        isApprovedForStaking(address),
        isPaused(),
        getFixedReward(),
        getMinStakingDuration(),
        getFeePercentage(),
        getMaxStakesPerUser(),
      ]);

      setStats({
        totalStaked,
        availableRewards: breakdown.grossReward,
        netRewards: breakdown.netReward,
        feeAmount: breakdown.feeAmount,
        userStakedTokens: userStaked,
        isLoading: false,
        error: null,
      });

      setRewardBreakdown(breakdown);
      setIsApproved(approved);
      // isWhitelisted will be checked only when user clicks burn
      setIsPausedState(paused);
      setFixedReward(reward);
      setMinDuration(duration);
      setFeePercentage(fee);
      setMaxStakesPerUser(maxStakes);
    } catch (err) {
      console.error('Error loading burn staking data:', err);
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load staking data',
      }));
    }
  }, [address]);

  /**
   * Load data on mount and account change
   */
  useEffect(() => {
    loadStakingData();
  }, [loadStakingData]);

  /**
   * Stake (burn) multiple NFTs (batch aware)
   */
  const stakeBatch = useCallback(
    async (tokenIds: number[]) => {
      if (!thirdwebAccount) {
        throw new Error('No active account');
      }

      if (!isContractConfigured()) {
        throw new Error('Burn staking contract not configured');
      }

      const uniqueIds = [...new Set(tokenIds.map(id => Number(id)).filter(id => !Number.isNaN(id)))];
      if (uniqueIds.length === 0) {
        return;
      }

      setStats(prev => ({ ...prev, error: null }));

      try {
        if (!isApproved) {
          console.log('Approving NFTs for staking...');
          await approveNFTForStaking(thirdwebAccount);
          setIsApproved(true);
        }

        console.log(`Staking (burning) NFTs ${uniqueIds.join(', ')}...`);
        if (uniqueIds.length === 1) {
          await stakeBurnNFT(uniqueIds[0], thirdwebAccount);
        } else {
          await stakeBurnNFTsBatch(uniqueIds, thirdwebAccount);
        }

        await loadStakingData();
      } catch (err) {
        console.error('Burn staking batch error:', err);
        let errorMsg = err instanceof Error ? err.message : 'Failed to stake NFTs';
        
        if (errorMsg.includes('DENIED_TRANSACTION') || errorMsg.includes('denied') || errorMsg.includes('rejected')) {
          errorMsg = 'Transação rejeitada pelo usuário';
        } else if (errorMsg.toLowerCase().includes('user rejected')) {
          errorMsg = 'Transação rejeitada pelo usuário';
        }
        
        setStats(prev => ({ ...prev, error: errorMsg }));
        throw err;
      }
    },
    [approveNFTForStaking, isApproved, loadStakingData, thirdwebAccount],
  );

  /**
   * Stake (burn) a single NFT
   */
  const stake = useCallback(
    async (tokenId: number) => {
      await stakeBatch([tokenId]);
    },
    [stakeBatch],
  );

  /**
   * Unstake (recover) a single NFT
   */
  const unstake = useCallback(async (tokenId: number) => {
    if (!thirdwebAccount) {
      throw new Error('No active account');
    }

    setStats(prev => ({ ...prev, error: null }));

    try {
      console.log(`Unstaking (recovering) NFT ${tokenId}...`);
      await unstakeBurnNFT(tokenId, thirdwebAccount);
      await loadStakingData();
    } catch (err) {
      console.error('Unstake error:', err);
      let errorMsg = err instanceof Error ? err.message : 'Failed to unstake NFT';
      
      if (errorMsg.includes('DENIED_TRANSACTION') || errorMsg.includes('denied') || errorMsg.includes('rejected')) {
        errorMsg = 'Transação rejeitada pelo usuário';
      } else if (errorMsg.toLowerCase().includes('user rejected')) {
        errorMsg = 'Transação rejeitada pelo usuário';
      }
      
      setStats(prev => ({ ...prev, error: errorMsg }));
      throw err;
    }
  }, [thirdwebAccount, loadStakingData]);

  /**
   * Claim rewards
   */
  const claim = useCallback(async () => {
    if (!thirdwebAccount) {
      throw new Error('No active account');
    }
    if (!address) {
      throw new Error('Carteira não conectada');
    }

    setStats(prev => ({ ...prev, error: null }));

    try {
      console.log('Claiming burn staking rewards...');
      if (!stats.userStakedTokens || stats.userStakedTokens.length === 0) {
        throw new Error('Nenhum NFT em stake para reivindicar recompensas');
      }

      let claimableTokenIds: number[] = [];
      let claimableLookupFailed = false;

      try {
        claimableTokenIds = await getClaimableTokens(address);
      } catch (claimableError) {
        claimableLookupFailed = true;
        console.warn('[BURN HOOK] Failed to fetch claimable tokens, falling back to manual status checks:', claimableError);
      }

      if (claimableLookupFailed) {
        console.log('[BURN HOOK] Checking token claim statuses individually...');
        const tokenStatuses = await Promise.all(
          stats.userStakedTokens.map(async tokenId => {
            try {
              return await isTokenRewardClaimed(tokenId);
            } catch (statusError) {
              console.warn(`[BURN HOOK] Could not fetch claim status for token ${tokenId}:`, statusError);
              return false;
            }
          }),
        );
        claimableTokenIds = stats.userStakedTokens.filter((_, index) => tokenStatuses[index] === false);
      }

      if (!claimableTokenIds.length) {
        throw new Error('Nenhum NFT elegível para claim (recompensas já coletadas ou indisponíveis)');
      }

      await claimBurnRewards(thirdwebAccount, claimableTokenIds);
      await loadStakingData();
    } catch (err) {
      console.error('Claim rewards error:', err);
      let errorMsg = err instanceof Error ? err.message : 'Failed to claim rewards';
      
      if (errorMsg.includes('DENIED_TRANSACTION') || errorMsg.includes('denied') || errorMsg.includes('rejected')) {
        errorMsg = 'Transação rejeitada pelo usuário';
      } else if (errorMsg.toLowerCase().includes('user rejected')) {
        errorMsg = 'Transação rejeitada pelo usuário';
      }
      
      setStats(prev => ({ ...prev, error: errorMsg }));
      throw err;
    }
  }, [address, thirdwebAccount, loadStakingData, stats.userStakedTokens]);

  /**
   * Approve NFT for staking
   */
  const approve = useCallback(async () => {
    if (!thirdwebAccount) {
      throw new Error('No active account');
    }

    setStats(prev => ({ ...prev, error: null }));

    try {
      console.log('Approving NFT for burn staking...');
      await approveNFTForStaking(thirdwebAccount);
      setIsApproved(true);
    } catch (err) {
      console.error('Approval error:', err);
      let errorMsg = err instanceof Error ? err.message : 'Failed to approve NFT';
      
      if (errorMsg.includes('DENIED_TRANSACTION') || errorMsg.includes('denied') || errorMsg.includes('rejected')) {
        errorMsg = 'Transação rejeitada pelo usuário';
      } else if (errorMsg.toLowerCase().includes('user rejected')) {
        errorMsg = 'Transação rejeitada pelo usuário';
      }
      
      setStats(prev => ({ ...prev, error: errorMsg }));
      throw err;
    }
  }, [thirdwebAccount]);

  /**
   * Check if user can unstake a specific token
   */
  const canUnstakeToken = useCallback(async (tokenId: number) => {
    if (!address) return false;

    try {
      return await canUnstake(address, tokenId);
    } catch (err) {
      console.error('Error checking unstake status:', err);
      return false;
    }
  }, [address]);

  /**
   * Check if user is whitelisted (on-demand via RPC)
   * This is called ONLY when user clicks burn, not on page load
   */
  const checkWhitelist = useCallback(async (): Promise<boolean> => {
    if (!address) {
      console.warn('[BURN HOOK] No address provided for whitelist check');
      return false;
    }

    try {
      console.log('[BURN HOOK] Checking whitelist status via RPC...');
      const whitelisted = await checkWhitelisted(address);
      console.log(`[BURN HOOK] Whitelist status for ${address}: ${whitelisted}`);

      setIsWhitelisted(whitelisted);
      return whitelisted;
    } catch (err) {
      console.error('[BURN HOOK] Error checking whitelist:', err);
      return false;
    }
  }, [address]);

  /**
   * Add user to whitelist
   * Calls API route that uses backend wallet to execute setWhitelist()
   * Verifies on-chain via RPC before updating state
   */
  const addToWhitelist = useCallback(async () => {
    if (!address) {
      throw new Error('No active account');
    }

    setStats(prev => ({ ...prev, error: null }));

    try {
      console.log('[BURN HOOK] Adding user to whitelist via API...');

      const response = await fetch('/api/whitelist/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add to whitelist');
      }

      const result = await response.json();
      console.log('[BURN HOOK] Whitelist response:', result);

      // Verificar on-chain via RPC após API call
      console.log('[BURN HOOK] Verifying whitelist status on-chain via RPC...');
      const actuallyWhitelisted = await checkWhitelisted(address);

      if (!actuallyWhitelisted) {
        console.error('[BURN HOOK] Verification failed: User not whitelisted on-chain');
        throw new Error('Transaction succeeded but user not whitelisted on-chain. Please try again.');
      }

      console.log('[BURN HOOK] Successfully verified user is whitelisted on-chain');
      setIsWhitelisted(true);
    } catch (err) {
      console.error('[BURN HOOK] Add to whitelist error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to add to whitelist';
      setStats(prev => ({ ...prev, error: errorMsg }));
      throw err;
    }
  }, [address]);

  return {
    // State
    stats,
    rewardBreakdown,
    isApproved,
    isWhitelisted,
    isPaused: isPausedState,
    fixedReward,
    minDuration,
    feePercentage,
    maxStakesPerUser,
    isContractConfigured: isContractConfigured(),

    // Actions
    stake,
    stakeBatch,
    unstake,
    claim,
    approve,
    addToWhitelist,
    checkWhitelist,

    // Utilities
    refresh: loadStakingData,
    canUnstakeToken,
  };
}
