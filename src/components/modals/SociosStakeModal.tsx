'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Smartphone, RefreshCw } from 'lucide-react';
import { StakingToken } from '@/lib/tokens';

interface SociosStakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    nftTitle: string;
    requiredToken: StakingToken | null;
    requiredAmount: number;
    tokenSymbol: string;
  } | null;
}

export function SociosStakeModal({ isOpen, onClose, data }: SociosStakeModalProps) {
  if (!isOpen || !data || !data.requiredToken) {
    return null;
  }


  const handleRefreshPage = () => {
    window.location.reload();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-center">
          Stake no App Socios
        </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              Faça stake no app Socios
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Para participar desta campanha, você precisa fazer stake de{' '}
              <span className="font-semibold">{data.requiredAmount} {data.tokenSymbol}</span>{' '}
              diretamente no app Socios.com.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                1
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-blue-900">
                  Abra o app Socios
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Faça stake de {data.tokenSymbol} no app oficial
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                2
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-green-900">
                  Volte e atualize esta página
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Após confirmar o stake, você pode participar das campanhas
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleRefreshPage}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Página
            </Button>

            <Button 
              variant="ghost" 
              onClick={handleClose} 
              className="w-full text-gray-500"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 