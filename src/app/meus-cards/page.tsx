'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { Header } from "@/components/header";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getRarityDetails } from '@/lib/rarity-helpers';

interface UserCard {
  user_asset_claim_id: string;
  claimed_at: string;
  asset_id: string;
  asset_title: string;
  asset_description?: string;
  asset_image_url?: string;
  asset_data: any; 
  nft_id: number;
  nft_name: string;
  nft_description?: string;
  nft_main_image_url?: string;
  nft_category?: string;
  nft_rarity?: string;
}

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

export default function MeusCardsPage() {
  const { ready, authenticated, user, login } = usePrivy();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && authenticated && user?.id) {
      const fetchUserCards = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/user-cards?privyUserId=${user.id}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao buscar os cards do usuário');
          }
          const data = await response.json();
          console.log('Dados dos cards recebidos:', JSON.stringify(data, null, 2));
          setCards(data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserCards();
    } else if (ready && !authenticated) {
      setIsLoading(false); // Não está carregando se não autenticado
    }
  }, [ready, authenticated, user]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data indisponível';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="max-w-[1800px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Meus Cards Resgatados</h1>
          <p className="mt-1 text-sm text-gray-500">
            Aqui estão todos os cards e assets que você colecionou.
          </p>
        </div>

        {!ready || isLoading ? (
          <div className="text-center py-10">
            <div className="animate-pulse text-xl">Carregando seus cards...</div>
          </div>
        ) : !authenticated ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-2">Conecte sua carteira</h2>
            <p className="mb-4 text-gray-600">Para ver seus cards resgatados, conecte sua carteira.</p>
            <Button onClick={login}>Conectar Carteira</Button>
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-red-50 rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-2">An error occurred</h2>
            <p>{error}</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-2">Nenhum card encontrado</h2>
            <p className="mb-4 text-gray-600">Você ainda não resgatou nenhum card. Explore a seção de <Link href="/mint" className="text-blue-600 hover:underline">Mint</Link> para começar!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {cards.map((card) => (
              <div key={card.user_asset_claim_id} className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden flex flex-col">
                <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden">
                  <img 
                    src={card.asset_image_url || card.nft_main_image_url || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='}
                    alt={card.asset_title || card.nft_name}
                    className="w-full h-full object-cover group-hover:opacity-75"
                  />
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-semibold text-lg">{card.nft_name}</h3>
                  {card.nft_rarity && (
                    <div className="mt-1">
                      <BadgeRarity rarity={card.nft_rarity} />
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-1 truncate" title={card.asset_title || 'Asset sem título'}>{card.asset_title || 'Asset sem título'}</p>
                  <div className="mt-auto pt-2">
                     <p className="text-xs text-gray-400">Resgatado em: {formatDate(card.claimed_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 