'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Address } from 'viem';
import { useAccount, useChainId } from 'wagmi';
import { readContract } from "thirdweb";
import { getAllListings, totalListings } from "thirdweb/extensions/marketplace";
import { getMarketplaceContract, getActiveChain } from '@/lib/thirdweb-client';
import { getMarketplaceContractAddress } from '@/lib/env-validator';
import { formatEther } from 'viem';

// Enums dos status do marketplace (baseado no ABI)
enum ListingStatus {
  UNSET = 0,
  CREATED = 1,
  COMPLETED = 2,
  CANCELLED = 3
}

enum TokenType {
  ERC721 = 0,
  ERC1155 = 1
}

interface MarketplaceFilters {
  search?: string;
  rarity?: string;
  club?: string;
  priceMin?: string;
  priceMax?: string;
  sortBy?: 'price_low' | 'price_high' | 'newest' | 'oldest';
  status?: 'active' | 'sold' | 'cancelled' | 'all';
}

interface UseMarketplaceListingsOptions {
  initialFilters?: MarketplaceFilters;
  autoFetch?: boolean;
  pageSize?: number;
  refreshInterval?: number; // ms para auto-refresh
}

// Estrutura do listing baseada no ABI do contrato
interface RawMarketplaceListing {
  listingId: bigint;
  tokenId: bigint;
  quantity: bigint;
  pricePerToken: bigint;
  startTimestamp: bigint;
  endTimestamp: bigint;
  listingCreator: Address;
  assetContract: Address;
  currency: Address;
  tokenType: TokenType;
  status: ListingStatus;
  reserved: boolean;
}

interface MarketplaceListing {
  listingId: string;
  tokenId: string;
  quantity: string;
  pricePerToken: string;
  priceInCHZ: string; // formatado para exibição
  startTimestamp: number;
  endTimestamp: number;
  listingCreator: Address;
  assetContract: Address;
  currency: Address;
  tokenType: TokenType;
  status: ListingStatus;
  statusText: string;
  reserved: boolean;
  isActive: boolean;
  isExpired: boolean;
  timeRemaining?: string;
}

interface MarketplaceError {
  type: string;
  message: string;
  details?: any;
}

