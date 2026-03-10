import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, RefreshCw, AlertTriangle, ShoppingCart } from 'lucide-react';
import { useWallets } from '@privy-io/react-auth';
import { useWalletStrategy } from '@/hooks/useAuthenticationMethod';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { createPublicClient, http } from 'viem';
import { chiliz } from '@/lib/chains';
import Link from 'next/link';

interface ChzBalanceCardProps {
  className?: string;
  onLoadingStateChange?: (isReady: boolean) => void;
}

export function ChzBalanceCard({ className, onLoadingStateChange }: ChzBalanceCardProps) {
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { shouldUseEmbedded, authMethod } = useWalletStrategy();
  const { authenticated } = useUnifiedAuth();

  const fetchChzBalance = async () => {
    console.log('[ChzBalanceCard] Starting CHZ balance fetch...');
    if (!authenticated || wallets.length === 0) {
      console.log('[ChzBalanceCard] No auth/wallets, skipping balance fetch');
      setBalance('0');
      setIsLoading(false);
      onLoadingStateChange?.(true); // Consider ready when not authenticated
      return;
    }

    setIsLoading(true);
    setError(null);
    onLoadingStateChange?.(false); // Mark as not ready when loading starts

    // Implementar timeout
    const timeoutId = setTimeout(() => {
      console.log('[ChzBalanceCard] Balance fetch timeout after 10s');
      setError('Timeout ao buscar saldo');
      setIsLoading(false);
      onLoadingStateChange?.(true);
    }, 10000);

    try {
      // Usar estratégia baseada no método de autenticação
      let activeWallet;
      if (shouldUseEmbedded) {
        activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
        console.log(`[ChzBalanceCard] Using embedded wallet for CHZ balance check (auth method: ${authMethod})`);
      } else {
        activeWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
        console.log(`[ChzBalanceCard] Using external wallet for CHZ balance check (auth method: ${authMethod})`);
      }

      if (!activeWallet?.address) {
        console.log('[ChzBalanceCard] No active wallet address found');
        setError('Carteira não encontrada');
        setIsLoading(false);
        onLoadingStateChange?.(true); // Consider ready even with error
        clearTimeout(timeoutId);
        return;
      }

      const isEmbeddedWallet = activeWallet.walletClientType === 'privy';
      let balanceValue: string;

      if (isEmbeddedWallet) {
        // Para embedded wallets, usar o provider da Privy
        try {
          console.log("[ChzBalanceCard] Getting balance via Privy provider for:", activeWallet.address);
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
          console.error("[ChzBalanceCard] Error getting balance from Privy provider:", privyError);
          throw privyError;
        }
      } else {
        // Para external wallets, usar PublicClient
        console.log("[ChzBalanceCard] Getting balance via PublicClient for:", activeWallet.address);
        const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';
        
        if (!rpcUrl) {
          throw new Error('RPC URL não configurada');
        }

        const publicClient = createPublicClient({
          chain: chiliz,
          transport: http(rpcUrl),
        });

        const balanceWei = await publicClient.getBalance({ 
          address: activeWallet.address as `0x${string}` 
        });
        
        balanceValue = (Number(balanceWei) / 1e18).toString();
      }

      const currentBalance = parseFloat(balanceValue);
      setBalance(currentBalance.toLocaleString('pt-BR', { maximumFractionDigits: 4 }));
      console.log(`[ChzBalanceCard] Balance fetched successfully: ${currentBalance} CHZ`);

    } catch (error) {
      console.error('[ChzBalanceCard] Error fetching CHZ balance:', error);
      setError('Erro ao carregar saldo');
      setBalance('0');
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      onLoadingStateChange?.(true); // Mark as ready after loading completes (success or error)
      console.log('[ChzBalanceCard] Finished fetching balance, isLoading = false');
    }
  };

  useEffect(() => {
    fetchChzBalance();
  }, [authenticated, wallets, shouldUseEmbedded, authMethod]);

  if (!authenticated) {
    return null;
  }

  const numericBalance = parseFloat(balance.replace(/[^\d.,]/g, '').replace(',', '.'));
  const hasMinimumChz = numericBalance >= 1;

  return (
    <Card className={`${className} ${!hasMinimumChz ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Saldo CHZ (Gas)
          <button
            onClick={fetchChzBalance}
            disabled={isLoading}
            className="ml-auto p-1 hover:bg-gray-100 rounded transition-colors"
            title="Atualizar saldo"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {error ? (
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {isLoading ? (
                  <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  balance
                )}
              </span>
              <span className="text-sm text-gray-500">CHZ</span>
            </div>
            
            {!hasMinimumChz && !isLoading && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-2 bg-red-100 border border-red-200 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-red-700">
                    <p className="font-medium">Saldo insuficiente!</p>
                    <p>Você precisa de pelo menos 1 CHZ para pagar as taxas das transações.</p>
                  </div>
                </div>
                
                <Link href="/buy-pix?token=chz&amount=10.00&amountType=real" passHref>
                  <Button size="sm" className="w-full flex items-center gap-2">
                    <ShoppingCart className="h-3 w-3" />
                    Comprar CHZ (R$ 10,00)
                  </Button>
                </Link>
              </div>
            )}
            
            {hasMinimumChz && !isLoading && (
              <div className="text-xs text-green-700 bg-green-100 p-2 rounded-md hidden">
                ✅ Saldo suficiente para transações
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 