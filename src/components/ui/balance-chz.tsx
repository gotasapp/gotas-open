/**
 * Componente BalanceCHZ
 *
 * - Busca o saldo de CHZ da carteira conectada na Chiliz Chain.
 * - Detecta automaticamente se deve usar embedded wallet (email/social login) ou external wallet (MetaMask, etc).
 * - Se for embedded wallet, busca o saldo via provider da carteira (getNativeBalance).
 * - Se for external wallet, busca o saldo via viem usando o RPC do env, sem depender do provider da carteira.
 * - Exibe o saldo e o endereço resumido ao lado.
 * - Usa shadcn ui para loading e estilos.
 */

'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Skeleton } from './skeleton';
import { createPublicClient, http } from 'viem';
import { chiliz } from '@/lib/chains';
import { getNativeBalance } from '@/utils/chiliz-token-utils';
import { useWalletStrategy } from '@/hooks/useAuthenticationMethod';

interface BalanceCHZProps {
  endpoint?: string;
  className?: string;
}

export function BalanceCHZ({ endpoint, className }: BalanceCHZProps) {
  const { user, authenticated } = usePrivy();
  const { activeWallet, shouldUseEmbedded, authMethod } = useWalletStrategy();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated || !user?.wallet || !activeWallet) {
      setBalance(null);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    const fetchBalance = async () => {
      try {
        let balanceResult: string;

        if (shouldUseEmbedded && activeWallet.walletClientType === 'privy') {
          // Usar embedded wallet (email/social login)
          console.log(`[BalanceCHZ] Using embedded wallet for CHZ balance (auth method: ${authMethod})`);
          balanceResult = await getNativeBalance(activeWallet as any);
        } else {
          // Usar external wallet via RPC direto
          console.log(`[BalanceCHZ] Using external wallet RPC for CHZ balance (auth method: ${authMethod})`);
          const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://rpc.chiliz.com';
          const publicClient = createPublicClient({
            chain: chiliz,
            transport: http(rpcUrl),
          });

          const balanceWei = await publicClient.getBalance({
            address: activeWallet.address as `0x${string}`,
          });

          const divisor = 10 ** 18; // CHZ tem 18 decimais
          balanceResult = (Number(balanceWei) / divisor).toString();
        }

        setBalance(balanceResult);
      } catch (error) {
        console.error('[BalanceCHZ] Error fetching CHZ balance:', error);
        setHasError(true);
        setBalance(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [authenticated, user?.wallet, activeWallet, shouldUseEmbedded, authMethod]);

  if (!authenticated || !user?.wallet) {
    return null;
  }

  const shortAddress = user.wallet.address 
    ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
    : '';

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Skeleton className="h-4 w-16" />
        <span className="text-sm text-gray-500">CHZ</span>
        <span className="text-xs text-gray-400">({shortAddress})</span>
      </div>
    );
  }

  if (hasError || balance === null) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-sm text-red-500">Erro</span>
        <span className="text-sm text-gray-500">CHZ</span>
        <span className="text-xs text-gray-400">({shortAddress})</span>
      </div>
    );
  }

  const formattedBalance = parseFloat(balance).toFixed(4);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm font-medium">{formattedBalance}</span>
      <span className="text-sm text-gray-500">CHZ</span>
      <span className="text-xs text-gray-400">({shortAddress})</span>
    </div>
  );
} 