interface MarketplaceListingsResponse {
  listings: MarketplaceListing[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
  totalPages: number;
}

export function useMarketplaceListings(options: UseMarketplaceListingsOptions = {}) {
  const {
    initialFilters = {},
    autoFetch = true,
    pageSize = 20,
    refreshInterval = 30000 // 30 segundos
  } = options;

  const { address: account } = useAccount();
  const chainId = useChainId();
  
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<MarketplaceError | null>(null);
  const [filters, setFilters] = useState<MarketplaceFilters>(initialFilters);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const activeChain = getActiveChain();
  const isValidChain = chainId === activeChain.id;
  const marketplaceContractAddress = getMarketplaceContractAddress();
  const isConfigured = !!marketplaceContractAddress;

  // Estados derivados
  const isEmpty = listings.length === 0;
  const hasListings = listings.length > 0;
  const hasError = !!error;
  const hasActiveFilters = Object.keys(filters).some(key => 
    filters[key as keyof MarketplaceFilters] !== undefined && 
    filters[key as keyof MarketplaceFilters] !== ''
  );

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasMore = currentPage < totalPages;

  // Utility functions
  const getStatusText = useCallback((status: ListingStatus): string => {
    switch (status) {
      case ListingStatus.CREATED: return 'Ativo';
      case ListingStatus.COMPLETED: return 'Vendido';
      case ListingStatus.CANCELLED: return 'Cancelado';
      default: return 'Desconhecido';
    }
  }, []);

  const formatTimeRemaining = useCallback((endTimestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTimestamp - now;
    
    if (remaining <= 0) return 'Expirado';
    
    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remaining % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, []);

  const transformRawListing = useCallback((raw: RawMarketplaceListing): MarketplaceListing => {
    const now = Math.floor(Date.now() / 1000);
    const endTimestamp = Number(raw.endTimestamp);
    const isExpired = now > endTimestamp;
    const isActive = raw.status === ListingStatus.CREATED && !isExpired;

    return {
      listingId: raw.listingId.toString(),
      tokenId: raw.tokenId.toString(),
      quantity: raw.quantity.toString(),
      pricePerToken: raw.pricePerToken.toString(),
      priceInCHZ: formatEther(raw.pricePerToken),
      startTimestamp: Number(raw.startTimestamp),
      endTimestamp,
      listingCreator: raw.listingCreator,
      assetContract: raw.assetContract,
      currency: raw.currency,
      tokenType: raw.tokenType,
      status: raw.status,
      statusText: getStatusText(raw.status),
      reserved: raw.reserved,
      isActive,
      isExpired,
      timeRemaining: isActive ? formatTimeRemaining(endTimestamp) : undefined
    };
  }, [getStatusText, formatTimeRemaining]);

  const fetchListings = useCallback(async (page = 1, append = false) => {
    if (!isValidChain || !isConfigured) {
      // SECURITY: Removed debug logging that exposed chain configuration
      return;
    }

    try {
      if (!append) {
        setIsLoading(true);
      }
      setError(null);

      console.log('🔍 Buscando listings do marketplace:', {
        page,
        pageSize,
        marketplaceContract: marketplaceContractAddress,
        append
      });

      const marketplaceContract = getMarketplaceContract();

      // Buscar total de listings primeiro
      console.log('📊 Buscando total de listings...');
      const total = await totalListings({
        contract: marketplaceContract
      });

      const totalListings = Number(total);
      setTotalCount(totalListings);

      console.log(`📈 Total de listings encontrados: ${totalListings}`);

      if (totalListings === 0) {
        setListings([]);
        return;
      }

      // Calcular range para paginação
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize - 1, totalListings - 1);

      console.log('📄 Buscando range de listings:', {
        startIndex,
        endIndex,
        totalListings
      });

      // Buscar listings no range especificado
      const rawListings = await getAllListings({
        contract: marketplaceContract,
        start: startIndex,
        count: endIndex - startIndex + 1
      });

      console.log(`✅ ${rawListings.length} listings brutos recuperados`);

      // Transformar e filtrar listings
      const transformedListings = rawListings.map(transformRawListing);
      
      // Aplicar filtros
      let filteredListings = transformedListings;

      // Filtrar por status
      if (filters.status && filters.status !== 'all') {
        switch (filters.status) {
          case 'active':
            filteredListings = filteredListings.filter(l => l.isActive);
            break;
          case 'sold':
            filteredListings = filteredListings.filter(l => l.status === ListingStatus.COMPLETED);
            break;
          case 'cancelled':
            filteredListings = filteredListings.filter(l => l.status === ListingStatus.CANCELLED);
            break;
        }
      }

      // Filtrar por preço
      if (filters.priceMin) {
        const minPrice = parseFloat(filters.priceMin);
        filteredListings = filteredListings.filter(l => 
          parseFloat(l.priceInCHZ) >= minPrice
        );
      }

      if (filters.priceMax) {
        const maxPrice = parseFloat(filters.priceMax);
        filteredListings = filteredListings.filter(l => 
          parseFloat(l.priceInCHZ) <= maxPrice
        );
      }

      // Ordenar
      if (filters.sortBy) {
        filteredListings.sort((a, b) => {
          switch (filters.sortBy) {
            case 'price_low':
              return parseFloat(a.priceInCHZ) - parseFloat(b.priceInCHZ);
            case 'price_high':
              return parseFloat(b.priceInCHZ) - parseFloat(a.priceInCHZ);
            case 'newest':
              return b.startTimestamp - a.startTimestamp;
            case 'oldest':
              return a.startTimestamp - b.startTimestamp;
            default:
              return 0;
          }
        });
      }

      console.log(`🎯 ${filteredListings.length} listings após filtragem:`, {
        activeListings: filteredListings.filter(l => l.isActive).length,
        soldListings: filteredListings.filter(l => l.status === ListingStatus.COMPLETED).length,
        cancelledListings: filteredListings.filter(l => l.status === ListingStatus.CANCELLED).length,
        filters
      });

      if (append) {
        setListings(prev => [...prev, ...filteredListings]);
      } else {
        setListings(filteredListings);
      }

      setCurrentPage(page);

    } catch (err) {
      console.error('❌ Erro ao buscar listings:', {
        error: err,
        page,
        append,
        contractAddress: marketplaceContractAddress,
        chainId
      });
      setError({
        type: 'FETCH_LISTINGS_ERROR',
        message: 'Falha ao carregar listings do marketplace',
        details: err
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isValidChain, isConfigured, chainId, activeChain.id, marketplaceContractAddress, pageSize, filters, transformRawListing]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchListings(1, false);
  }, [fetchListings]);

  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      await fetchListings(currentPage + 1, true);
    }
  }, [hasMore, isLoading, currentPage, fetchListings]);

