'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Eye, Wallet, TrendingUp, CheckCircle, Settings } from 'lucide-react';
import { StakingToken, getTokenDecimals } from '@/lib/tokens';
import { toast } from 'sonner';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useWalletStrategy } from '@/hooks/useAuthenticationMethod';
import { SociosStakeModal } from './SociosStakeModal';
import { UniversalUnstakeModal } from './UniversalUnstakeModal';
import { getStakedAmount, getClaimableAmount } from '@/utils/chiliz-token-utils';

interface StakeRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    nftTitle: string;
    requiredToken: StakingToken | null;
    requiredAmount: number;
    currentAmount: string;
    tokenSymbol: string;
  } | null;
}

export function StakeRequiredModal({ isOpen, onClose, data }: StakeRequiredModalProps) {
  const { user, authProvider } = useUnifiedAuth();
  const { activeWallet, shouldUseEmbedded, authMethod } = useWalletStrategy();
  const [hasToken, setHasToken] = useState(false);
  const [showTransferWarning, setShowTransferWarning] = useState(false);
  const [showSociosModal, setShowSociosModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string>('0');
  const [stakedBalance, setStakedBalance] = useState<string>('0');
  const [claimableBalance, setClaimableBalance] = useState<string>('0');
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Se for usuário Socios, mostrar modal específico imediatamente
  useEffect(() => {
    if (isOpen && authProvider === 'socios' && data?.requiredToken) {
      setShowSociosModal(true);
      return;
    }
  }, [isOpen, authProvider, data?.requiredToken]);

  // Buscar saldo da carteira e saldo em stake
  useEffect(() => {
    const fetchBalances = async () => {
              if (!isOpen || !data?.requiredToken || !activeWallet || authProvider === 'socios') {
        setWalletBalance('0');
        setStakedBalance('0');
        return;
      }

      setIsLoadingBalances(true);

      try {
        await new Promise(resolve => setTimeout(resolve, 250));

        const { createPublicClient, http } = await import('viem');
        const { chiliz } = await import('@/lib/chains');
        const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';
        const contractAddress = process.env.NEXT_PUBLIC_STAKE_CONTRACT;

        if (!rpcUrl || !contractAddress) {
          setIsLoadingBalances(false);
          return;
        }

        const publicClient = createPublicClient({ 
          chain: chiliz, 
          transport: http(rpcUrl) 
        });

        // Buscar saldo da carteira
        let walletBalanceValue = '0';
        try {
          if (data.requiredToken.address.toLowerCase() === '0x0000000000000000000000000000000000000000') {
            // Token nativo (CHZ)
            const balanceWei = await publicClient.getBalance({ 
              address: activeWallet.address as `0x${string}` 
            });
            const nativeBalance = (Number(balanceWei) / (10 ** 18));
            walletBalanceValue = nativeBalance.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
          } else {
            // Token ERC-20
            const rawBalance = await publicClient.readContract({
              address: data.requiredToken.address as `0x${string}`,
              abi: [
                { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "type": "function" },
              ],
              functionName: 'balanceOf',
              args: [activeWallet.address as `0x${string}`]
            });
            const tokenDecimals = getTokenDecimals(data.requiredToken);
            const balance = Number(rawBalance) / (10 ** tokenDecimals);
            walletBalanceValue = balance.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
          }
        } catch (balanceError) {
          console.error('Erro ao buscar saldo da carteira:', balanceError);
          walletBalanceValue = '0';
        }

        // Buscar saldo em stake
        let stakedBalanceValue = '0';
        try {
          const stakedAmountDisplay = await getStakedAmount(
            activeWallet.address,
            data.requiredToken.address,
            contractAddress
          );
          // getStakedAmount já retorna string formatada para exibição
          if (stakedAmountDisplay && stakedAmountDisplay !== 'Error') {
            stakedBalanceValue = String(stakedAmountDisplay);
          }
        } catch (stakeError) {
          console.error('Erro ao buscar saldo em stake:', stakeError);
          stakedBalanceValue = '0';
        }

        // Buscar saldo disponível para claim
        let claimableBalanceValue = '0';
        try {
          const claimableAmountRaw = await getClaimableAmount(
            activeWallet.address,
            data.requiredToken.address,
            contractAddress
          );
          
          if (claimableAmountRaw && String(claimableAmountRaw) !== 'Error' && !isNaN(Number(claimableAmountRaw))) {
            const decimals = getTokenDecimals(data.requiredToken);
            const claimableAmount = Number(claimableAmountRaw) / (10 ** decimals);
            claimableBalanceValue = claimableAmount.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
          }
        } catch (claimError) {
          console.error('Erro ao buscar saldo claimable:', claimError);
          claimableBalanceValue = '0';
        }

        setWalletBalance(walletBalanceValue);
        setStakedBalance(stakedBalanceValue);
        setClaimableBalance(claimableBalanceValue);

      } catch (error) {
        console.error('Erro ao buscar saldos:', error);
        setWalletBalance('0');
        setStakedBalance('0');
        setClaimableBalance('0');
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchBalances();
  }, [isOpen, data?.requiredToken, activeWallet]);

  useEffect(() => {
    if (data && parseFloat(data.currentAmount) > 0) {
      setHasToken(true);
    } else {
      setHasToken(false);
    }
  }, [data]);

  if (!isOpen || !data || !data.requiredToken) {
    return null;
  }

  // Usar a carteira correta baseada no método de autenticação
  const walletAddress = activeWallet?.address || '';
  const shortAddress = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '';

  const copyWalletAddress = async () => {
    if (!walletAddress) return;
    
    try {
      await navigator.clipboard.writeText(walletAddress);
      toast.success('Endereço copiado!');
      setShowTransferWarning(true);
    } catch (error) {
      toast.error('Error copying address');
    }
  };

  const handleViewStakes = () => {
    window.open('/stakes', '_blank');
  };

  const handleGoToStakes = () => {
    window.location.href = '/stakes';
  };



  // Se for usuário Socios, não mostrar o modal principal
  if (authProvider === 'socios') {
    return (
      <>
        {showSociosModal && (
          <SociosStakeModal
            isOpen={showSociosModal}
            onClose={() => {
              setShowSociosModal(false);
              onClose();
            }}
            data={{
              nftTitle: data.nftTitle,
              requiredToken: data.requiredToken,
              requiredAmount: data.requiredAmount,
              tokenSymbol: data.tokenSymbol
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {hasToken ? 'Fazer Stake' : 'Token Necessário'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Seção de informações de saldo - sempre mostrada */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Seus Saldos {data.tokenSymbol}</h3>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Na Carteira:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900">
                    {isLoadingBalances ? '...' : walletBalance}
                  </span>
                  {data?.requiredToken?.icon_url && (
                    <img 
                      src={data.requiredToken.icon_url} 
                      alt={data.tokenSymbol} 
                      className="w-4 h-4 rounded-full" 
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Em Stake:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900">
                    {isLoadingBalances ? '...' : stakedBalance}
                  </span>
                  {data?.requiredToken?.icon_url && (
                    <img 
                      src={data.requiredToken.icon_url} 
                      alt={data.tokenSymbol} 
                      className="w-4 h-4 rounded-full" 
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-600">Disponível p/ Claim:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-green-600">
                    {isLoadingBalances ? '...' : claimableBalance}
                  </span>
                  {data?.requiredToken?.icon_url && (
                    <img 
                      src={data.requiredToken.icon_url} 
                      alt={data.tokenSymbol} 
                      className="w-4 h-4 rounded-full" 
                    />
                  )}
                </div>
              </div>

              <div className="border-t pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Faltam:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-gray-900">
                      {Math.max(0, data.requiredAmount - parseFloat(stakedBalance.replace(/[^\d.,]/g, '').replace(',', '.')))}
                    </span>
                    {data?.requiredToken?.icon_url && (
                      <img 
                        src={data.requiredToken.icon_url} 
                        alt={data.tokenSymbol} 
                        className="w-4 h-4 rounded-full" 
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!hasToken ? (
              <>
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-gray-500 mb-2 text-left">Sua carteira:</p>
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
                        Transfira {data.tokenSymbol} para a ChilizChain neste endereço.
                      </p>
                    </div>
                  )}

                <div className="space-y-2">
                  <Button
                    onClick={handleViewStakes}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Meus Stakes
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    Você tem {parseFloat(walletBalance.replace(/[^\d.,]/g, '').replace(',', '.'))} {data.tokenSymbol} na carteira. Precisa de {data.requiredAmount} em stake.
                  </p>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={handleGoToStakes}
                    className="w-full"
                  >
                    Fazer Stake de {data.tokenSymbol}
                  </Button>
                  
                  <Button
                    onClick={() => setShowUnstakeModal(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Gerenciar Stakes
                  </Button>
                  
                  <Button
                    onClick={handleViewStakes}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Todos os Stakes
                  </Button>
                </div>
              </>
            )}

            <Button variant="outline" onClick={onClose} className="w-full">
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* UniversalUnstakeModal para carteiras Privy */}
      {showUnstakeModal && data?.requiredToken && (
        <UniversalUnstakeModal
          isOpen={showUnstakeModal}
          onClose={() => {
            setShowUnstakeModal(false);
            // Recarregar dados após fechar o modal
            const fetchBalances = async () => {
              setIsLoadingBalances(true);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar transação ser processada
              // Re-executar a mesma lógica de fetchBalances do useEffect
            };
            fetchBalances();
          }}
          token={data.requiredToken}
          currentStakedAmount={parseFloat(stakedBalance.replace(/[^\d.,]/g, '').replace(',', '.'))}
          currentClaimableAmount={parseFloat(claimableBalance.replace(/[^\d.,]/g, '').replace(',', '.'))}
          onUnstakeSuccess={() => {
            toast.success('Unstake realizado com sucesso!');
            // Recarregar dados
            setIsLoadingBalances(true);
            // A função fetchBalances será executada pelo useEffect quando isLoadingBalances mudar
          }}
          onClaimSuccess={() => {
            toast.success('Claim realizado com sucesso!');
            // Recarregar dados
            setIsLoadingBalances(true);
          }}
        />
      )}

      {showSociosModal && (
        <SociosStakeModal
          isOpen={showSociosModal}
          onClose={() => {
            setShowSociosModal(false);
            onClose();
          }}
          data={{
            nftTitle: data.nftTitle,
            requiredToken: data.requiredToken,
            requiredAmount: data.requiredAmount,
            tokenSymbol: data.tokenSymbol
          }}
        />
      )}
    </>
  );
} 
