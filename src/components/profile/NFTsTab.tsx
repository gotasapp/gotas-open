'use client';

import { useState } from 'react';
import { useMyNFTs, type NFTMetadata } from '@/hooks/useUserNFTs';
import { useMarketplace } from '@/hooks/useMarketplace';
import { IPFSImage } from '@/components/ui/ipfs-image';
import { formatEther } from 'viem';
import { useNFTStakingHook, useNFTStakingStatus } from '@/hooks/useNFTStakingHook';
import { Lock, Unlock, Loader2 } from 'lucide-react';

interface NFTCardProps {
  nft: NFTMetadata;
  onListForSale: (nft: NFTMetadata) => void;
}

function NFTCard({ nft, onListForSale }: NFTCardProps) {
  const { stake, withdraw, isApproved, approve } = useNFTStakingHook();
  const tokenId = parseInt(nft.tokenId);
  const { statuses, loading: statusLoading } = useNFTStakingStatus([tokenId]);
  const [isProcessingStake, setIsProcessingStake] = useState(false);
  const [stakeError, setStakeError] = useState<string | null>(null);

  const isStaked = statuses[tokenId] || false;

  const handleStake = async () => {
    setIsProcessingStake(true);
    setStakeError(null);

    try {
      // Auto-approve if needed
      if (!isApproved) {
        await approve();
      }

      await stake(tokenId);
      // Success feedback could be added here
    } catch (err) {
      console.error('Staking error:', err);
      setStakeError(err instanceof Error ? err.message : 'Falha ao fazer stake do NFT');
    } finally {
      setIsProcessingStake(false);
    }
  };

  const handleWithdraw = async () => {
    setIsProcessingStake(true);
    setStakeError(null);

    try {
      await withdraw(tokenId);
      // Success feedback could be added here
    } catch (err) {
      console.error('Withdrawal error:', err);
      setStakeError(err instanceof Error ? err.message : 'Falha ao retirar o NFT do stake');
    } finally {
      setIsProcessingStake(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="aspect-square bg-gray-100 relative">
        {nft.image ? (
          <IPFSImage
            src={nft.image}
            alt={nft.name || `NFT #${nft.tokenId}`}
            className="w-full h-full object-cover"
            onError={(error) => console.warn(`Erro ao carregar imagem NFT #${nft.tokenId}:`, error)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Staking Status Badge */}
        {isStaked && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Lock className="h-3 w-3 mr-1" />
              Em Stake
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {nft.name || `NFT #${nft.tokenId}`}
        </h3>

        {nft.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {nft.description}
          </p>
        )}

        {nft.attributes && nft.attributes.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {nft.attributes.slice(0, 3).map((attr, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                >
                  {attr.trait_type}: {attr.value}
                </span>
              ))}
              {nft.attributes.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{nft.attributes.length - 3} mais
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {stakeError && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-600">{stakeError}</p>
          </div>
        )}

        <div className="flex flex-col space-y-2">
          {/* Staking button */}
          <button
            onClick={isStaked ? handleWithdraw : handleStake}
            disabled={isProcessingStake || statusLoading}
            className={`w-full flex items-center justify-center py-2 px-4 rounded-md transition-colors text-sm font-medium ${
              isStaked
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50'
                : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
            }`}
          >
            {isProcessingStake || statusLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isStaked ? 'Retirando do stake...' : 'Fazendo stake...'}
              </>
            ) : (
              <>
                {isStaked ? (
                  <>
                    <Unlock className="h-4 w-4 mr-2" />
                    Retirar do Stake
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Fazer Stake
                  </>
                )}
              </>
            )}
          </button>

          {/* Original buttons row */}
          <div className="flex space-x-2">
            <button
              onClick={() => onListForSale(nft)}
              disabled={isStaked}
              className={`flex-1 py-2 px-4 rounded-md transition-colors text-sm font-medium ${
                isStaked
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              title={isStaked ? 'NFT em stake não pode ser vendido' : ''}
            >
              Listar para Venda
            </button>
            <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium">
              Ver Detalhes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ListingModalProps {
  nft: NFTMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: { tokenId: string; priceInCHZ: string; durationInDays: number }) => void;
  isLoading: boolean;
}

function ListingModal({ nft, isOpen, onClose, onSubmit, isLoading }: ListingModalProps) {
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('7');

  if (!isOpen || !nft) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      tokenId: nft.tokenId,
      priceInCHZ: price,
      durationInDays: parseInt(duration)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Listar NFT para Venda</h2>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-2">NFT: {nft.name || `#${nft.tokenId}`}</p>
          {nft.image && (
            <IPFSImage 
              src={nft.image} 
              alt={nft.name || `NFT #${nft.tokenId}`}
              className="w-20 h-20 object-cover rounded-md"
              onError={(error) => console.warn(`Erro ao carregar imagem do modal NFT #${nft.tokenId}:`, error)}
            />
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preço (CHZ)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duração (dias)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1">1 dia</option>
              <option value="3">3 dias</option>
              <option value="7">7 dias</option>
              <option value="14">14 dias</option>
              <option value="30">30 dias</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Listando...' : 'Listar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function NFTsTab() {
  const { nfts, isLoading, error, refreshNFTs, isEmpty, hasError, isValidChain } = useMyNFTs();
  const { createListing, isLoading: isCreatingListing, error: listingError, isSuccess, clearError } = useMarketplace();
  
  const [selectedNFT, setSelectedNFT] = useState<NFTMetadata | null>(null);
  const [showListingModal, setShowListingModal] = useState(false);

  const handleListForSale = (nft: NFTMetadata) => {
    setSelectedNFT(nft);
    setShowListingModal(true);
  };

  const handleCreateListing = async (params: { tokenId: string; priceInCHZ: string; durationInDays: number }) => {
    const success = await createListing(params);
    if (success) {
      setShowListingModal(false);
      setSelectedNFT(null);
      // Opcional: Atualizar lista de NFTs
      await refreshNFTs();
    }
  };

  const handleCloseModal = () => {
    setShowListingModal(false);
    setSelectedNFT(null);
    clearError();
  };

  if (!isValidChain) {
    return (
      <div className="text-center py-20">
        <div className="text-amber-400 mb-4">
          <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">Rede Incorreta</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Por favor, conecte-se à rede Chiliz para visualizar seus NFTs.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin mx-auto h-16 w-16 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
        <h3 className="text-xl font-medium text-gray-900 mb-2">Carregando NFTs</h3>
        <p className="text-gray-600">Buscando sua coleção...</p>
      </div>
    );
  }

  if (hasError && error) {
    return (
      <div className="text-center py-20">
        <div className="text-red-400 mb-4">
          <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">Erro ao Carregar</h3>
        <p className="text-gray-600 max-w-md mx-auto mb-4">{error}</p>
        <button
          onClick={() => refreshNFTs()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-center py-20">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum NFT encontrado</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Você ainda não possui NFTs nesta carteira. Visite o marketplace para adquirir seus primeiros NFTs!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Meus NFTs</h2>
          <p className="text-gray-600">
            {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} encontrado{nfts.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <button
          onClick={() => refreshNFTs()}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors flex items-center space-x-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Atualizar</span>
        </button>
      </div>

      {/* Mensagem de erro da listagem */}
      {listingError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{listingError.message}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem de sucesso */}
      {isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">NFT listado com sucesso no marketplace!</p>
            </div>
          </div>
        </div>
      )}

      {/* Grid de NFTs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {nfts.map((nft) => (
          <NFTCard
            key={`${nft.contract}-${nft.tokenId}`}
            nft={nft}
            onListForSale={handleListForSale}
          />
        ))}
      </div>

      {/* Modal de Listagem */}
      <ListingModal
        nft={selectedNFT}
        isOpen={showListingModal}
        onClose={handleCloseModal}
        onSubmit={handleCreateListing}
        isLoading={isCreatingListing}
      />
    </div>
  );
}