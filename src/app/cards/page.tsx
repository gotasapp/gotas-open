'use client';
import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from "@/components/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Asset, NFTRarity } from '@/lib/types';
import { getCategories } from '@/lib/actions/category-actions';
import { type Category } from '@/lib/types/category';
import { X, Search, Grid3X3, List } from 'lucide-react';
import Image from 'next/image';
import { useNFTModal } from '@/hooks/useNFTModal';
import NFTDetailModal from '@/components/modals/NFTDetailModal';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { ImagePreloader } from '@/components/ui/image-preloader';
import { CardSkeleton } from '@/components/ui/card-skeleton';
import { getRarityDetails } from '@/lib/rarity-helpers';
// Removed team icons beside categories per requirements

// Rarity color mapping
const rarityColorMap = {
  [NFTRarity.COMMON]: 'bg-gray-400',
  [NFTRarity.EPIC]: 'bg-purple-400',
  [NFTRarity.LEGENDARY]: 'bg-yellow-400',
};

// Rarity icons
const rarityIcons = {
  [NFTRarity.COMMON]: '●',
  [NFTRarity.EPIC]: '♦',
  [NFTRarity.LEGENDARY]: '👑',
};

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

// Card component for grid view
const CardGridItem = ({ asset, onClick, categoryName }: { asset: Asset; onClick: () => void; categoryName?: string }) => {
  return (
    <div 
      className="bg-transparent rounded-lg shadow-none hover:shadow-md transition-shadow cursor-pointer border border-gray-100 overflow-hidden"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="relative">
          <OptimizedImage
            src={asset.imageUrl || '/placeholder-card.svg'}
            alt={asset.title}
            className="w-full h-auto object-contain rounded-lg"
            aspectRatio="min-square"
            placeholder="skeleton"
          />
          <div className="absolute top-2 right-2">
            <BadgeRarity rarity={asset.rarity} />
          </div>
          {/* Team/category icon removed by request */}
        </div>
      </div>
      <div className="px-5 pb-5 pt-2">
        <h3 className="font-semibold text-gray-900 text-sm truncate mb-1">
          {asset.title}
        </h3>
        <div className="flex items-center justify-between">
          {categoryName ? (
            <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
              <span>{categoryName}</span>
            </div>
          ) : <span />}
          <p className="text-xs text-gray-500 truncate ml-2">
            Por @{asset.claimedBy?.username || 
              asset.claimedBy?.displayName || 
              (asset.claimedBy?.walletAddress ? asset.claimedBy.walletAddress.slice(0, 8) + '...' : 'unknown')}
          </p>
        </div>
      </div>
    </div>
  );
};

// Grid skeleton component
const GridSkeleton = ({ count = 8 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="aspect-square bg-gray-200 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
          </div>
        </div>
      ))}
    </>
  );
};

function CardsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isOpen, selectedAsset, openModal, closeModal, currentPage: modalCurrentPage } = useNFTModal();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryIconMap, setCategoryIconMap] = useState<Record<string, string>>({});

  const normalizeKey = (s?: string | null) => (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Ref to store scroll position before loading more
  const scrollPositionRef = useRef<number | null>(null);
  const shouldRestoreScrollRef = useRef(false);

  // Get category filter from URL
  const categoryFilter = searchParams?.get('category') || null;

  // Load view mode preference from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('cards-view-mode');
    if (savedViewMode && (savedViewMode === 'grid' || savedViewMode === 'list')) {
      setViewMode(savedViewMode as 'grid' | 'list');
    }
  }, []);

  // Save view mode preference to localStorage
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('cards-view-mode', mode);
  };

  // Fetch claimed assets
  const fetchClaimedAssets = useCallback(async (page: number = 1, append: boolean = false, search?: string, category?: string, rarity?: string): Promise<void> => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '40'
      });

      const searchTerm = search !== undefined ? search : searchQuery;
      const categoryFilter = category !== undefined ? category : selectedCategory;
      const rarityFilter = rarity !== undefined ? rarity : selectedRarity;

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }

      if (rarityFilter !== 'all') {
        params.append('rarity', rarityFilter);
      }

      const response = await fetch(`/api/assets/claimed?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch claimed assets');
      }
      
      const result = await response.json();
      const newAssets = result.data;
      
      if (append) {
        setAssets(prev => [...prev, ...newAssets]);
      } else {
        setAssets(newAssets);
      }
      
      setHasMore(result.pagination.hasMore);
      setTotalCount(result.pagination.total);
      setCurrentPage(page);
      
    } catch (error) {
      console.error('Error fetching claimed assets:', error);
      if (!append) {
        setAssets([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [searchQuery, selectedCategory, selectedRarity]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
        const map: Record<string, string> = {};
        categoriesData.forEach(c => {
          if (c.imageUrl) {
            const nameKey = normalizeKey(c.name);
            if (nameKey) map[nameKey] = c.imageUrl;
            const symbolKey = normalizeKey(c.symbol || '');
            if (symbolKey) map[symbolKey] = c.imageUrl;
          }
        });
        setCategoryIconMap(map);
        
        // Apply category filter if exists
        if (categoryFilter) {
          setSelectedCategory(categoryFilter.toLowerCase());
        }
        
        // Load initial data
        setCurrentPage(1);
        setHasMore(true);
        await fetchClaimedAssets(1, false);
        setIsInitialLoad(false);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, [categoryFilter, fetchClaimedAssets]);

  // Debounced search effect (skip on initial load)
  useEffect(() => {
    if (isInitialLoad) return;
    
    const timeoutId = setTimeout(() => {
      // Reset pagination when filters change
      setCurrentPage(1);
      setHasMore(true);
      fetchClaimedAssets(1, false);
    }, searchQuery.trim() ? 500 : 0); // 500ms debounce for search, immediate for other filters
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, selectedRarity, fetchClaimedAssets, isInitialLoad]);

  // Sort assets (search, category, and rarity are now handled server-side)
  useEffect(() => {
    let sorted = [...assets];
    
    // Apply sorting
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.title.localeCompare(b.title);
        case 'rarity':
          const rarityOrder = { common: 1, epic: 2, legendary: 3 };
          return (rarityOrder[b.rarity?.toLowerCase() as keyof typeof rarityOrder] || 0) - 
                 (rarityOrder[a.rarity?.toLowerCase() as keyof typeof rarityOrder] || 0);
        case 'nft':
          return (a.nftName || '').localeCompare(b.nftName || '');
        default:
          return 0;
      }
    });
    
    setFilteredAssets(sorted);
  }, [sortBy, assets]);

  // Load more data button handler
  const handleLoadMore = useCallback(async () => {
    if (!isLoadingMore && hasMore) {
      // Preserve scroll position before loading
      scrollPositionRef.current = window.scrollY;
      shouldRestoreScrollRef.current = true;
      
      await fetchClaimedAssets(currentPage + 1, true);
    }
  }, [isLoadingMore, hasMore, currentPage, fetchClaimedAssets]);
  
  // Restore scroll position after assets are updated
  useEffect(() => {
    if (shouldRestoreScrollRef.current && scrollPositionRef.current !== null && !isLoadingMore) {
      // Use double requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollPositionRef.current !== null) {
            window.scrollTo({
              top: scrollPositionRef.current,
              behavior: 'instant'
            });
            scrollPositionRef.current = null;
            shouldRestoreScrollRef.current = false;
          }
        });
      });
    }
  }, [assets, isLoadingMore]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRarity('all');
    setSelectedCategory('all');
    setSortBy('newest');
    router.push('/cards');
  };

  // Get stats
  const totalCards = totalCount;

  // Find current category for display
  const currentCategory = categoryFilter ? 
    categories.find(cat => cat.name.toLowerCase() === categoryFilter.toLowerCase()) : 
    null;

  // Preload das primeiras 6 imagens para melhor performance
  const preloadImages = filteredAssets.slice(0, 6).map(asset => asset.imageUrl).filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <ImagePreloader images={preloadImages} priority />
      <Header />
      <main className="max-w-[1800px] w-full mx-auto sm:px-8 px-4 py-8 flex-grow">
        


        {/* Active category filter */}
        {categoryFilter && currentCategory && (
          <div className="mb-6 flex items-center justify-center">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              {currentCategory.imageUrl && (
                <div className="w-6 h-6 rounded overflow-hidden">
                  <Image 
                    src={currentCategory.imageUrl} 
                    alt={currentCategory.name} 
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <span className="text-blue-800 font-medium">
                Category: {currentCategory.name}
              </span>
              <button
                onClick={() => router.push('/cards')}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                title="Remove filter"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search - Left Side */}
            <div className="w-full lg:w-auto lg:flex-1 lg:max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Buscar cards, categorias ou colecionadores..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 px-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filters and Controls - Right Side */}
            <div className="w-full lg:w-auto">
              <div className="flex flex-wrap items-center gap-3 justify-start lg:justify-end">
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    if (value === 'all') {
                      router.push('/cards');
                    } else {
                      router.push(`/cards?category=${encodeURIComponent(value)}`);
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todas as Categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Categorias</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name.toLowerCase()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedRarity} onValueChange={setSelectedRarity}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Todas as Raridades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Raridades</SelectItem>
                    <SelectItem value="common">Comum</SelectItem>
                    <SelectItem value="epic">Épica</SelectItem>
                    <SelectItem value="legendary">Lendária</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Mais Recentes</SelectItem>
                    <SelectItem value="oldest">Mais Antigos</SelectItem>
                    <SelectItem value="rarity">Raridade</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear filters */}
                {(searchQuery || selectedRarity !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest') && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="px-3"
                  >
                    Limpar Filtros
                  </Button>
                )}

                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewModeChange('grid')}
                    className="h-8 px-3"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewModeChange('list')}
                    className="h-8 px-3"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Statistics Button */}
                {/* <StatisticsSheet 
                  data={{
                    totalCards,
                    totalCollectors: 1,
                    availableCards: totalCards,
                    soldOutCards: 0,
                    type: 'cards'
                  }}
                /> */}


              </div>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg sm:text-xl font-semibold">
            {categoryFilter ? `${currentCategory?.name || categoryFilter} Cards` : 'All Cards'}
          </h2>
          <div className="text-sm sm:text-base text-gray-500">
            {filteredAssets.length} of {totalCards} cards
          </div>
        </div>

        {isLoading ? (
          /* Loading skeleton */
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              <GridSkeleton count={12} />
            </div>
          ) : (
            <div className="bg-white overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-6 font-medium text-gray-500 text-sm uppercase tracking-wider">CARD</th>
                    <th className="text-right py-4 px-6 font-medium text-gray-500 text-xs sm:text-sm uppercase tracking-wider">CATEGORIA</th>
                    <th className="text-right py-4 px-6 font-medium text-gray-500 text-sm uppercase tracking-wider">RARIDADE</th>
                    <th className="text-right py-4 px-6 font-medium text-gray-500 text-sm uppercase tracking-wider">RESGATADO POR</th>
                  </tr>
                </thead>
                <tbody>
                  <CardSkeleton variant="table" count={8} />
                </tbody>
              </table>
            </div>
          )
        ) : filteredAssets.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-medium mb-2">No cards found</h2>
            <p className="text-gray-500 text-center max-w-md">
              {searchQuery ? 
                `We couldn't find any cards matching "${searchQuery}". Try a different search term.` :
                categoryFilter ?
                `No cards found in the ${currentCategory?.name || categoryFilter} category.` :
                "There are no cards available right now. Check back later for new additions."
              }
            </p>
            {(searchQuery || categoryFilter || selectedRarity !== 'all' || selectedCategory !== 'all') && (
              <div className="mt-4">
                <Button variant="outline" onClick={clearFilters}>
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Cards content */
          <>
            {viewMode === 'grid' ? (
              /* Grid view */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredAssets.map((asset) => {
                  const cn = asset.categoryName || asset.category || '';
                  return (
                    <CardGridItem
                      key={asset.claimId || `${asset.id}-${Date.now()}-${Math.random()}`}
                      asset={asset}
                      onClick={() => openModal(asset)}
                      categoryName={cn || undefined}
                    />
                  );
                })}
              </div>
            ) : (
              /* List view */
              <div className="bg-white overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-6 font-medium text-gray-500 text-sm uppercase tracking-wider">CARD</th>
                      <th className="text-right py-4 px-6 font-medium text-gray-500 text-xs sm:text-sm uppercase tracking-wider">CATEGORIA</th>
                      <th className="text-right py-4 px-6 font-medium text-gray-500 text-sm uppercase tracking-wider">RARIDADE</th>
                      <th className="text-right py-4 px-6 font-medium text-gray-500 text-sm uppercase tracking-wider">RESGATADO POR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => (
                      <tr 
                        key={asset.claimId || `${asset.id}-${Date.now()}-${Math.random()}`}
                        className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer"
                        onClick={() => openModal(asset)}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <OptimizedImage
                              src={asset.imageUrl || '/placeholder-card.svg'}
                              alt={asset.title}
                              className="w-12 h-12 rounded-lg flex-shrink-0"
                              aspectRatio="square"
                              placeholder="skeleton"
                            />
                            <h3 className="font-semibold text-gray-900">
                              <span className="text-base sm:text-lg">{asset.title}</span>
                            </h3>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="inline-flex items-center justify-end text-gray-600 text-sm sm:text-base">
                            <span>{asset.categoryName || '-'}</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <BadgeRarity rarity={asset.rarity} />
                        </td>
                        <td className="py-4 px-6 text-right">
                          <a 
                            href={`/${asset.claimedBy?.username || asset.claimedBy?.walletAddress || 'unknown'}`}
                            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            @{asset.claimedBy?.username || 
                              asset.claimedBy?.displayName || 
                              (asset.claimedBy?.walletAddress ? asset.claimedBy.walletAddress.slice(0, 8) + '...' : 'unknown')}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center py-8 mt-6">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  variant="outline"
                  size="lg"
                  className="min-w-[200px]"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                      Carregando...
                    </>
                  ) : (
                    'Carregar mais'
                  )}
                </Button>
              </div>
            )}
            
            {/* End of results indicator */}
            {!hasMore && assets.length > 0 && (
              <div className="flex justify-center py-8 mt-6">
                <span className="text-gray-500 text-sm">
                  Todos os {totalCards} cards foram carregados
                </span>
              </div>
            )}
          </>
        )}
      </main>

      {/* NFT Detail Modal */}
      {selectedAsset && (
        <NFTDetailModal
          isOpen={isOpen}
          onClose={closeModal}
          asset={selectedAsset}
          fromPage={modalCurrentPage || undefined}
        />
      )}
    </div>
  );
}

export default function CardsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-grow flex justify-center items-center">
          <div className="animate-pulse text-2xl">Carregando...</div>
        </main>
      </div>
    }>
      <CardsPageContent />
    </Suspense>
  );
}
