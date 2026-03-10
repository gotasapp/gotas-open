/**
 * Componente BalanceToken
 *
 * - Exibe o saldo de um token ERC20 da carteira conectada na Chiliz Chain.
 * - Detecta automaticamente se deve usar embedded wallet (email/social login) ou external wallet (MetaMask, etc).
 * - Se for embedded wallet, busca via provider (getTokenBalance).
 * - Se for external wallet, busca via viem e o RPC do env.
 * - Exibe saldo, símbolo e endereço resumido.
 */

'use client';

import { useEffect, useState } from 'react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { Skeleton } from './skeleton';
import { createPublicClient, http } from 'viem';
import { chiliz } from '@/lib/chains';
import { getTokenBalance } from '@/utils/chiliz-token-utils';
import { useWalletStrategy } from '@/hooks/useAuthenticationMethod';

interface BalanceTokenProps {
  tokenAddress: `0x${string}`;
  symbol: string;
  className?: string;
}

export function BalanceToken({ tokenAddress, symbol, className }: BalanceTokenProps) {
  const { user, authenticated } = useUnifiedAuth();
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
          console.log(`[BalanceToken] Using embedded wallet for ${symbol} balance (auth method: ${authMethod})`);
          const tokenBalanceData = await getTokenBalance(activeWallet as any, tokenAddress);
          balanceResult = tokenBalanceData.balance;
        } else {
          // Usar external wallet via RPC direto
          console.log(`[BalanceToken] Using external wallet RPC for ${symbol} balance (auth method: ${authMethod})`);
          const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://rpc.chiliz.com';
          const publicClient = createPublicClient({
            chain: chiliz,
            transport: http(rpcUrl),
          });

          const balanceWei = await publicClient.readContract({
            address: tokenAddress,
            abi: [
              {
                constant: true,
                inputs: [{ name: '_owner', type: 'address' }],
                name: 'balanceOf',
                outputs: [{ name: 'balance', type: 'uint256' }],
                type: 'function',
              },
              {
                constant: true,
                inputs: [],
                name: 'decimals',
                outputs: [{ name: '', type: 'uint8' }],
                type: 'function',
              },
            ],
            functionName: 'balanceOf',
            args: [activeWallet.address as `0x${string}`],
          });

          const decimals = await publicClient.readContract({
            address: tokenAddress,
            abi: [
              {
                constant: true,
                inputs: [],
                name: 'decimals',
                outputs: [{ name: '', type: 'uint8' }],
                type: 'function',
              },
            ],
            functionName: 'decimals',
          });

          const divisor = 10 ** Number(decimals);
          balanceResult = (Number(balanceWei) / divisor).toString();
        }

        setBalance(balanceResult);
      } catch (error) {
        console.error(`[BalanceToken] Error fetching ${symbol} balance:`, error);
        setHasError(true);
        setBalance(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [authenticated, user?.wallet, activeWallet, shouldUseEmbedded, authMethod, tokenAddress, symbol]);

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
        <span className="text-sm text-gray-500">{symbol}</span>
        <span className="text-xs text-gray-400">({shortAddress})</span>
      </div>
    );
  }

  if (hasError || balance === null) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-sm text-red-500">Erro</span>
        <span className="text-sm text-gray-500">{symbol}</span>
        <span className="text-xs text-gray-400">({shortAddress})</span>
      </div>
    );
  }

  const formattedBalance = parseFloat(balance).toFixed(2);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm font-medium">{formattedBalance}</span>
      <span className="text-sm text-gray-500">{symbol}</span>
      <span className="text-xs text-gray-400">({shortAddress})</span>
    </div>
  );
} 