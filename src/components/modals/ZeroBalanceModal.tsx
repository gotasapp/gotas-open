'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useWalletStrategy } from '@/hooks/useAuthenticationMethod';
import { SociosStakeModal } from './SociosStakeModal';

interface ZeroBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenSymbol: string;
  tokenName?: string;
}

export function ZeroBalanceModal({ isOpen, onClose, tokenSymbol, tokenName }: ZeroBalanceModalProps) {
  const { user, authProvider } = useUnifiedAuth();
  const { activeWallet, shouldUseEmbedded, authMethod } = useWalletStrategy();
  const [showTransferWarning, setShowTransferWarning] = useState(false);
  const [showSociosModal, setShowSociosModal] = useState(false);

  // Se for usuário Socios, mostrar modal específico
  if (isOpen && authProvider === 'socios') {
    return (
      <SociosStakeModal
        isOpen={true}
        onClose={onClose}
        data={{
          nftTitle: `${tokenSymbol} Token`,
          requiredToken: {
            id: tokenSymbol.toLowerCase(),
            symbol: tokenSymbol,
            name: tokenName || `${tokenSymbol} Token`,
            description: `${tokenSymbol} Fan Token`,
            address: '0x0000000000000000000000000000000000000000',
            icon_url: '',
            decimals: 18
          },
          requiredAmount: 1,
          tokenSymbol: tokenSymbol
        }}
      />
    );
  }

  if (!isOpen) {
    return null;
  }

  const walletAddress = activeWallet?.address || '';
  const shortAddress = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '';

  const copyWalletAddress = async () => {
    if (!walletAddress) return;
    
    try {
      await navigator.clipboard.writeText(walletAddress);
      toast.success('Address copied!');
      setShowTransferWarning(true);
    } catch (error) {
      toast.error('Error copying address');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {tokenSymbol} Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              You need <span className="font-semibold">{tokenSymbol}</span> tokens to stake{tokenName ? ` ${tokenName}` : ''}.
            </p>
            
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-gray-500 mb-2">Your wallet:</p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">{shortAddress}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyWalletAddress}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {showTransferWarning && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  Transfer {tokenSymbol} to ChilizChain at this address.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button variant="outline" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 