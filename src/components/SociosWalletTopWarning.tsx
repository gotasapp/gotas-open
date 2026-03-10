'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface SociosWalletTopWarningProps {
  isVisible: boolean;
  onClose: () => void;
}

export function SociosWalletTopWarning({ isVisible, onClose }: SociosWalletTopWarningProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 bg-red-600 text-white z-[999999] animate-in slide-in-from-top duration-300"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0, 
        right: 0,
        zIndex: 999999,
        isolation: 'isolate'
      }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 animate-pulse" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="font-bold text-lg">
                Socios Wallet
              </span>
              <span className="text-sm sm:text-base">
                Este método é exclusivo da Socios Wallet. Não clique em outras carteiras. Caso não conecte na primeira vez, tente conectar novamente no app da Socios.
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-red-700 rounded-lg transition-colors flex-shrink-0"
            aria-label="Fechar aviso"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}