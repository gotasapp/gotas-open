'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash, Eye, PlusCircle } from 'lucide-react';
import { NFT, NFTRarity, NFTCategory } from '@/lib/types';
import { getCategories, updateNftCategory } from '@/lib/actions/category-actions';
import { type Category } from '@/lib/types/category';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/ui/optimized-image';

export default function NFTsPage() {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingCategory, setUpdatingCategory] = useState<number | null>(null);

  useEffect(() => {
    // Carregar NFTs e categorias da API
    const fetchData = async () => {
      try {
        const [nftsResponse, categoriesData] = await Promise.all([
          fetch('/api/nfts'),
          getCategories()
        ]);
        
        if (nftsResponse.ok) {
          const nftsData = await nftsResponse.json();
          
          // Mapear os dados da API (snake_case) para o formato esperado (camelCase)
          const mappedNfts = nftsData.map((nft: any) => ({
            id: nft.id,
            title: nft.name, // API retorna 'name', mas frontend espera 'title'
            description: nft.description,
            category: nft.category,
            categoryId: nft.category_id, // ID da categoria para o select
            categoryName: nft.category_name, // Agora vem da API via JOIN
            categoryImageUrl: nft.category_image_url, // Agora vem da API via JOIN
            rarity: nft.rarity,
            totalSupply: nft.total_supply,
            claimedSupply: nft.claimed_supply,
            maxPerUser: nft.max_per_user,
            releaseDate: nft.release_date,
            expirationDate: nft.expiration_date,
            cooldownMinutes: nft.cooldown_minutes,
            mainImageUrl: nft.main_image_url, // API retorna 'main_image_url'
            secondaryImageUrl1: nft.secondary_image_url1,
            secondaryImageUrl2: nft.secondary_image_url2,
            status: nft.status,
            createdAt: nft.created_at,
            updatedAt: nft.updated_at,
            stakeRequired: nft.stake_required,
            stakeTokenAddress: nft.stake_token_address,
            stakeTokenAmount: nft.stake_token_amount,
            stakeTokenSymbol: nft.stake_token_symbol,
            assetsToRedeemCount: nft.assets_to_redeem_count
          }));
          
          setNfts(mappedNfts);
        } else {
          console.error('Erro ao carregar NFTs');
        }
        
        setCategories(categoriesData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Função para filtrar NFTs baseado no termo de busca
  const filteredNFTs = nfts.filter(
    (nft) =>
      nft.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nft.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função para atualizar categoria do NFT
  const handleCategoryChange = async (nftId: number, categoryId: string) => {
    setUpdatingCategory(nftId);
    try {
      await updateNftCategory(nftId, categoryId);
      
      // Encontrar a categoria selecionada
      const selectedCategory = categories.find(c => c.id === categoryId);
      
      // Atualizar o NFT na lista local
      setNfts(prevNfts => 
        prevNfts.map(nft => 
          nft.id === nftId 
            ? { 
                ...nft, 
                categoryId: categoryId,
                categoryName: selectedCategory?.name || null,
                categoryImageUrl: selectedCategory?.imageUrl || null
              }
            : nft
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      alert('Erro ao atualizar categoria do NFT');
    } finally {
      setUpdatingCategory(null);
    }
  };

  // Função para excluir um NFT
  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este NFT?')) {
      try {
        const response = await fetch(`/api/nfts/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Remover NFT da lista
          setNfts(nfts.filter((nft) => nft.id !== id));
        } else {
          console.error('Erro ao excluir NFT');
        }
      } catch (error) {
        console.error('Erro ao excluir NFT:', error);
      }
    }
  };

  // Função para renderizar a cor do badge de raridade
  const getRarityColor = (rarity?: NFTRarity | string | null) => {
    if (!rarity) return 'bg-gray-200 text-gray-800';
    
    const colorMap = {
      [NFTRarity.COMMON]: 'bg-gray-200 text-gray-800',
      [NFTRarity.EPIC]: 'bg-purple-200 text-purple-800',
      [NFTRarity.LEGENDARY]: 'bg-yellow-200 text-yellow-800',
    };
    return colorMap[rarity as NFTRarity] || 'bg-gray-200 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NFTs</h1>
          <p className="text-gray-500">Gerenciar NFTs disponíveis no sistema</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Link
            href="/adm/categories"
            className="inline-flex items-center justify-center rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-700"
          >
            Gerenciar Categorias
          </Link>
          <Button asChild>
            <Link href="/adm/nfts/new">
               <PlusCircle className="mr-2 h-4 w-4" /> Criar NFT
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar NFTs..."
            className="w-full rounded-md border border-gray-300 pl-8 pr-4 py-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                <th className="whitespace-nowrap px-4 py-3 w-12"></th>
                <th className="whitespace-nowrap px-4 py-3">NFT</th>
                <th className="whitespace-nowrap px-4 py-3">Categoria</th>
                <th className="whitespace-nowrap px-4 py-3">Raridade</th>
                <th className="whitespace-nowrap px-4 py-3">Data de Expiração</th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm">
                    Carregando NFTs...
                  </td>
                </tr>
              ) : filteredNFTs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm">
                    Nenhum NFT encontrado.
                  </td>
                </tr>
              ) : (
                filteredNFTs.map((nft) => (
                  <tr key={nft.id} className="text-sm">
                    <td className="px-4 py-3">
                      <OptimizedImage
                        src={nft.mainImageUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='}
                        alt={nft.title || 'NFT Image'}
                        className="h-10 w-10 rounded-md"
                        aspectRatio="square"
                        placeholder="skeleton"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div>
                          <p className="font-medium">{nft.title}</p>
                          <p className="text-xs text-gray-500">
                            {nft.description?.substring(0, 40)}...
                          </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {nft.categoryImageUrl && (
                          <div className="w-6 h-6 rounded overflow-hidden">
                            <img 
                              src={nft.categoryImageUrl} 
                              alt={nft.categoryName || 'categoria'} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <select
                          value={nft.categoryId || ''}
                          onChange={(e) => handleCategoryChange(nft.id, e.target.value)}
                          disabled={updatingCategory === nft.id}
                          className="text-xs border border-gray-300 rounded px-2 py-1 min-w-[100px]"
                        >
                          <option value="">Sem categoria</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        {updatingCategory === nft.id && (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRarityColor(
                          nft.rarity
                        )}`}
                      >
                        {nft.rarity || 'N/A'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {nft.expirationDate
                        ? new Date(nft.expirationDate).toLocaleDateString('pt-BR')
                        : 'Não expira'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          nft.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {nft.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/mint/${nft.id}`}
                          target="_blank"
                          className="rounded-md bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/adm/nfts/${nft.id}/edit`}
                          className="rounded-md bg-blue-100 p-2 text-blue-600 hover:bg-blue-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(nft.id)}
                          className="rounded-md bg-red-100 p-2 text-red-600 hover:bg-red-200"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}