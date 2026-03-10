"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Asset } from '@/lib/types';

export function useNFTModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Verificar se há um NFT ID na URL quando o componente monta
  useEffect(() => {
    if (searchParams) {
      const nftParam = searchParams.get('nft');
      if (nftParam) {
        // Quando acessado via URL, não temos o asset completo
        // O componente pai deve buscar o asset pelo ID
        setIsOpen(true);
      }
    }
  }, [searchParams]);

  const openModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsOpen(true);
    
    // Adicionar o parâmetro nft à URL usando o nftId do asset
    if (searchParams && asset.nftId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('nft', asset.nftId.toString());
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedAsset(null);
    
    // Remover o parâmetro nft da URL
    if (searchParams && pathname) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('nft');
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  };

  return {
    isOpen,
    selectedAsset,
    openModal,
    closeModal,
    currentPage: pathname
  };
} 