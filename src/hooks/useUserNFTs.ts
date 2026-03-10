'use client';

import { useState, useEffect, useCallback } from 'react';
import { Address } from 'viem';
import { useAccount, useChainId } from 'wagmi';
import { getOwnedNFTs, getNFT } from 'thirdweb/extensions/erc721';
import { getNFTContract, getActiveChain, thirdwebClient } from '@/lib/thirdweb-client';
import { getOptimizedIpfsUrl, isIpfsUrl } from '@/utils/ipfs-utils';
import { readContract, getContract } from 'thirdweb';
import { getStakedTokens as getBurnStakedTokens, isContractConfigured as isBurnContractConfigured } from '@/lib/burn-staking-contract';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import ERC721ABI from '@/abis/ERC721ABI.json';

export interface NFTMetadata {
  id: string;
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  tokenId: string;
  contract: string;
  isStaked?: boolean;
  stakeSource?: 'legacy' | 'burn';
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT as Address | undefined;
const BURN_STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BURN_STAKING_CONTRACT as Address | undefined;

const isValidAddress = (address?: string | null): address is Address => {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  return trimmed.length === 42 && trimmed.startsWith('0x') && trimmed.toLowerCase() !== ZERO_ADDRESS;
};

type UseUserNFTsOptions = {
  includeBurnStaked?: boolean;
  includeLegacyStaked?: boolean;
};

export function useUserNFTs(userAddress?: Address, options: UseUserNFTsOptions = {}) {
  const { address: walletAddress, isConnected: wagmiConnected } = useAccount();
  const chainId = useChainId();
  const { user: unifiedUser, authProvider } = useUnifiedAuth();
  const { includeBurnStaked = false, includeLegacyStaked = false } = options;

  const [nfts, setNfts] = useState<NFTMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        console.log('[useUserNFTs] Endereço no storage mudou:', stored);
        setSociosAddressFromStorage(stored);
      }
    };

    const interval = setInterval(checkStorage, 500);
    return () => clearInterval(interval);
  }, [sociosAddressFromStorage]);

  const activeAddress = userAddress || walletAddress || (unifiedUser?.wallet?.address as Address) || (sociosAddressFromStorage as Address) || undefined;
  const activeChain = getActiveChain();
  const isValidChain = !chainId || chainId === activeChain.id;

  const fetchNFTs = useCallback(async (refresh = false) => {
    if (!activeAddress) {
      console.log('[useUserNFTs] fetchNFTs: Sem endereço, limpando NFTs', {
        walletAddress,
        unifiedAddress: unifiedUser?.wallet?.address,
        sociosStorage: sociosAddressFromStorage,
        authProvider,
      });
      setNfts([]);
      return;
    }

    console.log(`[useUserNFTs] fetchNFTs: Iniciando busca para endereço: ${activeAddress}`, {
      source: walletAddress ? 'wagmi' : (unifiedUser?.wallet?.address ? 'unifiedAuth' : 'localStorage'),
      authProvider,
      chainId,
      isValidChain,
    });

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const contract = getNFTContract();
      const walletNFTMap = new Map<string, NFTMetadata>();
      const stakedNFTMap = new Map<string, NFTMetadata>();

      let ownedNFTs: any[] = [];

      try {
        ownedNFTs = await getOwnedNFTs({
          contract,
          owner: activeAddress,
        });
        console.log(`[useUserNFTs] fetchNFTs: Encontrados ${ownedNFTs.length} NFTs via getOwnedNFTs`);
      } catch (getOwnedNFTsError) {
        console.warn('[useUserNFTs] getOwnedNFTs falhou, tentando método alternativo:', getOwnedNFTsError);

        try {
          const erc721Contract = getContract({
            client: thirdwebClient,
            chain: activeChain,
            address: contract.address,
            abi: ERC721ABI,
          });

          const balance = await readContract({
            contract: erc721Contract,
            method: 'function balanceOf(address owner) view returns (uint256)',
            params: [activeAddress],
          });

          const balanceNum = Number(balance);
          console.log(`[useUserNFTs] fetchNFTs: Balance encontrado: ${balanceNum} NFTs`);

          if (balanceNum > 0) {
            const tokenIds: bigint[] = [];
            for (let i = 0; i < balanceNum; i++) {
              try {
                const tokenId = await readContract({
                  contract: erc721Contract,
                  method: 'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
                  params: [activeAddress, BigInt(i)],
                });
                tokenIds.push(tokenId);
              } catch (err) {
                console.warn(`[useUserNFTs] Erro ao buscar tokenId no índice ${i}:`, err);
              }
            }

            console.log(`[useUserNFTs] fetchNFTs: Token IDs encontrados: ${tokenIds.map(id => id.toString()).join(', ')}`);

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
                console.warn(`[useUserNFTs] Erro ao buscar metadados do NFT #${tokenId}:`, err);
                return null;
              }
            });

            const nftResults = await Promise.all(nftPromises);
            ownedNFTs = nftResults.filter((nft): nft is { id: bigint; metadata: any } => nft !== null);
            console.log(`[useUserNFTs] fetchNFTs: ${ownedNFTs.length} NFTs recuperados via método alternativo`);
          }
        } catch (altError) {
          console.error('[useUserNFTs] Método alternativo também falhou:', altError);
          throw altError;
        }
      }

      ownedNFTs.forEach(nft => {
        let processedImage = nft.metadata?.image || '';
        if (processedImage && isIpfsUrl(processedImage)) {
          processedImage = getOptimizedIpfsUrl(processedImage, 'image');
        }

        const metadata: NFTMetadata = {
          id: nft.id.toString(),
          tokenId: nft.id.toString(),
          contract: contract.address,
          name: nft.metadata?.name || `NFT #${nft.id}`,
          description: nft.metadata?.description || '',
          image: processedImage,
          attributes: Array.isArray(nft.metadata?.attributes)
            ? nft.metadata.attributes.map((attr: any) => ({
                trait_type: attr.trait_type || '',
                value: attr.value || '',
              }))
            : [],
          isStaked: false,
        };

        walletNFTMap.set(metadata.tokenId, metadata);
      });

      // Legacy staking contract (StakeERC721) - mantém suporte para páginas antigas
      const shouldIncludeLegacy = includeLegacyStaked && isValidAddress(STAKING_CONTRACT_ADDRESS);
      if (shouldIncludeLegacy) {
        try {
          const stakingContract = getContract({
            client: thirdwebClient,
            chain: activeChain,
            address: STAKING_CONTRACT_ADDRESS,
          });

          const stakeInfo = await readContract({
            contract: stakingContract,
            method: 'function getStakeInfo(address _staker) view returns (uint256[] _tokensStaked, uint256 _rewards)',
            params: [activeAddress],
          });

          const legacyTokenIds: readonly bigint[] = Array.isArray(stakeInfo?.[0]) ? stakeInfo[0] : [];

          if (legacyTokenIds.length > 0) {
            console.log(`📍 Buscando metadados de ${legacyTokenIds.length} NFTs em stake (legacy)`);

            const legacyMetadata = await Promise.all(
              legacyTokenIds.map(async tokenId => {
                try {
                  const nftData = await getNFT({
                    contract,
                    tokenId,
                  });

                  let processedImage = nftData.metadata?.image || '';
                  if (processedImage && isIpfsUrl(processedImage)) {
                    processedImage = getOptimizedIpfsUrl(processedImage, 'image');
                  }

                  return {
                    id: tokenId.toString(),
                    tokenId: tokenId.toString(),
                    contract: contract.address,
                    name: nftData.metadata?.name || `NFT #${tokenId}`,
                    description: nftData.metadata?.description || '',
                    image: processedImage,
                    attributes: Array.isArray(nftData.metadata?.attributes)
                      ? nftData.metadata.attributes.map((attr: any) => ({
                          trait_type: attr.trait_type || '',
                          value: attr.value || '',
                        }))
                      : [],
                    isStaked: true,
                    stakeSource: 'legacy' as const,
                  } satisfies NFTMetadata;
                } catch (err) {
                  console.error(`Erro ao buscar NFT em stake (legacy) #${tokenId}:`, err);
                  return null;
                }
              }),
            );

            for (const metadata of legacyMetadata) {
              if (!metadata) continue;
              walletNFTMap.delete(metadata.tokenId);
              stakedNFTMap.set(metadata.tokenId, metadata);
            }
          }
        } catch (err) {
          console.error('Erro ao buscar NFTs em stake (legacy):', err);
        }
      }

      // Burn staking contract (StakeNFTWithFee) - tokens queimados
      const shouldIncludeBurn = includeBurnStaked && isBurnContractConfigured() && isValidAddress(BURN_STAKING_CONTRACT_ADDRESS);
      if (shouldIncludeBurn) {
        try {
          const burnTokenIds = await getBurnStakedTokens(activeAddress);

          if (burnTokenIds.length > 0) {
            console.log(`📍 Buscando metadados de ${burnTokenIds.length} NFTs queimados`);

            const burnMetadata = await Promise.all(
              burnTokenIds.map(async tokenId => {
                try {
                  const nftData = await getNFT({
                    contract,
                    tokenId: BigInt(tokenId),
                  });

                  let processedImage = nftData.metadata?.image || '';
                  if (processedImage && isIpfsUrl(processedImage)) {
                    processedImage = getOptimizedIpfsUrl(processedImage, 'image');
                  }

                  return {
                    id: tokenId.toString(),
                    tokenId: tokenId.toString(),
                    contract: contract.address,
                    name: nftData.metadata?.name || `NFT #${tokenId}`,
                    description: nftData.metadata?.description || '',
                    image: processedImage,
                    attributes: Array.isArray(nftData.metadata?.attributes)
                      ? nftData.metadata.attributes.map((attr: any) => ({
                          trait_type: attr.trait_type || '',
                          value: attr.value || '',
                        }))
                      : [],
                    isStaked: true,
                    stakeSource: 'burn' as const,
                  } satisfies NFTMetadata;
                } catch (err) {
                  console.error(`Erro ao buscar NFT queimado #${tokenId}:`, err);
                  return null;
                }
              }),
            );

            for (const metadata of burnMetadata) {
              if (!metadata) continue;
              walletNFTMap.delete(metadata.tokenId);
              stakedNFTMap.set(metadata.tokenId, metadata);
            }
          }
        } catch (err) {
          console.error('Erro ao buscar NFTs queimados:', err);
        }
      }

      const combinedNFTs = [...walletNFTMap.values(), ...stakedNFTMap.values()];
      console.log(
        `✅ Total de NFTs: ${combinedNFTs.length} (${walletNFTMap.size} na carteira + ${stakedNFTMap.size} em stake/queimados)`,
      );

      setNfts(combinedNFTs);
    } catch (err) {
      console.error('Erro ao buscar NFTs:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setNfts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeAddress, isValidChain, walletAddress, unifiedUser, sociosAddressFromStorage, authProvider, chainId, activeChain, includeBurnStaked, includeLegacyStaked]);

  useEffect(() => {
    console.log('[useUserNFTs] useEffect disparado', {
      activeAddress,
      walletAddress,
      unifiedAddress: unifiedUser?.wallet?.address,
      sociosStorage: sociosAddressFromStorage,
      authProvider,
      isValidChain,
      wagmiConnected,
    });
    fetchNFTs();
  }, [activeAddress, sociosAddressFromStorage, authProvider, wagmiConnected]);

  const refreshNFTs = useCallback(async () => {
    await fetchNFTs(true);
  }, [fetchNFTs]);

  const refetch = refreshNFTs;

  return {
    // Estados
    nfts,
    isLoading,
    isRefreshing,
    error,
    
    // Info da wallet
    userAddress: activeAddress,
    balance: nfts.length,
    
    // Funções
    refreshNFTs,
    refetch,
    
    // Validações
    isValidChain,
    hasNFTs: nfts.length > 0,
    
    // Estados derivados
    isEmpty: nfts.length === 0 && !isLoading,
    hasError: !!error,
  };
}

/**
 * Hook simplificado para usar apenas com o usuário conectado
 */
export function useMyNFTs() {
  return useUserNFTs(undefined);
}

/**
 * Hook para buscar um NFT específico
 */
export function useNFT(tokenId: string) {
  const [nft, setNft] = useState<NFTMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chainId = useChainId();
  const activeChain = getActiveChain();
  const isValidChain = chainId === activeChain.id;

  const fetchNFT = useCallback(async () => {
    if (!tokenId || !isValidChain) {
      setNft(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const contract = getNFTContract();
      
      // Buscar NFT específico por tokenId
      const { getNFT } = await import("thirdweb/extensions/erc721");
      const nftData = await getNFT({
        contract,
        tokenId: BigInt(tokenId),
      });

      // Processar imagem IPFS com fallback otimizado
      let processedImage = nftData.metadata?.image || '';
      if (processedImage && isIpfsUrl(processedImage)) {
        processedImage = getOptimizedIpfsUrl(processedImage, 'image');
        console.log(`🖼️ NFT #${tokenId}: IPFS image processada`, {
          original: nftData.metadata?.image,
          optimized: processedImage
        });
      }

      const metadata: NFTMetadata = {
        id: tokenId,
        tokenId,
        contract: contract.address,
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

      setNft(metadata);
    } catch (err) {
      console.error('Erro ao buscar NFT:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setNft(null);
    } finally {
      setIsLoading(false);
    }
  }, [tokenId, isValidChain]);

  // Safe to depend on primitives instead of fetchNFT to prevent potential infinite loops
  useEffect(() => {
    fetchNFT();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId, isValidChain]);

  return {
    nft,
    isLoading,
    error,
    refetch: fetchNFT,
    isValidChain
  };
}
