import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Wallet, Shield } from 'lucide-react';
import { useWallets } from '@privy-io/react-auth';
import { useWalletStrategy } from '@/hooks/useAuthenticationMethod';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';

interface WalletInfoCardProps {
  className?: string;
}

export function WalletInfoCard({ className }: WalletInfoCardProps) {
  const { wallets } = useWallets();
  const { shouldUseEmbedded, authMethod } = useWalletStrategy();
  const { authenticated, authProvider } = useUnifiedAuth();

  if (!authenticated || wallets.length === 0) {
    return null;
  }

  // Usar estratégia baseada no método de autenticação
  let activeWallet;
  if (shouldUseEmbedded) {
    activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
  } else {
    activeWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
  }

  if (!activeWallet) {
    return null;
  }

  const isEmbedded = activeWallet.walletClientType === 'privy';
  const shortAddress = `${activeWallet.address.slice(0, 6)}...${activeWallet.address.slice(-4)}`;

  return (
    <Card className={`${className} border-blue-200 bg-blue-50`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Info className="h-4 w-4" />
          Informações da Carteira
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-blue-600" />
              <span className="font-medium">Provedor:</span>
            </div>
            <div className="text-blue-700 bg-blue-100 px-2 py-1 rounded">
              {authProvider || 'N/A'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Wallet className="h-3 w-3 text-blue-600" />
              <span className="font-medium">Tipo:</span>
            </div>
            <div className="text-blue-700 bg-blue-100 px-2 py-1 rounded">
              {isEmbedded ? 'Embedded' : 'External'}
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-medium">Método Auth:</span>
            <div className="text-blue-700 bg-blue-100 px-2 py-1 rounded">
              {authMethod}
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-medium">Cliente:</span>
            <div className="text-blue-700 bg-blue-100 px-2 py-1 rounded">
              {activeWallet.walletClientType}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <span className="font-medium text-xs">Endereço Ativo:</span>
          <div className="text-blue-700 bg-blue-100 px-2 py-1 rounded font-mono text-xs">
            {shortAddress}
          </div>
        </div>

        <div className="space-y-1">
          <span className="font-medium text-xs">Estratégia:</span>
          <div className="text-blue-700 bg-blue-100 px-2 py-1 rounded text-xs">
            {shouldUseEmbedded ? 'Priorizar Embedded Wallet' : 'Priorizar External Wallet'}
          </div>
        </div>

        {wallets.length > 1 && (
          <div className="space-y-1">
            <span className="font-medium text-xs">Total de Carteiras:</span>
            <div className="text-blue-700 bg-blue-100 px-2 py-1 rounded text-xs">
              {wallets.length} conectadas
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 