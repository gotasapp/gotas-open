'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { totalListings, getAllListings } from "thirdweb/extensions/marketplace";
import { getMarketplaceContract, getActiveChain, getNFTContract } from '@/lib/thirdweb-client';
import { getMarketplaceContractAddress } from '@/lib/env-validator';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useMarketplaceListings } from '@/hooks/useMarketplaceListings';
import { formatEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';

interface ContractDebugInfo {
  totalListings: number;
  activeListings: number;
  completedListings: number;
  cancelledListings: number;
  contractAddress: string;
  isConfigured: boolean;
}

interface ListingDebugInfo {
  listingId: string;
  tokenId: string;
  price: string;
  status: number;
  statusText: string;
  seller: string;
  timeRemaining: string;
  transactionHash?: string;
}

export function NFTDebugPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const activeChain = getActiveChain();
  const isValidChain = chainId === activeChain.id;
  const marketplaceContractAddress = getMarketplaceContractAddress();
  
  // Estados
  const [contractInfo, setContractInfo] = useState<ContractDebugInfo | null>(null);
  const [recentListings, setRecentListings] = useState<ListingDebugInfo[]>([]);
  const [isLoadingContract, setIsLoadingContract] = useState(false);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Hooks
  const { isConfigured } = useMarketplace();
  const { 
    totalCount, 
    listings, 
    isLoading: isLoadingHook, 
    error: hookError,
    refresh: refreshHook 
  } = useMarketplaceListings({ autoFetch: false });

  // Status helpers
  const getStatusInfo = (status: number) => {
    switch (status) {
      case 0: return { text: 'UNSET', color: 'bg-gray-500', icon: AlertTriangle };
      case 1: return { text: 'ACTIVE', color: 'bg-green-500', icon: CheckCircle };
      case 2: return { text: 'SOLD', color: 'bg-blue-500', icon: CheckCircle };
      case 3: return { text: 'CANCELLED', color: 'bg-red-500', icon: XCircle };
      default: return { text: 'UNKNOWN', color: 'bg-gray-500', icon: AlertTriangle };
    }
  };

  const formatTimeRemaining = (endTimestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTimestamp - now;
    
    if (remaining <= 0) return 'Expirado';
    
    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  // Buscar informações do contrato
  const fetchContractInfo = useCallback(async () => {
    if (!isValidChain || !isConfigured || !marketplaceContractAddress) {
      console.warn('Debug: Condições não atendidas para buscar info do contrato');
      return;
    }

    try {
      setIsLoadingContract(true);
      setError(null);

      console.log('🔍 Debug: Buscando informações do contrato marketplace...');
      const marketplaceContract = getMarketplaceContract();

      // Buscar total de listings
      const total = await totalListings({
        contract: marketplaceContract
      });

      const totalListings = Number(total);
      console.log(`📊 Debug: Total de listings no contrato: ${totalListings}`);

      // Buscar alguns listings recentes para análise
      let activeListings = 0;
      let completedListings = 0;
      let cancelledListings = 0;
      const debugListings: ListingDebugInfo[] = [];

      if (totalListings > 0) {
        // Buscar até 10 listings mais recentes
        const count = Math.min(10, totalListings);
        const startIndex = Math.max(0, totalListings - count);
        
        console.log(`📄 Debug: Buscando listings ${startIndex} - ${startIndex + count - 1}`);
        
        const rawListings = await getAllListings({
          contract: marketplaceContract,
          start: startIndex,
          count: count
        });

        for (const listing of rawListings) {
          const endTimestamp = Number(listing.endTimestamp);
          const status = Number(listing.status);
          const statusInfo = getStatusInfo(status);
          
          // Contar por status
          switch (status) {
            case 1: activeListings++; break;
            case 2: completedListings++; break;
            case 3: cancelledListings++; break;
          }

          debugListings.push({
            listingId: listing.listingId.toString(),
            tokenId: listing.tokenId.toString(),
            price: formatEther(listing.pricePerToken),
            status,
            statusText: statusInfo.text,
            seller: listing.listingCreator,
            timeRemaining: status === 1 ? formatTimeRemaining(endTimestamp) : 'N/A'
          });
        }
      }

      const info: ContractDebugInfo = {
        totalListings,
        activeListings,
        completedListings,
        cancelledListings,
        contractAddress: marketplaceContractAddress,
        isConfigured: true
      };

      setContractInfo(info);
      setRecentListings(debugListings);
      setLastUpdate(new Date());

      console.log('✅ Debug: Informações do contrato carregadas:', {
        total: totalListings,
        active: activeListings,
        completed: completedListings,
        cancelled: cancelledListings,
        recentCount: debugListings.length
      });

    } catch (err) {
      console.error('❌ Debug: Erro ao buscar informações do contrato:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoadingContract(false);
    }
  }, [isValidChain, isConfigured, marketplaceContractAddress]);

  // Buscar listings via hook para comparação
  const fetchListingsViaHook = useCallback(async () => {
    setIsLoadingListings(true);
    await refreshHook();
    setIsLoadingListings(false);
  }, [refreshHook]);

  // Auto-refresh ao montar
  useEffect(() => {
    if (isValidChain && isConfigured) {
      fetchContractInfo();
    }
  }, [isValidChain, isConfigured, fetchContractInfo]);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔧 Debug Panel - Marketplace</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Conecte sua carteira para usar o debug panel</p>
        </CardContent>
      </Card>
    );
  }

  if (!isValidChain) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-amber-600">⚠️ Debug Panel - Chain Inválida</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-600">
            Chain atual: {chainId} | Chain esperada: {activeChain.id} ({activeChain.name})
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-red-600">❌ Debug Panel - Marketplace Não Configurado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">
            Variável de ambiente NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS não está configurada
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header do Debug */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">🔧 Debug Panel - Marketplace NFT</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={fetchContractInfo}
                disabled={isLoadingContract}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingContract ? 'animate-spin' : ''}`} />
                Contrato
              </Button>
              <Button
                onClick={fetchListingsViaHook}
                disabled={isLoadingListings}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingListings ? 'animate-spin' : ''}`} />
                Hook
              </Button>
            </div>
          </div>
          {lastUpdate && (
            <p className="text-sm text-gray-500">
              Última atualização: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {/* Status da configuração */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Carteira Conectada</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Chain Válida</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Marketplace Configurado</span>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-500" />
              <a 
                href={`${activeChain.blockExplorers?.default.url}/address/${marketplaceContractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Ver Contrato
              </a>
            </div>
          </div>

          {/* Endereços importantes */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="text-sm">
              <strong>Marketplace:</strong> <code className="text-xs bg-gray-200 px-1 rounded">{marketplaceContractAddress}</code>
            </div>
            <div className="text-sm">
              <strong>Chain:</strong> {activeChain.name} (ID: {activeChain.id})
            </div>
            <div className="text-sm">
              <strong>Account:</strong> <code className="text-xs bg-gray-200 px-1 rounded">{address}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações do Contrato */}
      {contractInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 Dados do Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{contractInfo.totalListings}</div>
                <div className="text-sm text-gray-600">Total Listings</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{contractInfo.activeListings}</div>
                <div className="text-sm text-gray-600">Ativos</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{contractInfo.completedListings}</div>
                <div className="text-sm text-gray-600">Vendidos</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{contractInfo.cancelledListings}</div>
                <div className="text-sm text-gray-600">Cancelados</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparação Hook vs Contrato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dados do Hook */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">⚛️ useMarketplaceListings Hook</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={isLoadingHook ? "secondary" : hookError ? "destructive" : "default"}>
                  {isLoadingHook ? 'Carregando...' : hookError ? 'Erro' : 'OK'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Total Count:</span>
                <Badge variant="outline">{totalCount}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Listings Carregados:</span>
                <Badge variant="outline">{listings.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Ativos:</span>
                <Badge variant="outline">{listings.filter(l => l.isActive).length}</Badge>
              </div>
              {hookError && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">
                    {hookError.message}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dados Diretos do Contrato */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🔗 Contrato Direto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={isLoadingContract ? "secondary" : error ? "destructive" : "default"}>
                  {isLoadingContract ? 'Carregando...' : error ? 'Erro' : 'OK'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Total Listings:</span>
                <Badge variant="outline">{contractInfo?.totalListings || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Últimos Listings:</span>
                <Badge variant="outline">{recentListings.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Ativos (últimos):</span>
                <Badge variant="outline">{recentListings.filter(l => l.status === 1).length}</Badge>
              </div>
              {error && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">
                    {error}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listings Recentes */}
      {recentListings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📋 Últimos Listings (Contrato)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">Token ID</th>
                    <th className="text-left p-2">Preço</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Tempo Restante</th>
                    <th className="text-left p-2">Vendedor</th>
                  </tr>
                </thead>
                <tbody>
                  {recentListings.map((listing) => {
                    const statusInfo = getStatusInfo(listing.status);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <tr key={listing.listingId} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono">#{listing.listingId}</td>
                        <td className="p-2 font-mono">#{listing.tokenId}</td>
                        <td className="p-2">{listing.price} CHZ</td>
                        <td className="p-2">
                          <Badge className={`${statusInfo.color} text-white text-xs`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {listing.statusText}
                          </Badge>
                        </td>
                        <td className="p-2">{listing.timeRemaining}</td>
                        <td className="p-2">
                          <code className="text-xs">{listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
