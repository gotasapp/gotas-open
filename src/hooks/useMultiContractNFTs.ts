'use client';

import { useState } from 'react';
import { Address } from 'viem';

// Hook desabilitado - pronto para reimplementação futura
interface NFTWithContract {
  tokenId: string;
  owner: Address;
  metadata: any;
  assetData?: any;
  contractAddress: string;
  contractName: string;
}

export function useMultiContractNFTs(userAddress?: Address, enableAutoDiscovery = true) {
  return {
    // Estados principais
    nfts: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    
    // Estados de descoberta
    discoveryResult: null,
    isDiscovering: false,
    discoveryError: null,
    enableAutoDiscovery: false,
    
    // Info da wallet
    userAddress,
    balance: 0,
    
    // Funções
    refreshNFTs: async () => {},
    refetch: async () => {},
    discoverContracts: async () => {},
    
    // Validações
    isValidChain: false,
    hasNFTs: false,
    
    // Estados derivados
    isEmpty: true,
    hasError: false,
    
    // Debug e estatísticas
    debugLogs: [],
    
    // Informações de contratos
    contractsCount: 0,
    contractsDiscovered: 0,
    contractsList: [],
    
    // Estatísticas da descoberta
    discoveryStats: null
  };
}

/**
 * Hook simplificado para usar apenas com o usuário conectado
 */
export function useMyMultiContractNFTs(enableAutoDiscovery = true) {
  return useMultiContractNFTs(undefined, false);
}

/**
 * Hook legacy para compatibilidade (usa discovery automático)
 */
export function useMyMultiContractNFTsLegacy() {
  return useMultiContractNFTs(undefined, false);
}