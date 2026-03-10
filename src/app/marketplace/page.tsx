'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Search, Filter, SortAsc, Grid3X3, List, RefreshCw, Store, Loader2, AlertCircle } from 'lucide-react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChainValidator } from '@/components/ui/chain-validator';
import { useChainValidation } from '@/hooks/useChainValidation';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useMarketplaceListings } from '@/hooks/useMarketplaceListings';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { getRarityDetails } from '@/lib/rarity-helpers';
import { NFTWithMetadata, MarketplaceListing } from '@/types/marketplace';

// Tipos para filtros e ordenação
interface MarketplaceFilters {
  search: string;
  rarity: string;
  priceMin: string;
  priceMax: string;
  club: string;
}

interface SortOption {
  value: string;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'newest', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'price_low', label: 'Menor preço' },
  { value: 'price_high', label: 'Maior preço' },
  { value: 'rarity', label: 'Raridade' },
];

const RARITY_OPTIONS = [
  { value: 'all', label: 'Todas as raridades' },
  { value: 'common', label: 'Common' },
  { value: 'epic', label: 'Epic' },
  { value: 'legendary', label: 'Legendary' },
];

const CLUB_OPTIONS = [
  { value: 'all', label: 'Todos os clubes' },
  { value: 'flamengo', label: 'Flamengo' },
  { value: 'corinthians', label: 'Corinthians' },
  { value: 'palmeiras', label: 'Palmeiras' },
  { value: 'santos', label: 'Santos' },
];

// Componente para badge de raridade
const BadgeRarity = ({ rarity, className = '' }: { rarity: string | null | undefined, className?: string }) => {
  if (!rarity) return null;
  const rarityInfo = getRarityDetails(rarity);
  const Icon = rarityInfo.icon;

  return (
    <Badge className={`${rarityInfo.className} border-0 text-xs px-2 py-1 rounded-full ${className}`}>
      <Icon className="w-3 h-3 mr-1.5" />
      {rarityInfo.label}
    </Badge>
  );
};

// Componente para card de NFT no marketplace
interface MarketplaceNFTCardProps {
  listing: MarketplaceListing;
  onBuyClick: (listing: MarketplaceListing) => void;
  onViewDetails: (listing: MarketplaceListing) => void;
}