  const applyFilters = useCallback(async (newFilters: Partial<MarketplaceFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
    await fetchListings(1, false);
  }, [fetchListings]);

  const clearFilters = useCallback(async () => {
    setFilters({});
    setCurrentPage(1);
    await fetchListings(1, false);
  }, [fetchListings]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Utility functions
  const findListingById = useCallback((listingId: string): MarketplaceListing | null => {
    return listings.find(l => l.listingId === listingId) || null;
  }, [listings]);

  const findListingsByTokenId = useCallback((tokenId: string): MarketplaceListing[] => {
    return listings.filter(l => l.tokenId === tokenId);
  }, [listings]);

  const removeListing = useCallback((listingId: string) => {
    setListings(prev => prev.filter(l => l.listingId !== listingId));
  }, []);

  const updateListing = useCallback((listingId: string, updates: Partial<MarketplaceListing>) => {
    setListings(prev => prev.map(l => 
      l.listingId === listingId ? { ...l, ...updates } : l
    ));
  }, []);

  // Auto-fetch inicial e refresh periódico
  useEffect(() => {
    if (autoFetch && isValidChain && isConfigured) {
      fetchListings(1, false);
    }
  }, [autoFetch, fetchListings, isValidChain, isConfigured]);

  // Auto-refresh periódico
  useEffect(() => {
    if (refreshInterval > 0 && hasListings) {
      const interval = setInterval(() => {
        refresh();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [refreshInterval, hasListings, refresh]);

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 useMarketplaceListings Debug:', {
        isValidChain,
        isConfigured,
        chainId,
        expectedChainId: activeChain.id,
        marketplaceContract: marketplaceContractAddress,
        totalCount,
        listingsCount: listings.length,
        activeListings: listings.filter(l => l.isActive).length,
        hasError: !!error,
        filters,
        currentPage,
        totalPages,
        hasMore
      });
    }
  }, [isValidChain, isConfigured, chainId, activeChain.id, marketplaceContractAddress, totalCount, listings.length, error, filters, currentPage, totalPages, hasMore]);

  return {
    // Estados principais
    listings,
    isLoading,
    isRefreshing,
    error,
    filters,
    
    // Paginação
    currentPage,
    totalCount,
    hasMore,
    totalPages,
    
    // Estados derivados
    isEmpty,
    hasListings,
    hasError,
    hasActiveFilters,
    isValidChain,
    isConfigured,
    
    // Ações principais
    refresh,
    loadMore,
    applyFilters,
    clearFilters,
    clearError,
    
    // Utilitários
    findListingById,
    findListingsByTokenId,
    removeListing,
    updateListing,
    
    // Para debug e uso interno
    fetchListings,
  };
}
