'use client';

import { useState, useCallback, useEffect } from 'react';
import { Address } from 'viem';
import { useAccount, useChainId } from 'wagmi';
import { prepareContractCall, sendTransaction, waitForReceipt, sendAndConfirmTransaction } from "thirdweb";
import { approve, isApprovedForAll, setApprovalForAll } from "thirdweb/extensions/erc721";
import { createListing, buyFromListing as buyFromListingContract, cancelListing as cancelListingContract } from "thirdweb/extensions/marketplace";
import { getNFTContract, getMarketplaceContract, getActiveChain, thirdwebClient } from '@/lib/thirdweb-client';
import { getMarketplaceContractAddress } from '@/lib/env-validator';
import { parseUnits } from 'viem';
import type { DirectListing as ThirdwebDirectListing } from 'thirdweb/extensions/marketplace';
interface CreateListingParams {
  tokenId: string;
  priceInCHZ: string;
  durationInDays: number;
  reserved?: boolean;
}

interface BuyFromListingParams {
  listingId: string;
  priceInCHZ: string;
  buyFor?: Address;
}

interface MarketplaceError {
  type: string;
  message: string;
  details?: any;
}

interface TransactionState {
  isLoading: boolean;
  isTransactionPending: boolean;
  error: MarketplaceError | null;
  transactionHash?: string;
}

interface MarketplaceListing {
  id: string;
  tokenId: string;
  price: string;
  seller: Address;
}


