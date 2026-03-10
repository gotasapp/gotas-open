/**
 * useNFTStakingHook
 *
 * Hook otimizado para burn staking que busca dados APENAS do novo contrato StakeNFTWithFee
 * Não usa banco de dados, busca tudo onchain
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { getStakedTokens, isContractConfigured } from '@/lib/burn-staking-contract';
import { getNFTContract, thirdwebClient, getActiveChain } from '@/lib/thirdweb-client';
import { getNFT, getOwnedNFTs } from 'thirdweb/extensions/erc721';
import { getOptimizedIpfsUrl, isIpfsUrl } from '@/utils/ipfs-utils';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { readContract, getContract } from 'thirdweb';
import ERC721ABI from '@/abis/ERC721ABI.json';

export interface NFTWithMetadata {
  tokenId: string;
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  claimableRewards?: bigint;
  stakedAt?: number;
}

export interface BurnNFTStakingData {
  stakedNFTs: NFTWithMetadata[];
  unstakedNFTs: NFTWithMetadata[];
  allNFTs: NFTWithMetadata[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook que busca NFTs do usuário e identifica quais estão no burn staking
 */
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

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'socios_wallet_address') {
        const newAddress = e.newValue;
        console.log('[useNFTStaking] Storage mudou, novo endereço:', newAddress);
        setSociosAddressFromStorage(newAddress);
      }
    };

    const checkStorage = () => {
      const stored = localStorage.getItem('socios_wallet_address');
      if (stored !== sociosAddressFromStorage) {
        console.log('[useNFTStaking] Endereço no storage mudou:', stored);
        setSociosAddressFromStorage(stored);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(checkStorage, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [sociosAddressFromStorage]);

  const address = wagmiAddress || unifiedUser?.wallet?.address || sociosAddressFromStorage || undefined;

  const [stakedNFTs, setStakedNFTs] = useState<NFTWithMetadata[]>([]);
  const [unstakedNFTs, setUnstakedNFTs] = useState<NFTWithMetadata[]>([]);
  const [allUserNFTs, setAllUserNFTs] = useState<NFTWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca metadados de um NFT específico
   */
  const fetchNFTMetadata = useCallback(async (tokenId: string): Promise<NFTWithMetadata> => {
    try {
      const contract = getNFTContract();
      const nftData = await getNFT({
        contract,
        tokenId: BigInt(tokenId),
      });

      // Processar imagem IPFS
      let processedImage = nftData.metadata?.image || '';
      if (processedImage && isIpfsUrl(processedImage)) {
        processedImage = getOptimizedIpfsUrl(processedImage, 'image');
      }

      return {
        tokenId,
        name: nftData.metadata?.name || `NFT #${tokenId}`,
        description: nftData.metadata?.description || '',
        image: processedImage,
        attributes: Array.isArray(nftData.metadata?.attributes)
          ? nftData.metadata.attributes.map((attr: any) => ({
              trait_type: attr.trait_type || '',
              value: attr.value || '',
            }))
          : [],
      };
    } catch (err) {
      console.error(`Erro ao buscar metadados do NFT #${tokenId}:`, err);
      // Retorna dados básicos em caso de erro
      return {
        tokenId,
        name: `NFT #${tokenId}`,
        description: '',
        image: '/placeholder-card.svg',
        attributes: [],
      };
    }
  }, []);

  /**
   * Busca todos os NFTs do usuário (wallet + staked)
   */
  const fetchUserNFTs = useCallback(async (targetAddress?: string) => {
    const effectiveAddress = targetAddress || address;
    
    if (!effectiveAddress) {
      console.log('[useNFTStaking] fetchUserNFTs: Sem endereço, retornando array vazio');
      return [];
    }

    try {
      console.log(`[useNFTStaking] fetchUserNFTs: Buscando NFTs para endereço: ${effectiveAddress}`);
      const contract = getNFTContract();
      console.log(`[useNFTStaking] fetchUserNFTs: Contrato NFT: ${contract.address}`);

      let ownedNFTs: any[] = [];

      try {
        ownedNFTs = await getOwnedNFTs({
          contract,
          owner: effectiveAddress,
        });
        console.log(`[useNFTStaking] fetchUserNFTs: Encontrados ${ownedNFTs.length} NFTs via getOwnedNFTs`);
      } catch (getOwnedNFTsError) {
        console.warn('[useNFTStaking] getOwnedNFTs falhou, tentando método alternativo:', getOwnedNFTsError);
        
        try {
          const erc721Contract = getContract({
            client: thirdwebClient,
            chain: getActiveChain(),
            address: contract.address,
            abi: ERC721ABI,
          });

          const balance = await readContract({
            contract: erc721Contract,
            method: 'function balanceOf(address owner) view returns (uint256)',
            params: [effectiveAddress],
          });

          const balanceNum = Number(balance);
          console.log(`[useNFTStaking] fetchUserNFTs: Balance encontrado: ${balanceNum} NFTs`);

          if (balanceNum > 0) {
            const tokenIds: bigint[] = [];
            for (let i = 0; i < balanceNum; i++) {
              try {
                const tokenId = await readContract({
                  contract: erc721Contract,
                  method: 'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
                  params: [effectiveAddress, BigInt(i)],
                });
                tokenIds.push(tokenId);
              } catch (err) {
                console.warn(`[useNFTStaking] Erro ao buscar tokenId no índice ${i}:`, err);
              }
            }

            console.log(`[useNFTStaking] fetchUserNFTs: Token IDs encontrados: ${tokenIds.map(id => id.toString()).join(', ')}`);

            const nftPromises = tokenIds.map(async (tokenId) => {
              try {
                const nftData = await getNFT({
                  contract,
                  tokenId,
                });
                return {
                  id: tokenId,
                  metadata: nftData.metadata,
                };
              } catch (err) {
                console.warn(`[useNFTStaking] Erro ao buscar metadados do NFT #${tokenId}:`, err);
                return null;
              }
            });

            const nftResults = await Promise.all(nftPromises);
            ownedNFTs = nftResults.filter((nft): nft is { id: bigint; metadata: any } => nft !== null);
            console.log(`[useNFTStaking] fetchUserNFTs: ${ownedNFTs.length} NFTs recuperados via método alternativo`);
          }
        } catch (altError) {
          console.error('[useNFTStaking] Método alternativo também falhou:', altError);
          throw altError;
        }
      }

      const nfts: NFTWithMetadata[] = ownedNFTs.map((nft) => {
        let processedImage = nft.metadata?.image || '';
        if (processedImage && isIpfsUrl(processedImage)) {
          processedImage = getOptimizedIpfsUrl(processedImage, 'image');
        }

        return {
          tokenId: nft.id.toString(),
          name: nft.metadata?.name || `NFT #${nft.id}`,
          description: nft.metadata?.description || '',
          image: processedImage,
          attributes: Array.isArray(nft.metadata?.attributes)
            ? nft.metadata.attributes.map((attr: any) => ({
                trait_type: attr.trait_type || '',
                value: attr.value || '',
              }))
            : [],
        };
      });

      console.log(`[useNFTStaking] fetchUserNFTs: Retornando ${nfts.length} NFTs processados`);
      return nfts;
    } catch (err) {
      console.error('[useNFTStaking] Erro ao buscar NFTs do usuário:', err);
      console.error('[useNFTStaking] Detalhes do erro:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        address: effectiveAddress,
      });
      return [];
    }
  }, [address]);

  /**
   * Carrega todos os dados
   */
  const loadNFTData = useCallback(async () => {
    if (!address) {
      console.log('[useNFTStaking] loadNFTData: Sem endereço, limpando estados', {
        wagmiAddress,
        unifiedAddress: unifiedUser?.wallet?.address,
        authProvider,
      });
      setStakedNFTs([]);
      setUnstakedNFTs([]);
      setAllUserNFTs([]);
      return;
    }

    console.log(`[useNFTStaking] loadNFTData: Iniciando busca para endereço: ${address}`, {
      source: wagmiAddress ? 'wagmi' : 'unifiedAuth',
      authProvider,
      wagmiAddress,
      unifiedAddress: unifiedUser?.wallet?.address,
    });
    setIsLoading(true);
    setError(null);

    try {
      let stakedTokenIds: number[] = [];

      if (isContractConfigured()) {
        console.log('[useNFTStaking] loadNFTData: Contrato de burn configurado, buscando tokens queimados...');
        stakedTokenIds = await getStakedTokens(address);
        console.log(`[useNFTStaking] loadNFTData: Token IDs em stake no burn contract: ${stakedTokenIds.length > 0 ? stakedTokenIds.join(', ') : 'nenhum'}`);
      } else {
        console.log('[useNFTStaking] loadNFTData: ⚠️ Contrato de burn não configurado, pulando busca de tokens queimados');
      }

      console.log('[useNFTStaking] loadNFTData: Buscando NFTs na carteira do usuário...');
      const walletNFTs = await fetchUserNFTs(address);
      console.log(`[useNFTStaking] loadNFTData: NFTs encontrados na carteira: ${walletNFTs.length}`);
      if (walletNFTs.length > 0) {
        console.log(`[useNFTStaking] loadNFTData: Token IDs na carteira: ${walletNFTs.map(n => n.tokenId).join(', ')}`);
      }

      const stakedNFTsData: NFTWithMetadata[] = [];

      for (const tokenId of stakedTokenIds) {
        console.log(`[useNFTStaking] loadNFTData: Buscando metadados do NFT #${tokenId} (queimado)...`);
        const metadata = await fetchNFTMetadata(tokenId.toString());
        stakedNFTsData.push(metadata);
      }

      const unstakedNFTsData = walletNFTs;
      const allNFTs = [...walletNFTs, ...stakedNFTsData];

      console.log(`[useNFTStaking] loadNFTData: ✅ Resumo final:`);
      console.log(`   - ${stakedNFTsData.length} queimados (no burn contract)`);
      console.log(`   - ${unstakedNFTsData.length} disponíveis (na carteira)`);
      console.log(`   - ${allNFTs.length} total`);

      setStakedNFTs(stakedNFTsData);
      setUnstakedNFTs(unstakedNFTsData);
      setAllUserNFTs(allNFTs);
    } catch (err) {
      console.error('[useNFTStaking] loadNFTData: ❌ Erro ao carregar dados dos NFTs:', err);
      console.error('[useNFTStaking] loadNFTData: Detalhes do erro:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        address,
        wagmiAddress,
        unifiedAddress: unifiedUser?.wallet?.address,
        sociosStorage: sociosAddressFromStorage,
      });
      setError(err instanceof Error ? err.message : 'Erro ao carregar NFTs');
    } finally {
      setIsLoading(false);
    }
  }, [address, fetchUserNFTs, fetchNFTMetadata, wagmiAddress, unifiedUser, authProvider, sociosAddressFromStorage, wagmiConnected]);

  /**
   * Carrega dados na montagem e mudança de conta
   */
  useEffect(() => {
    console.log('[useNFTStaking] useEffect disparado, endereço atual:', address, {
      wagmiAddress,
      unifiedAddress: unifiedUser?.wallet?.address,
      sociosStorage: sociosAddressFromStorage,
      authProvider,
      wagmiConnected,
    });
    loadNFTData();
  }, [address, wagmiAddress, unifiedUser?.wallet?.address, sociosAddressFromStorage, authProvider, wagmiConnected]);

  /**
   * Função de refresh manual
   */
  const refreshAll = useCallback(async () => {
    await loadNFTData();
  }, [loadNFTData]);

  // Funções dummy para manter compatibilidade
  const refetchNFTs = refreshAll;
  const refetchStakeInfo = refreshAll;

  return {
    // NFT data
    stakedNFTs,    // NFTs queimados (no burn contract)
    unstakedNFTs,  // NFTs disponíveis (na wallet)
    allNFTs: allUserNFTs,

    // Loading states
    isLoading,
    isLoadingNFTs: isLoading,
    isLoadingStaked: false,

    // Staking data (dummy para compatibilidade)
    stakeInfo: null,

    // Contract status
    isBurnContractConfigured: isContractConfigured(),

    // Functions
    refreshAll,
    refetchNFTs,
    refetchStakeInfo,

    // Derived states
    hasNFTs: allUserNFTs.length > 0,
    hasStakedNFTs: stakedNFTs.length > 0,
    hasUnstakedNFTs: unstakedNFTs.length > 0,
  };
}

