'use client';

import React, { useState, useEffect } from 'react';
import { StakingToken, getTokenDecimals, isFanToken } from '@/lib/tokens';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useWallets } from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
import { useChzBalanceCheck } from '@/hooks/useChzBalanceCheck';
import { useWalletStrategy } from '@/hooks/useAuthenticationMethod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { createWalletClient, custom, createPublicClient, http, parseUnits } from 'viem';
import { chiliz } from '@/lib/chains';
import stakingABIJson from '@/abis/FTStakingABI.json';

// Interface para wrong network information
interface WrongNetworkInfo {
  currentChainId: number;
  correctChainId: number;
  correctChainName: string;
  correctChainRpcUrl: string;
}

// Props para o modal
interface UniversalUnstakeModalProps {
  token: StakingToken | null;
  currentStakedAmount: number;
  currentClaimableAmount: number;
  onUnstakeSuccess: () => void;
  onClaimSuccess: () => void;
  onClose: () => void;
  isOpen: boolean;
}

// ABI do contrato de staking
const stakingABI = stakingABIJson;

export function UniversalUnstakeModal({ 
  token, 
  isOpen, 
  onClose, 
  onUnstakeSuccess,
  onClaimSuccess,
  currentStakedAmount,
  currentClaimableAmount
}: UniversalUnstakeModalProps) {
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongNetwork, setWrongNetwork] = useState<WrongNetworkInfo | null>(null);
  const [activeTab, setActiveTab] = useState('unstake');
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const { checkChzBalance } = useChzBalanceCheck();
  const { shouldUseEmbedded, authMethod } = useWalletStrategy();

  // Reset state quando o modal abre ou o token muda
  useEffect(() => {
    if (isOpen && token) {
      console.log(`UniversalUnstakeModal opened for token ${token.symbol}:`, token);
      setError(null);
      setWrongNetwork(null);
      setUnstakeAmount('');
      
      // Definir tab padrão baseado nos valores disponíveis
      if (currentClaimableAmount > 0) {
        setActiveTab('claim');
      } else {
        setActiveTab('unstake');
      }
    } else if (!isOpen) {
      setUnstakeAmount('');
    }
  }, [isOpen, token, currentClaimableAmount]);

  const switchToChilizChain = async () => {
    if (!wrongNetwork) return;
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${wrongNetwork.correctChainId.toString(16)}`,
              chainName: wrongNetwork.correctChainName,
              nativeCurrency: { name: 'CHZ', symbol: 'CHZ', decimals: 18 },
              rpcUrls: [wrongNetwork.correctChainRpcUrl],
              blockExplorerUrls: ['https://explorer.chiliz.com']
            }]
          });
        } catch (addError) {
          console.error("Error adding Chiliz Chain network:", addError);
        }
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${wrongNetwork.correctChainId.toString(16)}` }]
        });
        setError(null);
        setWrongNetwork(null);
      } else {
        setError("Your wallet doesn't support automatic network switching. Please manually connect to Chiliz Chain.");
      }
    } catch (switchError) {
      console.error("Error switching to Chiliz Chain:", switchError);
      setError("Failed to switch to Chiliz Chain. Please switch manually in your wallet settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnstake = async () => {
    setIsLoading(true);
    setError(null);
    setWrongNetwork(null);
    const toastId = toast.loading("Verificando saldo CHZ...");

    // Usar estratégia baseada no método de autenticação
    let activeWallet;
    if (shouldUseEmbedded) {
      activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
      console.log(`[UniversalUnstakeModal] Using embedded wallet for unstake (auth method: ${authMethod})`);
    } else {
      activeWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
      console.log(`[UniversalUnstakeModal] Using external wallet for unstake (auth method: ${authMethod})`);
    }
    
    if (!activeWallet) {
      setError('Nenhuma carteira conectada. Por favor, conecte uma carteira.');
      toast.error('Carteira não conectada.', { id: toastId });
      setIsLoading(false);
      return;
    }

    await setActiveWallet(activeWallet);
    await new Promise(resolve => setTimeout(resolve, 250));

    // Verificação de saldo CHZ
    console.log(`[UniversalUnstakeModal] Checking CHZ balance for wallet: ${activeWallet.address} (${activeWallet.walletClientType})`);
    const chzCheckResult = await checkChzBalance(1, activeWallet);
    console.log(`[UniversalUnstakeModal] CHZ check result:`, chzCheckResult);
    
    if (!chzCheckResult.hasMinimumChz) {
      console.error(`[UniversalUnstakeModal] Insufficient CHZ balance: ${chzCheckResult.currentBalance} CHZ`);
      setError(chzCheckResult.message || 'Saldo CHZ insuficiente para pagar as taxas da rede.');
      toast.error(chzCheckResult.message || 'Saldo CHZ insuficiente.', { id: toastId });
      setIsLoading(false);
      return;
    }
    
    console.log(`[UniversalUnstakeModal] CHZ balance check passed: ${chzCheckResult.currentBalance} CHZ`);

    toast.info("Processando unstake...", { id: toastId });

    const isEmbeddedWallet = activeWallet.walletClientType === 'privy';

    try {
      const { createWalletClient, custom, createPublicClient, http, parseUnits } = await import('viem');
      const { chiliz } = await import('@/lib/chains');
      
      const contractAddress = process.env.NEXT_PUBLIC_STAKE_CONTRACT;
      const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';

      if (!contractAddress || !rpcUrl || !activeWallet.address || !token) {
        setError('Configuração inválida ou dados faltando.');
        toast.error('Erro de configuração.', { id: toastId });
        setIsLoading(false);
        return;
      }

      if (parseFloat(unstakeAmount) <= 0) {
        setError("A quantidade para unstake deve ser maior que zero.");
        toast.error("A quantidade para unstake deve ser maior que zero.", { id: toastId });
        setIsLoading(false);
        return;
      }

      const stakerAddress = activeWallet.address as `0x${string}`;
      const decimals = getTokenDecimals(token);
      const rawAmountInput = unstakeAmount;
      
      if (isNaN(parseFloat(rawAmountInput)) || parseFloat(rawAmountInput) <= 0) {
        setError('Quantidade inválida para unstake.');
        toast.error('Quantidade inválida.', { id: toastId });
        setIsLoading(false);
        return;
      }
      
      const amountWei = parseUnits(rawAmountInput, decimals);

      let walletClient: any;
      
      if (isEmbeddedWallet) {
        const provider = await activeWallet.getEthereumProvider();
        walletClient = createWalletClient({
          account: stakerAddress,
          chain: chiliz,
          transport: custom(provider),
        });
      } else if (typeof window !== 'undefined' && window.ethereum) {
        walletClient = createWalletClient({
          account: stakerAddress,
          chain: chiliz,
          transport: custom(window.ethereum),
        });
      } else {
        setError("Provedor de carteira não encontrado ou não compatível.");
        toast.error("Carteira não compatível.", { id: toastId });
        setIsLoading(false);
        return;
      }
      
      const publicClient = createPublicClient({
        chain: chiliz,
        transport: http(rpcUrl),
      });

      let currentChainId: number | undefined;
      try {
        currentChainId = await walletClient.getChainId();
      } catch (e) { /* error handling for getChainId */ }

      if (currentChainId && currentChainId !== chiliz.id) {
        setWrongNetwork({
          currentChainId: currentChainId,
          correctChainId: chiliz.id,
          correctChainName: chiliz.name,
          correctChainRpcUrl: chiliz.rpcUrls.default.http[0],
        });
        setError(`Your wallet is connected to the wrong network. Please switch to ${chiliz.name}.`);
        toast.error(`Rede incorreta. Mude para ${chiliz.name}.`, { id: toastId });
        setIsLoading(false);
        return;
      }

      const safeTokenAddress = token.address as `0x${string}`;

      toast.info("Realizando unstake...", { id: toastId, duration: 15000 });

      const unstakeTxHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: stakingABI,
        functionName: 'unstake',
        args: [amountWei, safeTokenAddress],
        account: stakerAddress,
      });

      await publicClient.waitForTransactionReceipt({ hash: unstakeTxHash });
      
      toast.success("Unstake realizado com sucesso! Tokens entrarão em período de cooldown.", { id: toastId });
      setError(null);
      onUnstakeSuccess();

    } catch (e: any) {
      console.error("Erro no unstake:", e);
      let detailedErrorMessage = e.shortMessage || e.message || 'Erro ao realizar unstake. Tente novamente.';
      setError(detailedErrorMessage);
      toast.error(detailedErrorMessage, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async () => {
    setIsLoading(true);
    setError(null);
    setWrongNetwork(null);
    const toastId = toast.loading("Verificando saldo CHZ...");

    // Usar estratégia baseada no método de autenticação
    let activeWallet;
    if (shouldUseEmbedded) {
      activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
      console.log(`[UniversalUnstakeModal] Using embedded wallet for claim (auth method: ${authMethod})`);
    } else {
      activeWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
      console.log(`[UniversalUnstakeModal] Using external wallet for claim (auth method: ${authMethod})`);
    }
    
    if (!activeWallet) {
      setError('Nenhuma carteira conectada. Por favor, conecte uma carteira.');
      toast.error('Carteira não conectada.', { id: toastId });
      setIsLoading(false);
      return;
    }

    await setActiveWallet(activeWallet);
    await new Promise(resolve => setTimeout(resolve, 250));

    // Verificação de saldo CHZ
    const chzCheckResult = await checkChzBalance(1, activeWallet);
    
    if (!chzCheckResult.hasMinimumChz) {
      setError(chzCheckResult.message || 'Saldo CHZ insuficiente para pagar as taxas da rede.');
      toast.error(chzCheckResult.message || 'Saldo CHZ insuficiente.', { id: toastId });
      setIsLoading(false);
      return;
    }

    toast.info("Processando claim...", { id: toastId });

    const isEmbeddedWallet = activeWallet.walletClientType === 'privy';

    try {
      const { createWalletClient, custom, createPublicClient, http } = await import('viem');
      const { chiliz } = await import('@/lib/chains');
      
      const contractAddress = process.env.NEXT_PUBLIC_STAKE_CONTRACT;
      const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';

      if (!contractAddress || !rpcUrl || !activeWallet.address || !token) {
        setError('Configuração inválida ou dados faltando.');
        toast.error('Erro de configuração.', { id: toastId });
        setIsLoading(false);
        return;
      }

      const stakerAddress = activeWallet.address as `0x${string}`;

      let walletClient: any;
      
      if (isEmbeddedWallet) {
        const provider = await activeWallet.getEthereumProvider();
        walletClient = createWalletClient({
          account: stakerAddress,
          chain: chiliz,
          transport: custom(provider),
        });
      } else if (typeof window !== 'undefined' && window.ethereum) {
        walletClient = createWalletClient({
          account: stakerAddress,
          chain: chiliz,
          transport: custom(window.ethereum),
        });
      } else {
        setError("Provedor de carteira não encontrado ou não compatível.");
        toast.error("Carteira não compatível.", { id: toastId });
        setIsLoading(false);
        return;
      }
      
      const publicClient = createPublicClient({
        chain: chiliz,
        transport: http(rpcUrl),
      });

      let currentChainId: number | undefined;
      try {
        currentChainId = await walletClient.getChainId();
      } catch (e) { /* error handling for getChainId */ }

      if (currentChainId && currentChainId !== chiliz.id) {
        setWrongNetwork({
          currentChainId: currentChainId,
          correctChainId: chiliz.id,
          correctChainName: chiliz.name,
          correctChainRpcUrl: chiliz.rpcUrls.default.http[0],
        });
        setError(`Your wallet is connected to the wrong network. Please switch to ${chiliz.name}.`);
        toast.error(`Rede incorreta. Mude para ${chiliz.name}.`, { id: toastId });
        setIsLoading(false);
        return;
      }

      const safeTokenAddress = token.address as `0x${string}`;

      toast.info("Realizando claim...", { id: toastId, duration: 15000 });

      // Tentar primeiro com apenas o token address, depois com staker e token
      let claimTxHash;
      try {
        claimTxHash = await walletClient.writeContract({
          address: contractAddress as `0x${string}`,
          abi: stakingABI,
          functionName: 'claim',
          args: [safeTokenAddress],
          account: stakerAddress,
        });
      } catch (errorOuter: any) {
        try {
          claimTxHash = await walletClient.writeContract({
            address: contractAddress as `0x${string}`,
            abi: stakingABI,
            functionName: 'claim',
            args: [stakerAddress, safeTokenAddress],
            account: stakerAddress,
          });
        } catch (errorInner: any) {
          throw errorInner;
        }
      }

      await publicClient.waitForTransactionReceipt({ hash: claimTxHash });
      
      toast.success("Claim realizado com sucesso! Tokens foram transferidos para sua carteira.", { id: toastId });
      setError(null);
      onClaimSuccess();

    } catch (e: any) {
      console.error("Erro no claim:", e);
      let detailedErrorMessage = e.shortMessage || e.message || 'Erro ao realizar claim. Tente novamente.';
      if (detailedErrorMessage.toLowerCase().includes("nothing to claim")) {
        detailedErrorMessage = "Nada a resgatar para este token.";
      } else if (detailedErrorMessage.toLowerCase().includes("user rejected")) {
        detailedErrorMessage = "Transação rejeitada.";
      }
      setError(detailedErrorMessage);
      toast.error(detailedErrorMessage, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // Não renderiza nada se não estiver aberto ou sem token
  if (!isOpen || !token) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            Gerenciar Stake de {token.symbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do token */}
          <div className="flex items-center space-x-3 mb-3">
            {token.icon_url && <img src={token.icon_url} alt={token.symbol} className="w-10 h-10 rounded-full border" />}
            <div>
              <p className="font-semibold text-lg text-gray-800">{token.symbol}</p>
              <p className="text-xs text-gray-500">Contrato: {token.address.substring(0,6)}...{token.address.substring(token.address.length - 4)}</p>
            </div>
          </div>

          {/* Status atual */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Em Stake:</span>
              <span className="font-semibold">{currentStakedAmount.toLocaleString()} {token.symbol}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Disponível para Claim:</span>
              <span className="font-semibold text-green-600">{currentClaimableAmount.toLocaleString()} {token.symbol}</span>
            </div>
          </div>

          {/* Tabs para unstake e claim */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="unstake" disabled={currentStakedAmount <= 0}>
                <Clock className="h-4 w-4 mr-1" />
                Unstake
              </TabsTrigger>
              <TabsTrigger value="claim">
                <CheckCircle className="h-4 w-4 mr-1" />
                Claim
              </TabsTrigger>
              </TabsList>

            <TabsContent value="unstake" className="space-y-4">
              <div>
                <Label htmlFor="unstakeAmount" className="text-sm font-medium text-gray-700">
                  Quantidade para Unstake
                </Label>
                <Input
                  id="unstakeAmount"
                  type="number"
                  min="0"
                  max={currentStakedAmount}
                  step="any"
                  value={unstakeAmount}
                  onChange={e => setUnstakeAmount(e.target.value)}
                  className="w-full mt-1"
                  placeholder={`Ex: ${Math.min(currentStakedAmount, 100).toFixed(token.decimals === 0 ? 0 : 2)}`}
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Máximo disponível: {currentStakedAmount.toLocaleString()} {token.symbol}. 
                  Tokens entrarão em período de cooldown após unstake.
                </p>
              </div>

              <Button
                onClick={handleUnstake}
                disabled={isLoading || !unstakeAmount || parseFloat(unstakeAmount) <= 0 || parseFloat(unstakeAmount) > currentStakedAmount || !!wrongNetwork}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                Confirmar Unstake
              </Button>
            </TabsContent>

            <TabsContent value="claim" className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 mb-2">
                  Você pode resgatar <span className="font-semibold">{currentClaimableAmount.toLocaleString()} {token.symbol}</span> 
                  que já completaram o período de cooldown.
                </p>
                <p className="text-xs text-gray-600">
                  Os tokens serão transferidos diretamente para sua carteira.
                </p>
              </div>

              <Button
                onClick={handleClaim}
                // Sempre habilitado, exceto durante loading ou rede incorreta
                disabled={isLoading || !!wrongNetwork}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Resgatar {currentClaimableAmount.toLocaleString()} {token.symbol}
              </Button>
            </TabsContent>
          </Tabs>

          {error && <div className="text-red-500 mb-2 text-sm p-2 bg-red-50 rounded-md">{error}</div>}
          
          {wrongNetwork && (
            <div className="my-4">
              <p className="text-sm text-amber-700 bg-amber-100 p-3 rounded-md mb-2">{error}</p>
              <Button
                onClick={switchToChilizChain}
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Mudar para Rede {wrongNetwork.correctChainName}
              </Button>
            </div>
          )}

          <Button variant="outline" onClick={onClose} disabled={isLoading} className="w-full">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
