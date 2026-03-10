'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { isMobileDevice } from '@/utils/device-detection';
import { useSociosWarning } from '@/contexts/SociosWarningContext';
import { useSociosSession } from '@/components/providers/SociosSessionProvider';

interface MobileSociosConnectorProps {
  onConnect?: () => void;
  className?: string;
}

function MobileSociosConnectorInternal({ onConnect, className }: MobileSociosConnectorProps) {
  const [isMobile, setIsMobile] = useState(false);
  const { connect, address, isConnected } = useSociosSession();
  
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
        timeout: 20000,
        onUnsupportedWallet: (walletName: string) => {
             const isSocios = walletName.toLowerCase().includes('socios');
             if (!isSocios && setShowSociosWarning) {
                 setShowSociosWarning(true);
             }
        }
    });
  }, [setShowSociosWarning]);

  useEffect(() => {
    return () => {
      disableSociosGuard();
    };
  }, [disableSociosGuard]);

  useEffect(() => {
    if (isConnected && address && onConnect) {
      // Pequeno delay para garantir que tudo está pronto
      const timer = setTimeout(() => {
        onConnect();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, address, onConnect]);

  const handleMobileConnect = () => {
    if (!isMobile) return;

    enableSociosGuard();

    // NÃO mostrar o aviso vermelho imediatamente.
    // if (setShowSociosWarning) {
    //   setShowSociosWarning(true);
    // }

    alert('Atenção! Ao abrir, no campo de busca, digite: socios para se conectar com a carteira.');
    
    // Preencher automaticamente o campo de busca com "socios"
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="Search"], input[placeholder*="search"], input[data-testid*="search"], input[type="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.value = 'socios';
        searchInput.focus();
        
        // Disparar eventos para garantir que o valor seja reconhecido
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });
        searchInput.dispatchEvent(inputEvent);
        searchInput.dispatchEvent(changeEvent);
      }
    }, 3000);

    // Tenta abrir o app da Socios via deep link
    const sociosAppLink = 'socios://wallet/connect';
    
    const tryOpenSocios = () => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = sociosAppLink;
      document.body.appendChild(iframe);
      
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1500);
    };

    tryOpenSocios();

    setTimeout(() => {
      connect();
    }, 2000);
  };

  if (!isMobile) {
    return null;
  }

  return (
    <Button
      onClick={handleMobileConnect}
      className={`w-full flex items-center h-14 px-6 rounded-xl bg-gradient-to-r from-[#3a2db7] to-[#2e1a6f] text-white font-semibold text-lg shadow-none border-0 hover:opacity-90 transition-all gap-4 justify-start ${className}`}
      style={{ minHeight: 56 }}
    >
      <img src="/socios_logo.jpeg" alt="Socios Logo" className="h-8 w-8 rounded-md mr-3" />
      <span className="text-left">Abrir Socios Wallet</span>
    </Button>
  );
}

export function MobileSociosConnector(props: MobileSociosConnectorProps) {
  return <MobileSociosConnectorInternal {...props} />;
}
