"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Share2, Download } from 'lucide-react';
import { Header } from "@/components/header";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NFTDetail {
  id: number;
  name: string;
  description: string;
  main_image_url: string;
  category_name: string;
  category_image_url: string;
  rarity: string;
  total_supply: number;
  claimed_supply: number;
  max_per_user: number;
  cooldown_minutes: number;
  stake_required: boolean;
  stake_token_symbol?: string;
  stake_token_amount?: string;
  show_statistics?: boolean;
  created_at: string;
}

interface RecommendedNFT {
  id: number;
  name: string;
  main_image_url: string;
  rarity: string;
  category_name: string;
}

export default function NFTDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [nft, setNft] = useState<NFTDetail | null>(null);
  const [recommendedNFTs, setRecommendedNFTs] = useState<RecommendedNFT[]>([]);
  const [loading, setLoading] = useState(true);

  const nftId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : undefined;

  useEffect(() => {
    if (nftId) {
      fetchNFTDetails();
      fetchRecommendedNFTs();
    }
  }, [nftId]);

  const fetchNFTDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/nfts/${nftId}`);
      if (response.ok) {
        const data = await response.json();
        setNft(data);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do NFT:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedNFTs = async () => {
    try {
      const response = await fetch(`/api/nfts?limit=3&exclude=${nftId}`);
      if (response.ok) {
        const data = await response.json();
        setRecommendedNFTs(data.nfts || []);
      }
    } catch (error) {
      console.error('Erro ao buscar NFTs recomendados:', error);
    }
  };

  const handleMintClick = () => {
    router.push(`/mint/${nftId}`);
  };

  const handleBackClick = () => {
    router.back();
  };

  const handleRecommendedClick = (id: number) => {
    router.push(`/nft/${id}`);
  };

  const rarityColorMap = {
    common: 'bg-gray-500 text-white',
    epic: 'bg-purple-500 text-white',
    legendary: 'bg-yellow-500 text-black',
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return '👑';
      case 'epic':
        return '💎';
      case 'common':
      default:
        return '⭐';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </main>
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-grow flex justify-center items-center">
          <p className="text-gray-500">NFT não encontrado</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 flex-grow">
        <Button 
          variant="ghost" 
          onClick={handleBackClick}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold">{nft.name}</h1>
              <p className="text-gray-500">{nft.category_name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Heart className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 relative">
              <img 
                src={nft.main_image_url} 
                alt={nft.name}
                className="w-full h-full object-cover rounded-2xl"
              />
              <div className="absolute top-4 left-4">
                <Badge className={`${rarityColorMap[nft.rarity?.toLowerCase() as keyof typeof rarityColorMap] || rarityColorMap.common} font-semibold px-3 py-1 rounded-full`}>
                  {getRarityIcon(nft.rarity)} {nft.rarity}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold mb-3">Descrição</h3>
              <p className="text-gray-600 leading-relaxed">
                {nft.description}
              </p>
            </div>

            {nft.show_statistics === true && (
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="text-3xl font-bold">{nft.total_supply}</div>
                  <div className="text-gray-500">Total</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="text-3xl font-bold">{nft.claimed_supply}</div>
                  <div className="text-gray-500">Claimed</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="text-3xl font-bold">{nft.total_supply - nft.claimed_supply}</div>
                  <div className="text-gray-500">Available</div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Details</h3>
              <div className="space-y-3">
                {nft.cooldown_minutes > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Claim frequency</span>
                    <span className="font-medium">
                      {nft.cooldown_minutes >= 1440 
                        ? `Every ${nft.cooldown_minutes / 1440} day${nft.cooldown_minutes / 1440 > 1 ? 's' : ''}`
                        : nft.cooldown_minutes >= 60 
                        ? `Every ${nft.cooldown_minutes / 60} hour${nft.cooldown_minutes / 60 > 1 ? 's' : ''}`
                        : `Every ${nft.cooldown_minutes} minute${nft.cooldown_minutes > 1 ? 's' : ''}`
                      }
                    </span>
                  </div>
                )}

                {nft.stake_required && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stake required</span>
                    <span className="font-medium">
                      {nft.stake_token_amount} {nft.stake_token_symbol}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-500">Rarity</span>
                  <Badge className={`${rarityColorMap[nft.rarity?.toLowerCase() as keyof typeof rarityColorMap] || rarityColorMap.common} font-semibold px-3 py-1 rounded-full`}>
                    {getRarityIcon(nft.rarity)} {nft.rarity}
                  </Badge>
                </div>
              </div>
            </div>

            {nft.show_statistics === true && (
              <div>
                <div className="flex justify-between mb-3">
                  <span className="font-medium">{Math.round((nft.claimed_supply / nft.total_supply) * 100)}% claimed</span>
                  <span className="text-gray-500">{nft.total_supply - nft.claimed_supply} remaining</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${(nft.claimed_supply / nft.total_supply) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button 
                onClick={handleMintClick}
                className="flex-1 bg-black hover:bg-gray-800 text-white py-6 text-lg rounded-xl"
              >
                Connect Wallet
              </Button>
              <Button variant="outline" size="icon" className="py-6 px-6 rounded-xl">
                <Download className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Recommended NFTs Section */}
        {recommendedNFTs.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-8">{nft.category_name} NFTs</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommendedNFTs.map((recommendedNFT) => (
                <div 
                  key={recommendedNFT.id}
                  onClick={() => handleRecommendedClick(recommendedNFT.id)}
                  className="cursor-pointer group"
                >
                  <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 relative mb-4 group-hover:scale-105 transition-transform duration-200">
                    <img 
                      src={recommendedNFT.main_image_url} 
                      alt={recommendedNFT.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className={`${rarityColorMap[recommendedNFT.rarity?.toLowerCase() as keyof typeof rarityColorMap] || rarityColorMap.common} font-semibold px-3 py-1 rounded-full`}>
                        {getRarityIcon(recommendedNFT.rarity)} {recommendedNFT.rarity}
                      </Badge>
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
                    {recommendedNFT.name}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 
