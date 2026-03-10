'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { isMobileDevice } from '@/utils/device-detection';
import { WalletNotSupportedModal } from '@/components/modals/WalletNotSupportedModal';
import { useSociosWarning } from '@/contexts/SociosWarningContext';
import { useSociosSession } from '@/components/providers/SociosSessionProvider';

interface SociosConnectButtonInternalProps {
  onConnect?: () => void;
}

function SociosConnectButtonInternal({ onConnect }: SociosConnectButtonInternalProps = {}) {
  const { 
    address, 
    isConnected, 
    connect, 
    disconnect, 
    isConnecting 
  } = useSociosSession();
  
  const [showWalletNotSupportedModal, setShowWalletNotSupportedModal] = useState(false);
  const [selectedWalletName, setSelectedWalletName] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  
  // Usar o contexto se disponível
  let setShowSociosWarning: ((show: boolean) => void) | null = null;
  try {
    const sociosWarningContext = useSociosWarning();
    setShowSociosWarning = sociosWarningContext.setShowSociosWarning;
  } catch {
    // Contexto não disponível, continua sem o aviso
  }

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  const disableSociosGuard = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.__sociosWalletInterceptor?.disable();
  }, []);

  const enableSociosGuard = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.__sociosWalletInterceptor?.enable({
      onUnsupportedWallet: (walletName: string) => {
        // Apenas mostra erro se não for carteira Socios
        const isSocios = walletName.toLowerCase().includes('socios');
        if (!isSocios) {
            setSelectedWalletName(walletName);
            setShowWalletNotSupportedModal(true);
            // Mostra aviso global também se necessário
            if (setShowSociosWarning) setShowSociosWarning(true);
        }
      },
      timeout: 60000, // Aumentado para 60s para dar tempo de scan
    });
  }, [setShowSociosWarning]);

  useEffect(() => {
    return () => {
      disableSociosGuard();
    };
  }, [disableSociosGuard]);

  // Monitorar conexão bem sucedida
  useEffect(() => {
    if (isConnected && address && onConnect) {
      // Pequeno delay para garantir que tudo está pronto
      const timer = setTimeout(() => {
        onConnect();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, address, onConnect]);

  if (isConnected && address) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm">Conectado com Socios Wallet:</p>
        <p className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">{`${address.substring(0, 6)}...${address.substring(address.length - 4)}`}</p>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>
          Desconectar Socios Wallet
        </Button>
      </div>
    );
  }

  const handleConnect = () => {
    // Habilitar guard antes de conectar
    enableSociosGuard();

    // NÃO mostrar o aviso vermelho imediatamente. 
    // Deixar que o interceptor mostre apenas se detectar erro.
    // if (setShowSociosWarning) {
    //   setShowSociosWarning(true);
    // }
    
    if (isMobile) {
      alert('Busque por socios para fazer login');
    }
    
    try {
        connect();
    } catch (error) {
      console.error('[SociosDebug] Erro ao conectar:', error);
    }
  };

  const handleBackToSocios = () => {
    setShowWalletNotSupportedModal(false);
    enableSociosGuard();
    connect(); // Tentar novamente
  };

  return (
    <>
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="w-full flex items-center h-14 px-6 rounded-xl bg-gradient-to-r from-[#3a2db7] to-[#2e1a6f] text-white font-semibold text-lg shadow-none border-0 hover:opacity-90 transition-all gap-4 justify-start"
        style={{ minHeight: 56 }}
      >
        <img src="/socios_logo.jpeg" alt="Socios Logo" className="h-8 w-8 rounded-md mr-3" />
        <span className="text-left">socios.com</span>
      </Button>

      <WalletNotSupportedModal
        isOpen={showWalletNotSupportedModal}
        onClose={() => setShowWalletNotSupportedModal(false)}
        onBackToSocios={handleBackToSocios}
        selectedWalletName={selectedWalletName}
      />
    </>
  );
}

export function SociosConnectButton() {
  return <SociosConnectButtonInternal />;
}

export function SociosConnectButtonSimple({ onConnect }: { onConnect?: () => void } = {}) {
  return <SociosConnectButtonInternal onConnect={onConnect} />;
} 
