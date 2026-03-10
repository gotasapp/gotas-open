'use client';

import { useEffect, useState } from 'react';
import { isMobileDevice } from '@/utils/device-detection';

interface WalletConnectInterceptorState {
  isWalletNotSupportedModalOpen: boolean;
  selectedWalletName: string;
  isMobile: boolean;
}

interface WalletConnectInterceptorActions {
  closeWalletNotSupportedModal: () => void;
  handleWalletSelection: (walletName: string) => boolean;
  redirectToSocios: () => void;
}

export function useWalletConnectInterceptor(): WalletConnectInterceptorState & WalletConnectInterceptorActions {
  const [isWalletNotSupportedModalOpen, setIsWalletNotSupportedModalOpen] = useState(false);
  const [selectedWalletName, setSelectedWalletName] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    const handleWalletNotSupported = (event: CustomEvent) => {
      const { walletName } = event.detail;
      setSelectedWalletName(walletName);
      setIsWalletNotSupportedModalOpen(true);
    };

    window.addEventListener('walletNotSupported', handleWalletNotSupported as EventListener);

    return () => {
      window.removeEventListener('walletNotSupported', handleWalletNotSupported as EventListener);
    };
  }, [isMobile]);

  const closeWalletNotSupportedModal = () => {
    setIsWalletNotSupportedModalOpen(false);
    setSelectedWalletName('');
  };

  const handleWalletSelection = (walletName: string): boolean => {
    if (!isMobile) return true;
    
    const isSociosWallet = walletName.toLowerCase().includes('socios') || 
                          walletName.toLowerCase().includes('socios.com');
    
    if (!isSociosWallet) {
      setSelectedWalletName(walletName);
      setIsWalletNotSupportedModalOpen(true);
      return false;
    }
    
    return true;
  };

  const redirectToSocios = () => {
    closeWalletNotSupportedModal();
  };

  return {
    isWalletNotSupportedModalOpen,
    selectedWalletName,
    isMobile,
    closeWalletNotSupportedModal,
    handleWalletSelection,
    redirectToSocios
  };
} 