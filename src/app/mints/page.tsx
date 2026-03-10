'use client';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from "@/components/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NFT, NFTRarity } from '@/lib/types';
import { fetchNFTs, getAvailableNFTs } from '@/lib/db-utils';
import { getCategories } from '@/lib/actions/category-actions';
import { type Category } from '@/lib/types/category';
import { X, Filter, Search, Grid3X3, List, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { ImagePreloader } from '@/components/ui/image-preloader';
import { CardSkeleton } from '@/components/ui/card-skeleton';
// Removed team icons beside categories per requirements
import { getRarityDetails } from '@/lib/rarity-helpers';
import { CategoriesTabs } from '@/components/ui/categories-tabs';

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

const BadgeRarity = ({ rarity }: { rarity: string | null | undefined }) => {
  if (!rarity) return null;
  const rarityInfo = getRarityDetails(rarity);
  const Icon = rarityInfo.icon;

  return (
    <Badge className={`${rarityInfo.className} text-xs border-0`}>
      <Icon className="w-3 h-3 mr-1.5" />
      {rarityInfo.label}
    </Badge>
  );
};

function MintsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [availableNFTs, setAvailableNFTs] = useState<NFT[]>([]);
  const [filteredNFTs, setFilteredNFTs] = useState<NFT[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryIconMap, setCategoryIconMap] = useState<Record<string, string>>({});
  const normalizeKey = (s?: string | null) => (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  
  const getInitialViewMode = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'list';
    }
    return 'grid';
  };
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(getInitialViewMode);

  // Get category filter from URL
  const categoryFilter = searchParams?.get('category') || null;

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [nfts, categoriesData] = await Promise.all([
          fetchNFTs(),
          getCategories()
        ]);
        
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
        const processedNFTs = getAvailableNFTs(nfts);
        setAvailableNFTs(processedNFTs);
        
        // Apply category filter if exists
        let filtered = processedNFTs;
        if (categoryFilter) {
          filtered = processedNFTs.filter(nft => 
            nft.categoryName?.toLowerCase() === categoryFilter.toLowerCase()
          );
          setSelectedCategory(categoryFilter.toLowerCase());
        } else {
          // Reset category filter when no category in URL
          setSelectedCategory('all');
        }
        setFilteredNFTs(filtered);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [categoryFilter]);

  // Filter and sort NFTs
  useEffect(() => {
    let filtered = [...availableNFTs];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(nft => 
        nft.title?.toLowerCase().includes(query) || 
        nft.description?.toLowerCase().includes(query) ||
        nft.categoryName?.toLowerCase().includes(query) ||
        nft.rarity?.toLowerCase().includes(query)
      );
    }
    
    // Apply rarity filter
    if (selectedRarity !== 'all') {
      filtered = filtered.filter(nft => nft.rarity?.toLowerCase() === selectedRarity);
    }
    
    // Apply status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'available') {
        filtered = filtered.filter(nft => (nft.remainingSupply || 0) > 0);
      } else if (selectedStatus === 'sold-out') {
        filtered = filtered.filter(nft => (nft.remainingSupply || 0) <= 0);
      }
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(nft => 
        nft.categoryName?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
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
        case 'supply':
          return b.totalSupply - a.totalSupply;
        case 'owners':
          return b.claimedSupply - a.claimedSupply;
        default:
          return 0;
      }
    });
    
    setFilteredNFTs(filtered);
  }, [searchQuery, selectedRarity, selectedStatus, selectedCategory, sortBy, availableNFTs]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRarity('all');
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSortBy('newest');
    router.push('/mints');
  };

  // Get stats
  const totalCards = availableNFTs.length;
  const totalCollectors = 1; // Simplified for now since owners property doesn't exist
  const availableCards = availableNFTs.filter(nft => (nft.remainingSupply || 0) > 0).length;
  const soldOutCards = availableNFTs.filter(nft => (nft.remainingSupply || 0) <= 0).length;

  // Find current category for display
  const currentCategory = categoryFilter ? 
    categories.find(cat => cat.name.toLowerCase() === categoryFilter.toLowerCase()) : 
    null;

  // Preload das primeiras 6 imagens para melhor performance
  const preloadImages = filteredNFTs.slice(0, 6).map(nft => nft.mainImageUrl).filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <ImagePreloader images={preloadImages} priority />
      <Header />
      <main className="max-w-[1800px] w-full mx-auto px-8 py-8 flex-grow">


        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search and Mobile Filter Button */}
            <div className="w-full lg:w-auto lg:flex-1 lg:max-w-md">
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Buscar cards, categorias ou colecionadores..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-10 h-12"
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
                
                {/* Mobile Filter Button */}
                <Button
                  variant="outline"
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="lg:hidden flex items-center gap-2 px-4 py-3"
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                    showMobileFilters ? 'rotate-180' : ''
                  }`} />
                </Button>
              </div>
            </div>

            {/* Filters and Controls - Right Side */}
            <div className={`w-full lg:w-auto lg:block transition-all duration-300 overflow-hidden ${
              showMobileFilters 
                ? 'max-h-96 opacity-100' 
                : 'max-h-0 opacity-0 lg:max-h-none lg:opacity-100'
            }`}>
              <div className="flex flex-wrap items-center gap-3 justify-start lg:justify-end pt-4 lg:pt-0">
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    if (value === 'all') {
                      router.push('/mints');
                    } else {
                      router.push(`/mints?category=${encodeURIComponent(value)}`);
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

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Todos os Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="sold-out">Esgotado</SelectItem>
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
                {(searchQuery || selectedRarity !== 'all' || selectedStatus !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest') && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="px-3"
                  >
                    Limpar Filtros
                  </Button>
                )}

                {/* Statistics Button */}
                {/* <StatisticsSheet 
                  data={{
                    totalCards,
                    totalCollectors,
                    availableCards,
                    soldOutCards,
                    type: 'mints'
                  }}
                /> */}

                {/* View Mode Toggle */}
                <div className="flex border border-gray-200 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results count and Categories */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {categoryFilter ? `${currentCategory?.name || categoryFilter} Cards` : 'Todos os Cards'}
            </h2>
            <div className="text-gray-500">
              {filteredNFTs.length} of {totalCards} cards
            </div>
          </div>
          
          {/* Categories Tabs */}
          <CategoriesTabs />
        </div>

        {isLoading ? (
          /* Loading skeleton */
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-6`}>
            <CardSkeleton variant={viewMode === 'grid' ? 'grid' : 'list'} count={8} />
          </div>
        ) : filteredNFTs.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-medium mb-2">Nenhum card encontrado</h2>
            <p className="text-gray-500 text-center max-w-md">
              {searchQuery ? 
                `Nenhum resultado encontrado para "${searchQuery}".` :
                selectedCategory !== 'all' ? 
                  `Nenhum card encontrado na categoria ${currentCategory?.name || categoryFilter}.` :
                  'Nenhum card disponível no momento.'
              }
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          </div>
        ) : (
          /* Card grid/list */
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-6`}>
            {filteredNFTs.map((nft) => (
              <Link 
                href={`/mint/${nft.id}`}
                key={nft.id}
                className={`group ${viewMode === 'grid' ? 'flex flex-col' : 'h-32 flex'} rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-300 bg-white overflow-hidden`}
              >
                {viewMode === 'grid' ? (
                  <>
                    <div className="aspect-square overflow-hidden">
                      <img 
                        src={nft.mainImageUrl || '/placeholder-card.svg'}
                        alt={nft.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 rounded-3xl"
                        onError={(e) => (e.currentTarget.src = '/placeholder-card.svg')}
                      />
                    </div>
                    
                    {/* Content below image */}
                    <div className="p-4 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <BadgeRarity rarity={nft.rarity} />
                        {nft.categoryName && (
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {nft.categoryName}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <h3 className="font-bold text-lg mb-2 line-clamp-2 text-gray-900">{nft.title}</h3>
                      {nft.showStatistics === true && (
                        <>
                          <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
                            <span>{nft.remainingSupply} disponível</span>
                            <span>{nft.claimedSupply} proprietários</span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="mt-auto">
                            <Progress 
                              value={nft.supplyPercentage || 0} 
                              className="h-1"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-32 h-full flex-shrink-0 overflow-hidden">
                      <img
                        src={nft.mainImageUrl || '/placeholder-card.svg'}
                        alt={nft.title}
                        className="w-full h-full object-cover rounded-3xl"
                        onError={(e) => (e.currentTarget.src = '/placeholder-card.svg')}
                      />
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <BadgeRarity rarity={nft.rarity} />
                          {nft.categoryName && (
                            <div>
                              <Badge variant="outline" className="text-xs">
                                {nft.categoryName}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <h3 className="font-bold text-lg mb-1 line-clamp-1">{nft.title}</h3>
                        <p className="text-gray-600 text-sm line-clamp-2">{nft.description}</p>
                      </div>
                      {nft.showStatistics === true && (
                        <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                          <span>{nft.remainingSupply} disponível</span>
                          <span>{nft.claimedSupply} proprietários</span>
                          <Progress value={nft.supplyPercentage || 0} className="w-16 h-1" />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function MintsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-grow flex justify-center items-center">
          <div className="animate-pulse text-2xl">Carregando...</div>
        </main>
      </div>
    }>
      <MintsPageContent />
    </Suspense>
  );
}
