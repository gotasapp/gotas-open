'use client';

import { useState, useEffect } from 'react';
import { Header } from "@/components/header";
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { usePrivy } from '@privy-io/react-auth';
import { Button } from "@/components/ui/button";
import { TokenGrid } from "@/components/token-selector/token-grid";
import { ConnectionChoiceModal } from '@/components/modals/ConnectionChoiceModal';
import { ChzBalanceCard } from '@/components/wallet/ChzBalanceCard';
import { StakesPageSkeleton } from '@/components/ui/stakes-page-skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NftRequirementsTab } from "@/components/stakes/nft-requirements-tab";

export default function StakesPage() {
  const { authenticated } = useUnifiedAuth();
  const { login } = usePrivy();
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isChzBalanceReady, setIsChzBalanceReady] = useState(false);
  const [isTokenGridReady, setIsTokenGridReady] = useState(false);

  // Loading orchestration - wait for all components to be ready
  useEffect(() => {
    console.log('[StakesPage] Loading state check:', {
      authenticated,
      isChzBalanceReady,
      isTokenGridReady,
      calculatedLoading: !(isChzBalanceReady && isTokenGridReady)
    });
    
    if (authenticated) {
      // If authenticated, wait for both components to be ready
      setIsLoading(!(isChzBalanceReady && isTokenGridReady));
    } else {
      // If not authenticated, no need to wait for components
      setIsLoading(false);
    }
  }, [authenticated, isChzBalanceReady, isTokenGridReady]);

  // Add a safety timeout to prevent infinite loading
  useEffect(() => {
    if (authenticated && isLoading) {
      const timeout = setTimeout(() => {
        console.warn('[StakesPage] Safety timeout triggered - forcing loading to complete');
        setIsLoading(false);
      }, 10000); // 10 seconds safety timeout

      return () => clearTimeout(timeout);
    }
  }, [authenticated, isLoading]);

  const handlePrivyLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Erro no login:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Stake</h1>

          {!authenticated ? (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-4">Conecte sua carteira para começar</h2>
              <p className="text-gray-600 mb-6">
                Você precisa conectar sua carteira para visualizar e gerenciar seus stakes.
              </p>
              <Button onClick={() => setIsChoiceModalOpen(true)} size="lg">
                Conectar Carteira
              </Button>
            </div>
          ) : (
            <>
              {isLoading && <StakesPageSkeleton />}
              <div className={`space-y-6 ${isLoading ? 'hidden' : ''}`}>
                <ChzBalanceCard 
                  className="max-w-sm" 
                  onLoadingStateChange={setIsChzBalanceReady}
                />
                
                <Tabs defaultValue="tokens" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tokens">Meus Tokens</TabsTrigger>
                    <TabsTrigger value="nft-requirements">Requisitos NFTs</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="tokens" className="space-y-6 mt-6">
                    <TokenGrid onLoadingStateChange={setIsTokenGridReady} />
                  </TabsContent>
                  
                  <TabsContent value="nft-requirements" className="mt-6">
                    <NftRequirementsTab />
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </div>
      </main>

      <ConnectionChoiceModal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        onPrivyLogin={handlePrivyLogin}
      />
    </div>
  );
}