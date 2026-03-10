'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRarityDetails } from '@/lib/rarity-helpers';
import { Filter, Grid } from 'lucide-react';

interface Asset {
  id: string;
  title: string;
  description: string;
  image_url: string;
  rarity: string;
  nft_number: number;
  nft_id: number;
  claimed: boolean;
  created_at: string;
  updated_at: string;
  nft_name: string;
  category_name: string;
  category_image_url: string;
  total_supply: number;
  claimed_supply: number;
}

interface Category {
  id: number;
  name: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

const BadgeRarity = ({ rarity }: { rarity: string }) => {
  const rarityInfo = getRarityDetails(rarity);
  const Icon = rarityInfo.icon;

  return (
    <Badge className={`${rarityInfo.className} border-0 text-xs px-2 py-1 rounded-full`}>
      <Icon className="w-3 h-3 mr-1.5" />
      {rarityInfo.label}
    </Badge>
  );
};

export default function GalleryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [totalCount, setTotalCount] = useState(0);

  const rarityOptions = [
    { value: 'all', label: 'Todas as Raridades' },
    { value: 'Comum', label: 'Comum' },
    { value: 'Épico', label: 'Épico' },
    { value: 'Lendário', label: 'Lendário' }
  ];

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchAssets = useCallback(async (page: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '40'
      });

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      if (selectedRarity !== 'all') {
        params.append('rarity', selectedRarity);
      }

      const response = await fetch(`/api/nfts/gallery?${params.toString()}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (reset) {
          setAssets(result.data);
        } else {
          setAssets(prev => [...prev, ...result.data]);
        }
        
        setHasMore(result.pagination.hasMore);
        setTotalCount(result.pagination.total);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, selectedRarity]);

  const handleFilterChange = useCallback(() => {
    setCurrentPage(1);
    setHasMore(true);
    fetchAssets(1, true);
  }, [fetchAssets]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchAssets(currentPage + 1, false);
    }
  }, [currentPage, hasMore, loadingMore, fetchAssets]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchAssets(1, true);
  }, [selectedCategory, selectedRarity, fetchAssets]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        !loadingMore && 
        hasMore && 
        window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore, hasMore, loadingMore]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="px-6 lg:px-12 pt-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Grid className="h-8 w-8 text-gray-900" />
            <h1 className="text-4xl font-bold text-gray-900">Galeria de Cards</h1>
          </div>
          <p className="text-lg text-gray-600">
            Explore todos os cards disponíveis na plataforma
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Filter className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">Filtros:</span>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRarity} onValueChange={setSelectedRarity}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Raridade" />
              </SelectTrigger>
              <SelectContent>
                {rarityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto text-sm text-gray-600">
              {totalCount} cards encontrados
            </div>
          </div>
        </div>

        <div className="pb-12">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 aspect-[3/4] rounded-lg mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : assets.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {assets.map((asset) => (
                  <div key={asset.id} className="group cursor-pointer">
                    <div className="aspect-[3/4] relative overflow-hidden rounded-lg bg-gray-100 mb-3">
                      <OptimizedImage
                        src={asset.image_url}
                        alt={asset.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        placeholder="skeleton"
                      />
                      
                      <div className="absolute top-2 right-2">
                        <BadgeRarity rarity={asset.rarity} />
                      </div>

                      {asset.claimed && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            Resgatado
                          </Badge>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-end">
                        <div className="w-full p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <p className="text-xs text-gray-300 mb-1">
                            {asset.category_name} #{asset.nft_number}
                          </p>
                          <p className="text-xs text-gray-300">
                            {asset.claimed_supply}/{asset.total_supply} resgatados
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">
                        {asset.title}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {asset.category_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {loadingMore && (
                <div className="flex justify-center py-8 mt-6">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                    <span>Carregando mais cards...</span>
                  </div>
                </div>
              )}
              
              {!hasMore && assets.length > 0 && (
                <div className="flex justify-center py-8 mt-6">
                  <span className="text-gray-500 text-sm">
                    Todos os {totalCount} cards foram carregados
                  </span>
                </div>
                )}
            </>
          ) : (
            <div className="text-center py-20">
              <div className="text-gray-400 mb-4">
                <Grid className="mx-auto h-16 w-16" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum card encontrado</h3>
              <p className="text-gray-600">
                Tente ajustar os filtros para encontrar cards.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 