/**
 * Alias para o hook - mantém compatibilidade com código existente
 */
export function useNFTStakingHook() {
  return useNFTStaking();
}

/**
 * Hook para verificar rapidamente o status de stake de uma lista de token IDs
 * Retorna true para IDs em stake (queimados) no contrato de burn
 */
export function useNFTStakingStatus(tokenIds: number[]) {
  const { address: wagmiAddress } = useAccount();
  const { user: unifiedUser } = useUnifiedAuth();
  const address = wagmiAddress || unifiedUser?.wallet?.address || undefined;
  const [statuses, setStatuses] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = tokenIds.filter((id) => typeof id === 'number' && !Number.isNaN(id));

    if (!address || key.length === 0) {
      setStatuses({});
      setLoading(false);
      return;
    }

    if (!isContractConfigured()) {
      setStatuses({});
      setLoading(false);
      return;
    }

    const fetchStatuses = async () => {
      try {
        setLoading(true);
        setError(null);

        const stakedIds = await getStakedTokens(address);
        if (cancelled) return;

        const stakedSet = new Set(stakedIds.map((id) => Number(id)));
        const result: Record<number, boolean> = {};
        key.forEach((id) => {
          result[id] = stakedSet.has(id);
        });

        setStatuses(result);
      } catch (err) {
        if (cancelled) return;
        console.error('Erro ao verificar status de staking:', err);
        setError(err instanceof Error ? err.message : 'Falha ao verificar status de staking');
        setStatuses({});
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStatuses();

    return () => {
      cancelled = true;
    };
  }, [address, JSON.stringify(tokenIds)]);

  return { statuses, loading, error };
}
