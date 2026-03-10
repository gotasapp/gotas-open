'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Smartphone, RefreshCw, Clock } from 'lucide-react';
import { StakingToken } from '@/lib/tokens';

interface SociosUnstakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    tokenSymbol: string;
    tokenName?: string;
    requiredToken?: StakingToken | null;
  } | null;
}

export function SociosUnstakeModal({ isOpen, onClose, data }: SociosUnstakeModalProps) {
  if (!isOpen || !data) {
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
            Unstake no App Socios
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              Faça unstake no app Socios
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Para fazer unstake dos seus tokens{' '}
              <span className="font-semibold">{data.tokenSymbol}</span>, você precisa 
              usar o app oficial Socios.com.
            </p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                1
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-orange-900">
                  Abra o app Socios
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Acesse a seção de staking e faça unstake de {data.tokenSymbol}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                2
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-blue-900">
                  Aguarde o período de cooldown
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Após o unstake, seus tokens ficarão em cooldown por 7 dias
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                3
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-green-900">
                  Volte e atualize esta página
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Após confirmar o unstake, você pode atualizar para ver as mudanças
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-amber-700">
                <span className="font-semibold">Lembre-se:</span> O período de cooldown é de 7 dias antes que os tokens fiquem disponíveis para saque.
              </p>
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