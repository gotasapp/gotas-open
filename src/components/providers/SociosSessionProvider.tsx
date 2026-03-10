'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { WagmiProvider, useAccount, useConnect, useDisconnect } from 'wagmi';
import { getWagmiSociosConfig } from '@/lib/wagmiSociosConfig';

interface SociosSessionContextType {
  isConnected: boolean;
  address: string | undefined;
  connect: () => void;
  disconnect: () => void;
  isConnecting: boolean;
  error: Error | null;
  // Expor connector e getProvider para obter provider EIP-1193
  connector: ReturnType<typeof useAccount>['connector'];
  getProvider: () => Promise<any>;
}

const SociosSessionContext = createContext<SociosSessionContextType | null>(null);

function SociosSessionManager({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting, connector } = useAccount();
  const { connect, connectors, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sincronizar com localStorage para persistência e uso em outras partes (ex: useUnifiedAuth)
  useEffect(() => {
    if (isConnected && address) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('socios_wallet_address', address);
        console.log('[SociosSession] Endereço salvo:', address);
      }
    } else if (!isConnected && mounted && typeof window !== 'undefined') {
      // Só remove se estiver montado e explicitamente desconectado
      // Evita remover durante hidratação inicial se o wagmi ainda estiver carregando
      if (!isConnecting) {
        localStorage.removeItem('socios_wallet_address');
      }
    }
  }, [isConnected, address, mounted, isConnecting]);

  const handleConnect = useCallback(() => {
    const walletConnector = connectors[0];
    if (walletConnector) {
      connect({ connector: walletConnector });
    } else {
      console.error('[SociosSession] Nenhum conector encontrado');
    }
  }, [connect, connectors]);

  // Método para obter provider EIP-1193 do connector Socios
  const getProvider = useCallback(async () => {
    if (connector && typeof connector.getProvider === 'function') {
      try {
        const provider = await connector.getProvider();
        console.log('[SociosSession] Provider obtido com sucesso');
        return provider;
      } catch (e) {
        console.error('[SociosSession] Erro ao obter provider:', e);
        return null;
      }
    }
    console.warn('[SociosSession] Connector não disponível ou sem getProvider');
    return null;
  }, [connector]);

  const value = useMemo(() => ({
    isConnected,
    address,
    connect: handleConnect,
    disconnect: () => disconnect(),
    isConnecting,
    error,
    connector,
    getProvider
  }), [isConnected, address, handleConnect, isConnecting, error, disconnect, connector, getProvider]);

  return (
    <SociosSessionContext.Provider value={value}>
      {children}
    </SociosSessionContext.Provider>
  );
}

export function SociosSessionProvider({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => {
    try {
      return getWagmiSociosConfig();
    } catch (error) {
      console.error('[SociosSession] Erro na config:', error);
      return null;
    }
  }, []);

  if (!config) return <>{children}</>;

  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <SociosSessionManager>
        {children}
      </SociosSessionManager>
    </WagmiProvider>
  );
}

export function useSociosSession() {
  const context = useContext(SociosSessionContext);
  if (!context) {
    throw new Error('useSociosSession deve ser usado dentro de SociosSessionProvider');
  }
  return context;
}

