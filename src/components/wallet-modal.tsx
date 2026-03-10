"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Eye, ShoppingCart } from "lucide-react"
import { usePrivy } from "@privy-io/react-auth"
import type { ConnectedWallet } from '@privy-io/react-auth'
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"
import { getTokenDecimals, type Token } from '@/lib/tokens'

const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
);

interface StakingToken {
  symbol: string
  name: string
  icon_url: string
  address: string
  decimals?: number
}

interface TokenBalance {
  token: StakingToken
  balance: string
  formattedBalance: string
  decimals?: number
}

interface WalletModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: ConnectedWallet | undefined
}

export function WalletModal({ open, onOpenChange, wallet: embeddedWallet }: WalletModalProps) {
  const { exportWallet } = usePrivy()
  
  const [chzBalance, setChzBalance] = useState<string | null>(null)
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [stakingTokens, setStakingTokens] = useState<StakingToken[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchAllData = useCallback(async () => {
    if (!embeddedWallet) return;

    setIsLoading(true);
    setChzBalance(null);
    setTokenBalances([]);

    try {
      const tokenResponse = await fetch('/api/all-staking-tokens');
      if (!tokenResponse.ok) throw new Error('Failed to fetch tokens');
      const tokens: StakingToken[] = await tokenResponse.json();
      setStakingTokens(tokens);

      const provider = await embeddedWallet.getEthereumProvider();
      
      const chzBalanceWei = await provider.request({
        method: 'eth_getBalance',
        params: [embeddedWallet.address, 'latest']
      });
      const chzBalanceEth = parseInt(chzBalanceWei, 16) / Math.pow(10, 18);
      setChzBalance(chzBalanceEth.toFixed(4));

      const tokenBalancePromises = tokens.map(async (token) => {
        try {
          const balanceHex = await provider.request({
            method: 'eth_call',
            params: [{
              to: token.address,
              data: `0x70a08231000000000000000000000000${embeddedWallet.address.slice(2)}`
            }, 'latest']
          });
          
          // Usar decimais direto do token ou 0 para fan tokens
          const correctDecimals = token.decimals ?? 0;
          const balance = parseInt(balanceHex, 16);
          
          // Usar os decimals corretos do getTokenDecimals
          const formattedBalanceValue = correctDecimals > 0 
            ? balance / Math.pow(10, correctDecimals)
            : balance;
          
          // Formatar baseado nos decimals
          const formattedBalance = correctDecimals === 0 
            ? formattedBalanceValue.toString() 
            : formattedBalanceValue === 0 
              ? "0" 
              : formattedBalanceValue.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
          
          return { 
            token, 
            balance: balance.toString(), 
            formattedBalance,
            decimals: correctDecimals 
          };
        } catch (error) {
          console.error(`Error processing token ${token.symbol}:`, error);
          return { token, balance: "0", formattedBalance: "0", decimals: 18 };
        }
      });
      
      const balances = await Promise.all(tokenBalancePromises);
      setTokenBalances(balances);

    } catch (error) {
      toast.error('Erro ao carregar saldos da carteira');
      console.error("Fetch data error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [embeddedWallet]);

  useEffect(() => {
    if (open) {
      fetchAllData();
    }
  }, [open, fetchAllData]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copiado para a área de transferência`)
    } catch {
      toast.error('Erro ao copiar para a área de transferência')
    }
  }

  const handleExportPrivateKey = async () => {
    if (!embeddedWallet) {
      toast.error('Exportação de chave privada disponível apenas para carteiras incorporadas')
      return
    }

    try {
      await exportWallet()
      toast.success('Modal de exportação aberto')
    } catch (error) {
      console.error('Erro ao exportar carteira:', error)
      toast.error('Erro ao exportar chave privada')
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const chzToken = stakingTokens.find(t => t.symbol === 'CHZ');

  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Minha Carteira</DialogTitle>
        </DialogHeader>
        
        {!embeddedWallet ? (
          <div className="text-center p-4">
            <p>Carteira não encontrada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Endereço</p>
                <p className="font-mono text-sm">{formatAddress(embeddedWallet.address)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(embeddedWallet.address, 'Endereço')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {chzToken && chzToken.icon_url ? (
                     <Image 
                      src={chzToken.icon_url} 
                      alt="Chiliz"
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">CHZ</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Chiliz</p>
                    <p className="text-sm text-muted-foreground">CHZ</p>
                  </div>
                </div>
                <div className="text-right flex items-center space-x-2">
                  <span className="font-medium">
                    {isLoading || chzBalance === null ? <LoadingSpinner /> : `${chzBalance} CHZ`}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    asChild
                    onClick={() => onOpenChange(false)}
                  >
                    <Link href={`/buy-pix?token=CHZ`} aria-label="Comprar Chiliz">
                      <ShoppingCart className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              {isLoading && stakingTokens.length === 0 && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                        <div>
                          <div className="h-4 w-24 bg-gray-300 rounded"></div>
                          <div className="h-3 w-12 bg-gray-300 rounded mt-1"></div>
                        </div>
                      </div>
                      <div className="h-4 w-20 bg-gray-300 rounded"></div>
                    </div>
                  ))}
                </div>
              )}
              
              {!isLoading && tokenBalances.filter(tb => tb.token.symbol !== 'CHZ').map((tokenBalance) => (
                <div key={tokenBalance.token.address} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <Image 
                      src={tokenBalance.token.icon_url || '/placeholder-token.png'} 
                      alt={tokenBalance.token.name}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{tokenBalance.token.name}</p>
                      <p className="text-sm text-muted-foreground">{tokenBalance.token.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center space-x-2">
                    <span className="font-medium">
                      {`${tokenBalance.formattedBalance} ${tokenBalance.token.symbol}`}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      asChild
                      onClick={() => onOpenChange(false)}
                    >
                      <Link href={`/buy-pix?token=${tokenBalance.token.symbol}`} aria-label={`Comprar ${tokenBalance.token.name}`}> 
                        <ShoppingCart className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t my-4" />

            {embeddedWallet && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Segurança</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExportPrivateKey}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Exportar Chave Privada
                </Button>
                <p className="text-xs text-muted-foreground text-center px-2">
                  Exporte sua chave privada para importá-la em sua carteira de preferência (ex: MetaMask, Rabby) e ter controle total sobre seus ativos.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}