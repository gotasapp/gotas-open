'use client';

import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SociosConnectButtonSimple } from '@/components/socios-connect-button';
import { MobileSociosConnector } from '@/components/MobileSociosConnector';
import { Wallet } from 'lucide-react';
import { useWalletConnectInterceptor } from '@/hooks/useWalletConnectInterceptor';
import { WalletNotSupportedModal } from '@/components/modals/WalletNotSupportedModal';
import { isMobileDevice } from '@/utils/device-detection';

interface ConnectionChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrivyLogin: () => Promise<void>; // Função para chamar o login padrão do Privy
}

export function ConnectionChoiceModal({
  isOpen,
  onClose,
  onPrivyLogin,
}: ConnectionChoiceModalProps) {
  const {
    isWalletNotSupportedModalOpen,
    selectedWalletName,
    isMobile,
    closeWalletNotSupportedModal,
    redirectToSocios
  } = useWalletConnectInterceptor();

  const [isClientMobile, setIsClientMobile] = React.useState(false);
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [acceptedDataSharing, setAcceptedDataSharing] = React.useState(false);

  React.useEffect(() => {
    setIsClientMobile(isMobileDevice());
  }, []);

  React.useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && window.__sociosWalletInterceptor) {
      window.__sociosWalletInterceptor.disable();
    }
    
    return () => {
      if (isOpen && typeof window !== 'undefined' && window.__sociosWalletInterceptor) {
        window.__sociosWalletInterceptor.disable();
      }
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const canProceed = acceptedTerms && acceptedDataSharing;

  const handlePrivyLogin = async () => {
    if (!canProceed) return;
    
    if (typeof window !== 'undefined' && window.__sociosWalletInterceptor) {
      window.__sociosWalletInterceptor.disable();
    }
    
    try {
      await onPrivyLogin();
      onClose();
    } catch (error) {
      console.error('[ConnectionChoiceModal] Erro no login Privy:', error);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Conectar Carteira</DialogTitle>
            <DialogDescription>
              Escolha como você gostaria de se conectar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
              <Checkbox 
                id="terms" 
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                className="mt-1"
              />
              <div className="space-y-1">
                <label 
                  htmlFor="terms" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Aceito os termos de privacidade
                </label>
                <p className="text-xs text-gray-600">
                  Ao continuar, você concorda com nossos{' '}
                  <a href="https://gotas.social/terms" target="_blank" className="text-blue-600 hover:underline">
                    termos de privacidade
                  </a>{' '}
                  e{' '}
                  <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                    condições de uso
                  </a>.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
              <Checkbox 
                id="dataSharing" 
                checked={acceptedDataSharing}
                onCheckedChange={(checked) => setAcceptedDataSharing(checked as boolean)}
                className="mt-1"
              />
              <div className="space-y-1">
                <label 
                  htmlFor="dataSharing" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Autorizo o compartilhamento de dados
                </label>
                <p className="text-xs text-gray-600">
                  Ao marcar esta caixa, autorizo o compartilhamento dos meus dados com a Socios.com e estou ciente de que esse compartilhamento pode incluir transferência internacional de dados.
                </p>
              </div>
            </div>

            <div className={`grid gap-4 transition-opacity duration-300 ${canProceed ? 'opacity-100' : 'opacity-20'}`}>
              {isClientMobile ? (
                <div className={canProceed ? '' : 'pointer-events-none'}>
                  <MobileSociosConnector onConnect={canProceed ? onClose : () => {}} />
                </div>
              ) : (
                <div className={canProceed ? '' : 'pointer-events-none'}>
                  <SociosConnectButtonSimple onConnect={onClose} />
                </div>
              )}

              <Button 
                variant="outline" 
                onClick={handlePrivyLogin} 
                disabled={!canProceed}
                className={`w-full flex items-center h-14 text-lg font-semibold justify-start gap-3 transition-opacity duration-300 ${
                  canProceed ? 'opacity-100' : 'opacity-20 cursor-not-allowed'
                }`}
              >
                <Wallet className="h-6 w-6 ml-1 mr-3 text-[#3a2db7]" />
                <span className="text-left">Conectar com e-mail</span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handlePrivyLogin} 
                disabled={!canProceed}
                className={`w-full flex items-center h-14 text-lg font-semibold justify-start gap-3 transition-opacity duration-300 ${
                  canProceed ? 'opacity-100' : 'opacity-20 cursor-not-allowed'
                }`}
              >
                <img src="/metamask.svg" alt="MetaMask" className="h-6 w-6 ml-1 mr-3" />
                <span className="text-left">MetaMask</span>
              </Button>

              <Button 
                variant="outline" 
                onClick={handlePrivyLogin} 
                disabled={!canProceed}
                className={`w-full flex items-center h-14 text-lg font-semibold justify-start gap-3 transition-opacity duration-300 ${
                  canProceed ? 'opacity-100' : 'opacity-20 cursor-not-allowed'
                }`}
              >
                <img src="/rabby.svg" alt="Rabby" className="h-6 w-6 ml-1 mr-3" />
                <span className="text-left">Rabby</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <WalletNotSupportedModal
        isOpen={isWalletNotSupportedModalOpen}
        onClose={closeWalletNotSupportedModal}
        onBackToSocios={redirectToSocios}
        selectedWalletName={selectedWalletName}
      />
    </>
  );
} 
