'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { NFTDebugPanel } from '@/components/debug/NFTDebugPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEnhancedNFTDiscovery } from '@/hooks/useEnhancedNFTDiscovery';
import { AlertTriangle, CheckCircle, Clock, Search } from 'lucide-react';

export default function DebugEnhancedPage() {
  const { address, isConnected } = useAccount();
  const [testWallet, setTestWallet] = useState('');
  const [enableFragments, setEnableFragments] = useState(true);
  const [maxBlocks, setMaxBlocks] = useState(100000);

  const enhancedHook = useEnhancedNFTDiscovery(testWallet as any, {
    enableAutoDiscovery: true,
    enableFragmentTesting: enableFragments,
    maxBlocks,
    debug: true
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Conecte sua carteira</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Para acessar o debug avançado, conecte sua carteira primeiro.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Enhanced NFT Discovery - Debug
          </h1>
          <p className="text-gray-600">
            Sistema avançado de descoberta de NFTs para Chiliz Chain com suporte a fragmentos e múltiplos métodos.
          </p>
        </div>

        {/* Controles de Teste */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Controles de Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço da Wallet para Teste
                </label>
                <input
                  type="text"
                  value={testWallet}
                  onChange={(e) => setTestWallet(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0x0000000000000000000000000000000000000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de Blocos para Busca
                </label>
                <input
                  type="number"
                  value={maxBlocks}
                  onChange={(e) => setMaxBlocks(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="10000"
                  max="500000"
                  step="10000"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={enableFragments}
                  onChange={(e) => setEnableFragments(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Habilitar teste de fragmentos</span>
              </label>
              <Button
                onClick={enhancedHook.refreshNFTs}
                disabled={enhancedHook.isLoading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {enhancedHook.isLoading ? 'Testando...' : 'Executar Teste'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status do Teste */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-semibold">
                    {enhancedHook.isLoading ? 'Carregando' : 
                     enhancedHook.hasError ? 'Erro' : 'Concluído'}
                  </p>
                </div>
                {enhancedHook.isLoading ? (
                  <Clock className="w-8 h-8 text-yellow-500" />
                ) : enhancedHook.hasError ? (
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">NFTs Encontrados</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {enhancedHook.nfts.length}
                  </p>
                </div>
                <Search className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Contratos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {enhancedHook.contractsCount}
                  </p>
                </div>
                <div className="text-green-500">📋</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Blocos Pesquisados</p>
                  <p className="text-lg font-bold text-purple-600">
                    {enhancedHook.discoveryStats?.searchBlocks?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="text-purple-500">🔍</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resultados dos NFTs */}
        {enhancedHook.nfts.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">🎨 NFTs Encontrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enhancedHook.nfts.map((nft, index) => (
                  <div key={`${nft.contractAddress}-${nft.tokenId}`} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{nft.metadata.name}</h3>
                        <p className="text-sm text-gray-600">#{nft.tokenId}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {nft.discoveryMethod}
                      </Badge>
                    </div>
                    
                    {nft.metadata.image && (
                      <div className="mb-3">
                        <img
                          src={nft.metadata.image}
                          alt={nft.metadata.name}
                          className="w-full h-32 object-cover rounded border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>
                        <span className="font-medium">Contrato:</span> {nft.contractName}
                      </div>
                      <div className="font-mono break-all">
                        {nft.contractAddress}
                      </div>
                      {nft.metadata.description && (
                        <div>
                          <span className="font-medium">Descrição:</span> {nft.metadata.description.slice(0, 100)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Métodos de Descoberta Usados */}
        {enhancedHook.discoveryStats?.searchMethods && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">🔧 Métodos de Descoberta Utilizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {enhancedHook.discoveryStats.searchMethods.map(method => (
                  <Badge key={method} variant="outline" className="px-3 py-1">
                    {method.replace('_', ' ').toUpperCase()}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>known_contracts:</strong> Testa contratos previamente conhecidos</p>
                <p><strong>chiliz_specific:</strong> Testa contratos específicos da Chiliz Chain</p>
                <p><strong>event_discovery:</strong> Busca por eventos Transfer na blockchain</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Panel Completo */}
        <NFTDebugPanel 
          walletAddress={testWallet}
          showComparison={true}
          enableAutoDiscovery={true}
        />

        {/* Logs Detalhados */}
        {enhancedHook.debugLogs.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">📝 Logs Detalhados do Enhanced Discovery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-y-auto">
                {enhancedHook.debugLogs.map((log, index) => (
                  <div key={index} className="mb-1 leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}