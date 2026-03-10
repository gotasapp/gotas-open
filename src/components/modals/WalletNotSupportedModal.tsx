'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

interface WalletNotSupportedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToSocios: () => void;
  selectedWalletName?: string;
}

export function WalletNotSupportedModal({
  isOpen,
  onClose,
  onBackToSocios,
  selectedWalletName = 'carteira selecionada'
}: WalletNotSupportedModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <DialogTitle className="text-xl">Carteira não suportada</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Para usar este aplicativo, você precisa conectar especificamente com a{' '}
            <span className="font-semibold text-[#3a2db7]">Socios.com Wallet</span>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-medium">Carteira detectada:</span> {selectedWalletName}
            </p>
            <p className="text-sm text-gray-600">
              Esta carteira não é compatível com nossa plataforma.
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-1">
              Como proceder:
            </p>
            <p className="text-sm text-blue-700">
              Procure por "socios.com" na lista de carteiras disponíveis e selecione a Socios Wallet oficial.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            onClick={onBackToSocios}
            className="flex-1 bg-[#3a2db7] hover:bg-[#2e1a6f] text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Socios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 