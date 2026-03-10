'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useMyNFTs } from '@/hooks/useUserNFTs';
import { getActiveChain } from '@/lib/thirdweb-client';
import { getMarketplaceContractAddress } from '@/lib/env-validator';
import { testAllGateways } from '@/utils/ipfs-gateway-tester';

interface DebugInfo {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export function MarketplaceDebugPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { nfts, isLoading: nftsLoading, error: nftsError } = useMyNFTs();
  const marketplace = useMarketplace();
  
  const [isVisible, setIsVisible] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugInfo[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<string>('');
  const [testPrice, setTestPrice] = useState('0.1');
  const [ipfsGatewayStatus, setIpfsGatewayStatus] = useState<{
    working: number;
    total: number;
    fastest?: string;
    testing: boolean;
  }>({ working: 0, total: 0, testing: false });

  const activeChain = getActiveChain();
  const marketplaceAddress = getMarketplaceContractAddress();

  // Função para adicionar log de forma otimizada
  const addDebugLog = useCallback((level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    // Usar requestIdleCallback para não bloquear o thread principal
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        setDebugLogs(prev => [...prev.slice(-9), {
          timestamp: new Date().toLocaleTimeString(),
          level,
          message,
          data
        }]);
      });
    } else {
      // Fallback para navegadores sem requestIdleCallback
      setTimeout(() => {
        setDebugLogs(prev => [...prev.slice(-9), {
          timestamp: new Date().toLocaleTimeString(),
          level,
          message,
          data
        }]);
      }, 0);
    }
  }, []);

  // Interceptar console logs para debug de forma otimizada
  useEffect(() => {
    if (!isVisible) return; // Só interceptar quando o debug panel estiver visível
    
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog(...args);
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('🏪') || args[0].includes('🔐') || args[0].includes('📋'))) {
        addDebugLog('info', args[0], args[1]);
      }
    };

    console.warn = (...args) => {
      originalWarn(...args);
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('⚠️') || args[0].includes('🖼️'))) {
        addDebugLog('warn', args[0], args[1]);
      }
    };

    console.error = (...args) => {
      originalError(...args);
      if (args[0] && typeof args[0] === 'string' && args[0].includes('❌')) {
        addDebugLog('error', args[0], args[1]);
      }
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, [isVisible, addDebugLog]);

  const testMarketplaceListing = async () => {
    if (!selectedNFT) {
      alert('Selecione um NFT primeiro');
      return;
    }

    console.log('🧪 Iniciando teste de listagem no marketplace:', {
      tokenId: selectedNFT,
      price: testPrice,
      timestamp: new Date().toISOString()
    });

    const result = await marketplace.createListing({
      tokenId: selectedNFT,
      priceInCHZ: testPrice,
      durationInDays: 7
    });

    console.log('🧪 Resultado do teste:', result);
  };

  const testNFTApproval = async () => {
    if (!selectedNFT) {
      alert('Selecione um NFT primeiro');
      return;
    }

    console.log('🧪 Testando aprovação do NFT:', selectedNFT);
    const isApproved = await marketplace.checkNFTApproval(selectedNFT);
    console.log('🧪 Status de aprovação:', { tokenId: selectedNFT, isApproved });
    
    if (!isApproved) {
      console.log('🧪 Iniciando processo de aprovação...');
      const approved = await marketplace.approveNFT(selectedNFT);
      console.log('🧪 Resultado da aprovação:', approved);
    }
  };

  const testIPFSGateways = useCallback(async () => {
    setIpfsGatewayStatus(prev => ({ ...prev, testing: true }));
    console.log('🧪 Testando conectividade dos gateways IPFS...');
    
    // Executar em background para não bloquear UI
    setTimeout(async () => {
      try {
        const { working, failing } = await testAllGateways();
        
        setIpfsGatewayStatus({
          working: working.length,
          total: working.length + failing.length,
          fastest: working.length > 0 ? working[0].gateway : undefined,
          testing: false
        });
        
        console.log(`🧪 Teste IPFS concluído: ${working.length}/${working.length + failing.length} funcionando`);
      } catch (error) {
        console.error('🧪 Erro no teste IPFS:', error);
        setIpfsGatewayStatus(prev => ({ ...prev, testing: false }));
      }
    }, 100);
  }, []);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors"
        >
          🔧 Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border border-gray-300 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
      <div className="bg-purple-600 text-white px-4 py-2 flex justify-between items-center">
        <h3 className="font-bold">Marketplace Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
      
      <div className="p-4 space-y-4 overflow-y-auto max-h-80">
        {/* Status Geral */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-700">Status Geral</h4>
          <div className="text-xs space-y-1">
            <div>🔗 Conectado: {isConnected ? '✅' : '❌'}</div>
            <div>🏠 Endereço: {address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'N/A'}</div>
            <div>⛓️ Chain ID: {chainId} {chainId === activeChain.id ? '✅' : '❌'}</div>
            <div>🏪 Marketplace: {marketplaceAddress ? '✅' : '❌'}</div>
            <div>🔧 isConfigured: {marketplace.isConfigured ? '✅' : '❌'}</div>
            <div>🖼️ NFTs: {nfts.length} {nftsLoading ? '⏳' : '✅'}</div>
          </div>
        </div>

        {/* Contratos */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-700">Contratos</h4>
          <div className="text-xs space-y-1">
            <div>NFT: <code className="bg-gray-100 px-1 rounded">0x1e6F...C8Fd</code></div>
            <div>Marketplace: <code className="bg-gray-100 px-1 rounded">
              {marketplaceAddress ? `${marketplaceAddress.slice(0,6)}...${marketplaceAddress.slice(-4)}` : 'N/A'}
            </code></div>
          </div>
        </div>

        {/* IPFS Gateways */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-700">IPFS Gateways</h4>
          <div className="text-xs space-y-1">
            <div>Status: {ipfsGatewayStatus.working}/{ipfsGatewayStatus.total} funcionando</div>
            {ipfsGatewayStatus.fastest && (
              <div>Mais rápido: <code className="bg-gray-100 px-1 rounded text-xs">
                {ipfsGatewayStatus.fastest.replace('https://', '').replace('/ipfs/', '')}
              </code></div>
            )}
            <button
              onClick={testIPFSGateways}
              disabled={ipfsGatewayStatus.testing}
              className="w-full bg-orange-500 text-white text-xs py-1 px-2 rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {ipfsGatewayStatus.testing ? 'Testando...' : 'Testar Gateways'}
            </button>
          </div>
        </div>

        {/* Testes */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-700">Testes</h4>
          
          <select
            value={selectedNFT}
            onChange={(e) => setSelectedNFT(e.target.value)}
            className="w-full text-xs p-1 border rounded"
          >
            <option value="">Selecione um NFT</option>
            {nfts.map(nft => (
              <option key={nft.tokenId} value={nft.tokenId}>
                {nft.name || `NFT #${nft.tokenId}`}
              </option>
            ))}
          </select>

          <input
            type="number"
            step="0.001"
            value={testPrice}
            onChange={(e) => setTestPrice(e.target.value)}
            placeholder="Preço em CHZ"
            className="w-full text-xs p-1 border rounded"
          />

          <div className="flex space-x-1">
            <button
              onClick={testNFTApproval}
              disabled={!selectedNFT || marketplace.isLoading}
              className="flex-1 bg-blue-500 text-white text-xs py-1 px-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Test Approval
            </button>
            <button
              onClick={testMarketplaceListing}
              disabled={!selectedNFT || marketplace.isLoading}
              className="flex-1 bg-green-500 text-white text-xs py-1 px-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              Test Listing
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-700">Logs Recentes</h4>
          <div className="bg-gray-50 p-2 rounded text-xs max-h-32 overflow-y-auto">
            {debugLogs.length === 0 ? (
              <div className="text-gray-400">Nenhum log ainda...</div>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} className={`mb-1 ${
                  log.level === 'error' ? 'text-red-600' :
                  log.level === 'warn' ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  <span className="text-gray-400">{log.timestamp}</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Estado do Marketplace */}
        {marketplace.error && (
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <div className="text-xs text-red-800">
              <strong>Erro:</strong> {marketplace.error.message}
            </div>
          </div>
        )}

        {marketplace.transactionHash && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <div className="text-xs text-blue-800">
              <strong>TX:</strong> {marketplace.transactionHash.slice(0,10)}...
              {marketplace.isTransactionPending ? ' ⏳' : ' ✅'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook para usar o debug panel em desenvolvimento
export function useMarketplaceDebug() {
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // Mostrar apenas em desenvolvimento
    const isDev = process.env.NODE_ENV === 'development';
    setShowDebug(isDev);

    // Atalho de teclado para toggle (Ctrl+Shift+D)
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDebug(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return { showDebug, setShowDebug };
}