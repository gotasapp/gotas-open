import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useChzBalanceCheck } from '@/hooks/useChzBalanceCheck';
import { useWallets } from '@privy-io/react-auth';
import { useWalletStrategy } from '@/hooks/useAuthenticationMethod';
import { toast } from 'sonner';
import { TestTube } from 'lucide-react';

export function ChzTestButton() {
  const [isTestingChz, setIsTestingChz] = useState(false);
  const { checkChzBalance } = useChzBalanceCheck();
  const { wallets } = useWallets();
  const { shouldUseEmbedded, authMethod } = useWalletStrategy();

  const testChzBalance = async () => {
    if (wallets.length === 0) {
      toast.error('Nenhuma carteira conectada');
      return;
    }

    setIsTestingChz(true);
    const toastId = toast.loading('Testando verificação de CHZ...');

    try {
      // Usar estratégia baseada no método de autenticação
      let activeWallet;
      if (shouldUseEmbedded) {
        activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
      } else {
        activeWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
      }

      console.log(`[ChzTestButton] Testing CHZ balance for wallet: ${activeWallet.address} (${activeWallet.walletClientType})`);
      console.log(`[ChzTestButton] Auth method: ${authMethod}, Should use embedded: ${shouldUseEmbedded}`);

      const result = await checkChzBalance(1, activeWallet);
      
      console.log(`[ChzTestButton] Test result:`, result);

      if (result.hasMinimumChz) {
        toast.success(`✅ CHZ OK: ${result.currentBalance} CHZ`, { id: toastId });
      } else {
        toast.error(`❌ CHZ Insuficiente: ${result.currentBalance} CHZ`, { id: toastId });
      }

      // Mostrar detalhes no console
      console.table({
        'Wallet Address': activeWallet.address,
        'Wallet Type': activeWallet.walletClientType,
        'Auth Method': authMethod,
        'Should Use Embedded': shouldUseEmbedded,
        'CHZ Balance': result.currentBalance,
        'Has Minimum CHZ': result.hasMinimumChz,
        'Message': result.message || 'N/A'
      });

    } catch (error) {
      console.error('[ChzTestButton] Error testing CHZ balance:', error);
      toast.error('Erro no teste de CHZ', { id: toastId });
    } finally {
      setIsTestingChz(false);
    }
  };

  if (wallets.length === 0) {
    return null;
  }

  return (
    <Button
      onClick={testChzBalance}
      disabled={isTestingChz}
      variant="outline"
      size="sm"
      className="flex items-center gap-2 hidden"
    >
      <TestTube className="h-4 w-4" />
      {isTestingChz ? 'Testando CHZ...' : 'Testar CHZ Balance'}
    </Button>
  );
} 