export function useMarketplace() {
  const { address: account } = useAccount();
  const chainId = useChainId();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isTransactionPending, setIsTransactionPending] = useState(false);
  const [error, setError] = useState<MarketplaceError | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | undefined>();
  const [isSuccess, setIsSuccess] = useState(false);

  const activeChain = getActiveChain();
  const isValidChain = chainId === activeChain.id;
  const marketplaceContractAddress = getMarketplaceContractAddress();
  const isConfigured = !!marketplaceContractAddress;
  
  // SECURITY: Removed debug logging that exposed environment variables
  // Client-side hooks should never log sensitive configuration data
  
  // Lazy initialization do contrato para evitar erro quando não configurado
  const getMarketplaceContractLazy = useCallback(() => {
    if (!isConfigured) {
      throw new Error("Marketplace not configured. Please set NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS in environment variables.");
    }
    return getMarketplaceContract();
  }, [isConfigured]);
  
  const nftContract = getNFTContract();

  const clearError = useCallback(() => {
    setError(null);
    setIsSuccess(false);
  }, []);

  const validateListingParams = useCallback((params: CreateListingParams) => {
    if (!params.tokenId || params.tokenId === '0') {
      return { type: 'VALIDATION_ERROR', message: 'Token ID inválido' };
    }
    if (!params.priceInCHZ || parseFloat(params.priceInCHZ) <= 0) {
      return { type: 'VALIDATION_ERROR', message: 'Preço deve ser maior que zero' };
    }
    if (params.durationInDays <= 0 || params.durationInDays > 365) {
      return { type: 'VALIDATION_ERROR', message: 'Duração deve ser entre 1 e 365 dias' };
    }
    return null;
  }, []);

  const checkNFTApproval = useCallback(async (tokenId: string) => {
    if (!account || !isValidChain || !isConfigured) return false;

    try {
      const marketplaceContract = getMarketplaceContractLazy();
      const isApproved = await isApprovedForAll({
        contract: nftContract,
        owner: account,
        operator: marketplaceContract.address,
      });
      return isApproved;
    } catch (err) {
      console.error('Erro ao verificar aprovação:', err);
      return false;
    }
  }, [account, isValidChain, isConfigured, nftContract, getMarketplaceContractLazy]);

  const approveNFT = useCallback(async (tokenId: string) => {
    if (!account || !isValidChain || !isConfigured) return false;

    try {
      setIsLoading(true);
      setError(null);

      console.log(`🔐 Iniciando aprovação NFT #${tokenId}`, {
        account,
        chainId,
        isValidChain,
        isConfigured
      });

      const marketplaceContract = getMarketplaceContractLazy();
      console.log(`📋 Contratos configurados:`, {
        nftContract: nftContract.address,
        marketplaceContract: marketplaceContract.address
      });

      const transaction = setApprovalForAll({
        contract: nftContract,
        operator: marketplaceContract.address,
        approved: true,
      });

      console.log(`📤 Enviando transação de aprovação...`);
      const result = await sendAndConfirmTransaction({
        transaction,
        account: account as any,
      });

      console.log(`✅ Transação de aprovação enviada:`, {
        hash: result.transactionHash,
        status: 'pending'
      });

      setTransactionHash(result.transactionHash);
      setIsTransactionPending(true);

      console.log(`⏳ Aguardando confirmação da transação...`);
      await waitForReceipt({
        client: thirdwebClient,
        chain: activeChain,
        transactionHash: result.transactionHash,
      });

      console.log(`🎉 Aprovação confirmada com sucesso!`);
      setIsTransactionPending(false);
      setIsSuccess(true);
      return true;
    } catch (err) {
      console.error('❌ Erro ao aprovar NFT:', {
        error: err,
        tokenId,
        account,
        chainId
      });
      setError({
        type: 'APPROVAL_ERROR',
        message: 'Falha ao aprovar NFT para marketplace',
        details: err
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [account, isValidChain, isConfigured, nftContract, getMarketplaceContractLazy, activeChain, chainId]);

  const createListingFunc = useCallback(async (params: CreateListingParams) => {
    if (!account || !isValidChain || !isConfigured) {
      console.error('❌ Pré-condições para listagem não atendidas:', {
        account: !!account,
        isValidChain,
        isConfigured
      });
      return false;
    }

    console.log(`🏪 Iniciando criação de listagem:`, {
      tokenId: params.tokenId,
      price: params.priceInCHZ,
      duration: params.durationInDays,
      reserved: params.reserved
    });

    const validationError = validateListingParams(params);
    if (validationError) {
      console.error('❌ Erro de validação:', validationError);
      setError(validationError);
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Verificar aprovação primeiro
      console.log(`🔍 Verificando aprovação do NFT #${params.tokenId}...`);
      const isApproved = await checkNFTApproval(params.tokenId);
      console.log(`📋 Status da aprovação:`, { isApproved });

      if (!isApproved) {
        console.log(`⚠️ NFT não aprovado, iniciando processo de aprovação...`);
        const approved = await approveNFT(params.tokenId);
        if (!approved) {
          console.error('❌ Falha na aprovação do NFT');
          return false;
        }
        console.log(`✅ NFT aprovado com sucesso`);
      }

      // Criar listagem
      console.log(`🏗️ Preparando transação de listagem...`);
      const marketplaceContract = getMarketplaceContractLazy();
      const priceInWei = parseUnits(params.priceInCHZ, 18);
      const startTimestamp = Math.floor(Date.now() / 1000); // Timestamp em SEGUNDOS
      const endTimestamp = startTimestamp + (params.durationInDays * 24 * 60 * 60); // Duração em segundos

      console.log(`💰 Parâmetros da listagem:`, {
        marketplaceContract: marketplaceContract.address,
        nftContract: nftContract.address,
        tokenId: params.tokenId,
        priceInCHZ: params.priceInCHZ,
        priceInWei: priceInWei.toString(),
        startTimestamp,
        endTimestamp,
        startTime: new Date(startTimestamp * 1000).toISOString(),
        endTime: new Date(endTimestamp * 1000).toISOString(),
        duration: `${params.durationInDays} days`
      });

      const transaction = createListing({
        contract: marketplaceContract,
        assetContractAddress: nftContract.address,
        tokenId: BigInt(params.tokenId),
        pricePerToken: priceInWei,
        currencyContractAddress: "0x0000000000000000000000000000000000000000", // CHZ nativo
        quantity: BigInt(1),
        startTimestamp: BigInt(startTimestamp), // Timestamp em segundos como BigInt
        endTimestamp: BigInt(endTimestamp),     // Timestamp em segundos como BigInt
        isReservedListing: params.reserved || false,
      });

      console.log(`📤 Enviando transação de listagem...`);
      const result = await sendAndConfirmTransaction({
        transaction,
        account: account as any,
      });

      console.log(`✅ Transação de listagem enviada:`, {
        hash: result.transactionHash,
        status: 'pending'
      });

      setTransactionHash(result.transactionHash);
      setIsTransactionPending(true);

      console.log(`⏳ Aguardando confirmação da listagem...`);
      await waitForReceipt({
        client: thirdwebClient,
        chain: activeChain,
        transactionHash: result.transactionHash,
      });

      console.log(`🎉 Listagem criada com sucesso!`, {
        tokenId: params.tokenId,
        price: params.priceInCHZ,
        transactionHash: result.transactionHash
      });

      setIsTransactionPending(false);
      setIsSuccess(true);
      return true;
    } catch (err) {
      console.error('❌ Erro ao criar listagem:', {
        error: err,
        params,
        account,
        chainId,
        stack: err instanceof Error ? err.stack : undefined
      });
      setError({
        type: 'CREATE_LISTING_ERROR',
        message: 'Falha ao criar listagem',
        details: err
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [account, isValidChain, isConfigured, validateListingParams, checkNFTApproval, approveNFT, getMarketplaceContractLazy, nftContract, activeChain, chainId]);

  const buyFromListingFunc = useCallback(async (params: BuyFromListingParams) => {
    if (!account || !isValidChain || !isConfigured) return false;

    try {
      setIsLoading(true);
      setError(null);

      const marketplaceContract = getMarketplaceContractLazy();
      const transaction = buyFromListingContract({
        contract: marketplaceContract,
        listingId: BigInt(params.listingId),
        quantity: BigInt(1),
        recipient: params.buyFor || account,
      });

      const result = await sendAndConfirmTransaction({
        transaction,
        account: account as any,
      });

      setTransactionHash(result.transactionHash);
      setIsTransactionPending(true);

      await waitForReceipt({
        client: thirdwebClient,
        chain: activeChain,
        transactionHash: result.transactionHash,
      });

      setIsTransactionPending(false);
      setIsSuccess(true);
      return true;
    } catch (err) {
      console.error('Erro ao comprar da listagem:', err);
      setError({
        type: 'BUY_FROM_LISTING_ERROR',
        message: 'Falha ao comprar NFT',
        details: err
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [account, isValidChain, isConfigured, getMarketplaceContractLazy, activeChain]);

  const cancelListingFunc = useCallback(async (listingId: string) => {
    if (!account || !isValidChain || !isConfigured) return false;

    try {
      setIsLoading(true);
      setError(null);

      const marketplaceContract = getMarketplaceContractLazy();
      const transaction = cancelListingContract({
        contract: marketplaceContract,
        listingId: BigInt(listingId),
      });

      const result = await sendAndConfirmTransaction({
        transaction,
        account: account as any,
      });

      setTransactionHash(result.transactionHash);
      setIsTransactionPending(true);

      await waitForReceipt({
        client: thirdwebClient,
        chain: activeChain,
        transactionHash: result.transactionHash,
      });

      setIsTransactionPending(false);
      setIsSuccess(true);
      return true;
    } catch (err) {
      console.error('Erro ao cancelar listagem:', err);
      setError({
        type: 'CANCEL_LISTING_ERROR',
        message: 'Falha ao cancelar listagem',
        details: err
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [account, isValidChain, isConfigured, getMarketplaceContractLazy, activeChain]);

  return {
    // Estados
    isLoading,
    isTransactionPending,
    error,
    transactionHash,
    isSuccess,
    isValidChain,
    
    // Funções principais
    createListing: createListingFunc,
    buyFromListing: buyFromListingFunc,
    cancelListing: cancelListingFunc,
    
    // Funções auxiliares
    approveNFT,
    checkNFTApproval,
    checkNFTOwnership: async (tokenId: string) => {
      // TODO: Implementar verificação de ownership
      return false;
    },
    validateListingParams,
    clearError,
    
    // Utilitários
    marketplaceContract: isConfigured ? getMarketplaceContractLazy() : undefined,
    nftContract,
    isConfigured,
  };
}

/**
 * Hook para buscar uma listagem específica
 */
export function useListing(listingId: string) {
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chainId = useChainId();
  const activeChain = getActiveChain();
  const isValidChain = chainId === activeChain.id;

  const fetchListing = useCallback(async () => {
    const marketplaceAddress = getMarketplaceContractAddress();
    
    if (!listingId || !isValidChain || !marketplaceAddress) {
      setListing(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const marketplaceContract = getMarketplaceContract();
      
      // Buscar listagem específica
      const { getListing } = await import("thirdweb/extensions/marketplace");
      const listingData: ThirdwebDirectListing = await getListing({
        contract: marketplaceContract,
        listingId: BigInt(listingId),
      });

      const listing: MarketplaceListing = {
        id: listingId,
        tokenId: listingData.tokenId.toString(),
        price: listingData.pricePerToken.toString(),
        seller: listingData.creatorAddress as Address,
      };

      setListing(listing);
    } catch (err) {
      console.error('Erro ao buscar listagem:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setListing(null);
    } finally {
      setIsLoading(false);
    }
  }, [listingId, isValidChain]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  return {
    listing,
    isLoading,
    error,
    refetch: fetchListing
  };
}