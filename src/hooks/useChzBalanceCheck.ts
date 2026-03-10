'use client';

import { useState, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
import { createPublicClient, http } from 'viem';
import { chiliz } from '@/lib/chains';
import { useWalletStrategy } from '@/hooks/useAuthenticationMethod';

export interface ChzBalanceCheckResult {
  hasMinimumChz: boolean;
  currentBalance: string;
  message?: string;
}

export function useChzBalanceCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const { shouldUseEmbedded, authMethod } = useWalletStrategy();

  const checkChzBalance = useCallback(async (
    minAmount: number = 1, 
    specificWallet?: any
  ): Promise<ChzBalanceCheckResult> => {
    setIsChecking(true);
    
    try {
      if (wallets.length === 0) {
        return {
          hasMinimumChz: false,
          currentBalance: '0',
          message: 'Nenhuma carteira conectada'
        };
      }

      let activeWallet;
      
      // Se uma wallet específica foi fornecida, usar ela
      if (specificWallet) {
        activeWallet = specificWallet;
      } else {
        // Caso contrário, usar a estratégia automática
        if (shouldUseEmbedded) {
          activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
        } else {
          activeWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
        }
      }
      
      if (!activeWallet?.address) {
        return {
          hasMinimumChz: false,
          currentBalance: '0',
          message: 'Endereço da carteira não encontrado'
        };
      }

      // Só fazer setActiveWallet se não foi fornecida uma wallet específica
      if (!specificWallet) {
        await setActiveWallet(activeWallet);
        await new Promise(resolve => setTimeout(resolve, 250)); 
      }

      const isEmbeddedWallet = activeWallet.walletClientType === 'privy';
      let balanceValue: string;

      if (isEmbeddedWallet) {
        // Para embedded wallets, usar o provider da Privy (mesma lógica do ChzBalanceCard)
        try {
          const provider = await activeWallet.getEthereumProvider();
          const balanceHex = await provider.request({
            method: 'eth_getBalance',
            params: [activeWallet.address, 'latest'],
          });
          
          if (balanceHex) {
            const balanceBigInt = BigInt(balanceHex);
            balanceValue = (Number(balanceBigInt) / 1e18).toString();
          } else {
            balanceValue = '0';
          }
        } catch (privyError) {
          console.error("[useChzBalanceCheck] Error getting balance from Privy provider:", privyError);
          // Fallback para RPC se Privy falhar
          const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';
          if (!rpcUrl) {
            return {
              hasMinimumChz: false,
              currentBalance: '0',
              message: 'Configuração RPC não disponível e erro no provider Privy'
            };
          }

          const publicClient = createPublicClient({
            chain: chiliz,
            transport: http(rpcUrl)
          });

          const balanceWei = await publicClient.getBalance({ 
            address: activeWallet.address as `0x${string}` 
          });
          
          balanceValue = (Number(balanceWei) / 1e18).toString();
        }
      } else {
        // Para external wallets, usar PublicClient (mesma lógica do ChzBalanceCard)
        const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';
        if (!rpcUrl) {
          return {
            hasMinimumChz: false,
            currentBalance: '0',
            message: 'Configuração RPC não disponível'
          };
        }

        const publicClient = createPublicClient({
          chain: chiliz,
          transport: http(rpcUrl)
        });

        const balanceWei = await publicClient.getBalance({ 
          address: activeWallet.address as `0x${string}` 
        });
        
        balanceValue = (Number(balanceWei) / 1e18).toString();
      }

      const currentBalance = parseFloat(balanceValue);
      const hasMinimumChz = currentBalance >= minAmount;

      return {
        hasMinimumChz,
        currentBalance: currentBalance.toLocaleString('pt-BR', { maximumFractionDigits: 4 }),
        message: hasMinimumChz 
          ? undefined 
          : `Você precisa de pelo menos ${minAmount} CHZ para pagar as taxas da rede. Saldo atual: ${currentBalance.toFixed(4)} CHZ`
      };

    } catch (error) {
      console.error('Erro ao verificar saldo CHZ:', error);
      return {
        hasMinimumChz: false,
        currentBalance: '0',
        message: 'Erro ao verificar saldo CHZ'
      };
    } finally {
      setIsChecking(false);
    }
  }, [wallets, setActiveWallet, shouldUseEmbedded, authMethod]);

  return {
    checkChzBalance,
    isChecking
  };
} 