const MarketplaceNFTCard = ({ listing, onBuyClick, onViewDetails }: MarketplaceNFTCardProps) => {
  const { nft } = listing;
  
  return (
    <Card className="group cursor-pointer bg-white hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200">
      <CardContent className="p-0">
        {/* Imagem do NFT */}
        <div className="relative aspect-square" onClick={() => onViewDetails(listing)}>
          <OptimizedImage
            src={nft.metadata.image}
            alt={nft.metadata.name}
            className="w-full h-full object-cover"
            aspectRatio="square"
            placeholder="skeleton"
          />
          
          {/* Badge de raridade */}
          {nft.assetData?.rarity && (
            <div className="absolute top-2 right-2">
              <BadgeRarity rarity={nft.assetData.rarity} />
            </div>
          )}
          
          {/* Badge do Token ID */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs font-mono">
              #{nft.tokenId}
            </Badge>
          </div>
          
          {/* Overlay com preço */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="text-white">
              <div className="text-lg font-bold">{listing.priceInCHZ} CHZ</div>
              <div className="text-xs opacity-75">≈ ${(parseFloat(listing.priceInCHZ) * 0.10).toFixed(2)} USD</div>
            </div>
          </div>
        </div>
        
        {/* Informações do NFT */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-sm truncate mb-1">
            {nft.assetData?.title || nft.metadata.name}
          </h3>
          
          {nft.assetData?.nft_number && (
            <p className="text-xs text-gray-500 mb-3">
              Card #{nft.assetData.nft_number}
            </p>
          )}
          
          {/* Atributos principais */}
          {nft.metadata.attributes && nft.metadata.attributes.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {nft.metadata.attributes.slice(0, 2).map((attr, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {attr.trait_type}: {attr.value}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Botão de compra */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onBuyClick(listing);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            size="sm"
          >
            Comprar agora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Estado de loading
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {[...Array(12)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-gray-200 aspect-square rounded-lg mb-3"></div>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    ))}
  </div>
);

// Estado vazio
const EmptyState = ({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) => (
  <div className="text-center py-20">
    <div className="text-gray-400 mb-4">
      <Store className="mx-auto h-16 w-16" />
    </div>
    <h3 className="text-xl font-medium text-gray-900 mb-2">
      {hasFilters ? 'Nenhum NFT encontrado' : 'Marketplace vazio'}
    </h3>
    <p className="text-gray-600 max-w-md mx-auto mb-6">
      {hasFilters 
        ? 'Tente ajustar os filtros para encontrar NFTs disponíveis.'
        : 'Não há NFTs listados no marketplace no momento. Seja o primeiro a listar seus NFTs!'
      }
    </p>
    {hasFilters && (
      <Button onClick={onClearFilters} variant="outline">
        Limpar filtros
      </Button>
    )}
  </div>
);

export default function MarketplacePage() {
  const { address, isConnected } = useAccount();
  const { isValidChain } = useChainValidation();
  const { buyFromListing, isLoading: isBuying, error: buyError, isConfigured } = useMarketplace();
  
  // Estados locais
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [filters, setFilters] = useState<MarketplaceFilters>({
    search: '',
    rarity: 'all',
    priceMin: '',
    priceMax: '',
    club: 'all'
  });
  
  // Hook para buscar listings
  const {
    listings,
    isLoading: isLoadingListings,
    isRefreshing,
    error: listingsError,
    totalCount,
    hasMore,
    hasActiveFilters,
    isEmpty,
    refresh,
    loadMore,
    applyFilters,
    clearFilters,
    removeListing
  } = useMarketplaceListings({
    autoFetch: isValidChain && isConfigured,
    pageSize: 20
  });

  // Handlers
  const handleBuyNFT = async (listing: MarketplaceListing) => {
    if (!isConnected || !isValidChain) return;
    
    console.log('Comprar NFT:', listing);
    
    const success = await buyFromListing({
      listingId: listing.listingId,
      priceInCHZ: listing.priceInCHZ
    });
    
    if (success) {
      // Remover listing da lista após compra bem-sucedida
      removeListing(listing.listingId);
    }
  };

  const handleViewDetails = (listing: MarketplaceListing) => {
    console.log('Ver detalhes:', listing);
    // TODO: Abrir modal ou navegar para página de detalhes
  };

  const handleRefresh = async () => {
    await refresh();
  };

  const handleApplyFilters = async () => {
    await applyFilters({
      search: filters.search,
      rarity: filters.rarity,
      club: filters.club,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      sortBy
    });
  };

  const handleClearFilters = async () => {
    setFilters({
      search: '',
      rarity: 'all',
      priceMin: '',
      priceMax: '',
      club: 'all'
    });
    setSortBy('newest');
    await clearFilters();
  };

  // Aplicar filtros quando mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleApplyFilters();
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [filters, sortBy]);

  // Se não está conectado
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">
              <Store className="mx-auto h-16 w-16" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Marketplace Socios Cards</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Conecte sua carteira para explorar e comprar NFTs únicos dos seus clubes favoritos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Marketplace</h1>
            <p className="text-gray-600">Descubra e compre NFTs únicos dos seus clubes favoritos</p>
          </div>
          
          <div className="flex items-center gap-4">
            <ChainValidator compact={true} />
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoadingListings}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingListings ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Validador de chain não compacto se houver problema */}
        {!isValidChain && (
          <div className="mb-6">
            <ChainValidator autoConnect={true} showDetails={true} />
          </div>
        )}
      </div>

      {/* Filtros e busca */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou ID..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* Raridade */}
          <Select 
            value={filters.rarity} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, rarity: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Raridade" />
            </SelectTrigger>
            <SelectContent>
              {RARITY_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clube */}
          <Select 
            value={filters.club} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, club: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Clube" />
            </SelectTrigger>
            <SelectContent>
              {CLUB_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Ordenação */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtros de preço */}
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Preço mín."
              value={filters.priceMin}
              onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
              className="w-32"
              type="number"
              step="0.001"
            />
            <span className="text-gray-500">-</span>
            <Input
              placeholder="Preço máx."
              value={filters.priceMax}
              onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
              className="w-32"
              type="number"
              step="0.001"
            />
            <span className="text-sm text-gray-500">CHZ</span>
          </div>

          {hasActiveFilters && (
            <Button onClick={handleClearFilters} variant="outline" size="sm">
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {isLoadingListings ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando NFTs...
              </span>
            ) : (
              `${totalCount} NFT${totalCount !== 1 ? 's' : ''} disponível${totalCount !== 1 ? 'eis' : ''}`
            )}
          </div>

          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              Filtros ativos
            </Badge>
          )}
        </div>

        {/* Modo de visualização */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Conteúdo principal */}
      {isLoadingListings ? (
        <LoadingSkeleton />
      ) : listings.length === 0 ? (
        <EmptyState 
          hasFilters={hasActiveFilters} 
          onClearFilters={handleClearFilters} 
        />
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          : "space-y-4"
        }>
          {listings.map((listing) => (
            <MarketplaceNFTCard
              key={listing.listingId}
              listing={listing}
              onBuyClick={handleBuyNFT}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Botão carregar mais */}
      {hasMore && !isLoadingListings && listings.length > 0 && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={loadMore}
            variant="outline"
            disabled={isRefreshing}
            className="px-8"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              'Carregar mais NFTs'
            )}
          </Button>
        </div>
      )}

      {/* Indicador de refreshing */}
      {isRefreshing && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-gray-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Atualizando marketplace...</span>
          </div>
        </div>
      )}

      {/* Error display */}
      {(listingsError || buyError) && (
        <div className="mt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">
                {listingsError ? 'Erro ao carregar marketplace' : 'Erro na compra'}
              </span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              {listingsError?.message || buyError?.message}
            </p>
            <Button
              onClick={listingsError ? handleRefresh : () => {/* clear buy error */}}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}