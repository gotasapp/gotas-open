'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StakingToken } from '@/lib/tokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useWallets } from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
import { useChzBalanceCheck } from '@/hooks/useChzBalanceCheck';
import { useWalletStrategy } from '@/hooks/useAuthenticationMethod';
import { createWalletClient, http, parseUnits, publicActions, Address, custom } from 'viem';
import { chiliz } from '@/lib/chains'; 
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ABIs Adaptados do StakeModal funcional em token-grid.tsx
const allowanceAbi = [
    { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
] as const;

const erc20ApproveAbi = [
    { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "stateMutability": "nonpayable", "type": "function" }
] as const;

const ftStakingABI = [
    { "inputs": [ { "internalType": "address", "name": "_tokenAddress", "type": "address" }, { "internalType": "uint256", "name": "_amount", "type": "uint256" } ], "name": "stakeTokens", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
] as const;

const MAX_UINT256 = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");

interface MiniStakeFormProps {
  token: StakingToken;
  minRequiredAmount: number; 
  currentStakedAmount: number; 
  onStakeSuccess: () => void;
  onClose: () => void;
}

export function MiniStakeForm({ token, minRequiredAmount, currentStakedAmount, onStakeSuccess, onClose }: MiniStakeFormProps) {
  const { user } = useUnifiedAuth();
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const { checkChzBalance } = useChzBalanceCheck();
  const { shouldUseEmbedded, authMethod } = useWalletStrategy();
  const [amountToStake, setAmountToStake] = useState<string>('');
  const [isApproving, setIsApproving] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(true);

  const stakeContractAddress = process.env.NEXT_PUBLIC_STAKE_CONTRACT as Address;
  const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';

  const getWalletClient = useCallback(async () => {
    if (!user?.wallet?.address || wallets.length === 0) return null;
    
    // Usar estratégia baseada no método de autenticação
    let activeWallet;
    if (shouldUseEmbedded) {
      activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
    } else {
      activeWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
    }
    
    const isEmbeddedWallet = activeWallet.walletClientType === 'privy';

    if (isEmbeddedWallet) {
      // Para embedded wallets (Privy), usar o provider da wallet
      return activeWallet.getEthereumProvider().then(provider => 
        createWalletClient({
          account: activeWallet.address as Address,
          chain: chiliz,
          transport: custom(provider),
        }).extend(publicActions)
      );
    } else if (typeof window !== 'undefined' && window.ethereum) {
      // Para external wallets (MetaMask, etc.), usar window.ethereum
      return Promise.resolve(createWalletClient({
        account: activeWallet.address as Address,
        chain: chiliz,
        transport: custom(window.ethereum),
      }).extend(publicActions));
    }
    return null;
  }, [user?.wallet?.address, wallets, shouldUseEmbedded]);

  useEffect(() => {
    const checkAllowance = async () => {
      const walletClientPromise = getWalletClient();
      if (!walletClientPromise || !user?.wallet?.address || !token.address || !stakeContractAddress || !amountToStake || parseFloat(amountToStake) <= 0) {
        // Não checar se não houver valor ou se o valor for zero/negativo
        // ou se o cliente não estiver pronto.
        // Se amountToStake for vazio, considera que não precisa de aprovação ainda ou mantém estado anterior.
        if (!amountToStake || parseFloat(amountToStake) <= 0) setNeedsApproval(false);
        return;
      }
      try {
        const walletClient = await walletClientPromise;
        if (!walletClient) {
          console.error("Wallet client is null");
          return;
        }
        const currentAllowance = await walletClient.readContract({
          address: token.address as Address,
          abi: allowanceAbi,
          functionName: 'allowance',
          args: [user.wallet.address as Address, stakeContractAddress],
        });
        const parsedAmount = amountToStake ? parseUnits(amountToStake, token.decimals || 18) : BigInt(0);
        setNeedsApproval(currentAllowance < parsedAmount);
      } catch (error) {
        console.error("Error checking allowance:", error);
        toast.error("Error checking token permission.");
        setNeedsApproval(true); 
      }
    };
    checkAllowance();
  }, [amountToStake, user?.wallet?.address, token.address, token.decimals, stakeContractAddress, wallets]);

  useEffect(() => {
    const amountNeeded = minRequiredAmount - currentStakedAmount;
    if (amountNeeded > 0 && amountToStake === '') {
        const suggestedAmount = Math.max(0, amountNeeded);
        setAmountToStake(suggestedAmount.toFixed(token.decimals === 0 ? 0 : 4)); // Formatar com decimais
    }
  }, [minRequiredAmount, currentStakedAmount, token.decimals]);

  const handleApprove = async () => {
    const walletClientPromise = getWalletClient();
    if (!walletClientPromise || !user?.wallet?.address || !token.address || !stakeContractAddress) {
      toast.error("Wallet not connected or insufficient data for approval.");
      return;
    }

    setIsApproving(true);
    const toastId = toast.loading("Aprovando tokens...");
    try {
      const walletClient = await walletClientPromise;
      if (!walletClient) {
        toast.error("Erro ao conectar com a carteira.");
        setIsApproving(false);
        return;
      }
      
      // Verificar se a carteira está na rede correta antes de aprovar
      let currentChainId: number | undefined;
      try {
        currentChainId = await walletClient.getChainId();
      } catch (chainCheckError) {
        console.error("Erro ao verificar chain ID:", chainCheckError);
      }

      if (currentChainId && currentChainId !== chiliz.id) {
        toast.error(`Sua carteira está conectada à rede errada (ID: ${currentChainId}). Por favor, mude para a rede Chiliz (ID: ${chiliz.id}).`, { id: toastId });
        setIsApproving(false);
        return;
      }
      
      const hash = await walletClient.writeContract({
        account: user.wallet.address as Address,
        address: token.address as Address,
        abi: erc20ApproveAbi,
        functionName: 'approve',
        args: [stakeContractAddress, MAX_UINT256],
      });
      await walletClient.waitForTransactionReceipt({ hash });
      toast.success("Approval successful!", { id: toastId });
      setNeedsApproval(false);
    } catch (error: any) {
      console.error("Error approving tokens:", error);
      const message = error.shortMessage || "Failed to approve tokens.";
      toast.error(message, { id: toastId });
    } finally {
      setIsApproving(false);
    }
  };

  const handleStake = async () => {
    if (wallets.length === 0) {
      toast.error("Nenhuma carteira conectada.");
      return;
    }
    
    if (!amountToStake || !token.address || !stakeContractAddress) {
      toast.error("Dados insuficientes para realizar o stake.");
      return;
    }
    
    if (parseFloat(amountToStake) <= 0) {
      toast.error("A quantidade para stake deve ser maior que zero.");
      return;
    }

    setIsStaking(true);
    const toastId = toast.loading("Verificando saldo CHZ...");

    // Usar estratégia baseada no método de autenticação
    let activeWallet;
    if (shouldUseEmbedded) {
      // Priorizar embedded wallet (privy) para email/social login
      activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
    } else {
      // Priorizar external wallet (não privy) para login via carteira externa
      activeWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
    }

    if (!activeWallet) {
      toast.error("Carteira não encontrada.", { id: toastId });
      setIsStaking(false);
      return;
    }

    await setActiveWallet(activeWallet);
    await new Promise(resolve => setTimeout(resolve, 250));

    // Verificação de saldo CHZ com logs detalhados
    console.log(`[MiniStakeForm] Checking CHZ balance for wallet: ${activeWallet.address} (${activeWallet.walletClientType})`);
    const chzCheckResult = await checkChzBalance(1, activeWallet);
    console.log(`[MiniStakeForm] CHZ check result:`, chzCheckResult);
    
    if (!chzCheckResult.hasMinimumChz) {
      console.error(`[MiniStakeForm] Insufficient CHZ balance: ${chzCheckResult.currentBalance} CHZ`);
      toast.error(chzCheckResult.message || 'Saldo CHZ insuficiente para pagar as taxas da rede.', { id: toastId });
      setIsStaking(false);
      return;
    }
    
    console.log(`[MiniStakeForm] CHZ balance check passed: ${chzCheckResult.currentBalance} CHZ`);

    const walletClientPromise = getWalletClient();
    if (!walletClientPromise) {
      toast.error("Erro ao conectar com a carteira.", { id: toastId });
      setIsStaking(false);
      return;
    }

    toast.info("Realizando stake...", { id: toastId });
    
    try {
      const walletClient = await walletClientPromise;
      
      if (!walletClient) {
        toast.error("Erro ao conectar com a carteira.", { id: toastId });
        setIsStaking(false);
        return;
      }
      
      // Verificar se a carteira está na rede correta antes de fazer stake
      let currentChainId: number | undefined;
      try {
        currentChainId = await walletClient.getChainId();
      } catch (chainCheckError) {
        console.error("Erro ao verificar chain ID:", chainCheckError);
      }

      if (currentChainId && currentChainId !== chiliz.id) {
        toast.error(`Sua carteira está conectada à rede errada (ID: ${currentChainId}). Por favor, mude para a rede Chiliz (ID: ${chiliz.id}).`, { id: toastId });
        setIsStaking(false);
        return;
      }
      
      const amountToStakeParsed = parseUnits(amountToStake, token.decimals || 18);
      const { request } = await walletClient.simulateContract({
        account: activeWallet.address as Address,
        address: stakeContractAddress,
        abi: ftStakingABI,
        functionName: 'stakeTokens',
        args: [token.address as Address, amountToStakeParsed],
      });
      const hash = await walletClient.writeContract(request);
      await walletClient.waitForTransactionReceipt({ hash });
      toast.success("Stake realizado com sucesso!", { id: toastId });
      onStakeSuccess(); 
    } catch (error: any) {
      console.error("Error performing stake:", error);
      const message = error.shortMessage || "Failed to perform stake.";
      toast.error(message, { id: toastId });
    } finally {
      setIsStaking(false);
    }
  };

  const isLoading = isApproving || isStaking;

  if (!token) return <p className="text-center text-red-500">Erro: Token não especificado para o MiniStakeForm.</p>;
  if (!stakeContractAddress) return <p className="text-center text-red-500">Erro: Endereço do contrato de stake não configurado.</p>;

  return (
    <div className="space-y-4 p-1">
        <div className="flex items-center space-x-3 mb-3">
            {token.icon_url && <img src={token.icon_url} alt={token.symbol} className="w-10 h-10 rounded-full border" />}
            <div>
                <p className="font-semibold text-lg text-gray-800">Stake {token.symbol}</p>
                <p className="text-xs text-gray-500">Contrato do Token: {token.address.substring(0,6)}...{token.address.substring(token.address.length - 4)}</p>
            </div>
        </div>

      <div>
        <Label htmlFor="amountToStakeMiniForm" className="text-sm font-medium text-gray-700">
          Quantidade de {token.symbol} para Stake
        </Label>
        <Input
          id="amountToStakeMiniForm" // ID único
          type="number"
          value={amountToStake}
          onChange={(e) => setAmountToStake(e.target.value)}
          placeholder={`Ex: ${(minRequiredAmount - currentStakedAmount > 0 ? minRequiredAmount - currentStakedAmount : 1).toFixed(token.decimals === 0 ? 0 : 2)}`}
          disabled={isLoading}
          className="mt-1"
          min="0" // Não permitir negativo
        />
        <p className="text-xs text-gray-500 mt-1">
            Mínimo necessário para o NFT: {minRequiredAmount.toLocaleString()} {token.symbol}. Você já possui: {currentStakedAmount.toLocaleString()} {token.symbol} em stake.
        </p>
      </div>

      <div className="flex flex-col space-y-3">
        {needsApproval && parseFloat(amountToStake) > 0 ? (
          <Button onClick={handleApprove} disabled={isLoading || !amountToStake || parseFloat(amountToStake) <= 0} className="w-full">
            {isApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            1. Aprovar {token.symbol}
          </Button>
        ) : null}
        <Button 
          onClick={handleStake} 
          disabled={isLoading || !amountToStake || parseFloat(amountToStake) <= 0 || (needsApproval && parseFloat(amountToStake) > 0)}
          className={`w-full ${needsApproval && parseFloat(amountToStake) > 0 ? '' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {isStaking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {needsApproval && parseFloat(amountToStake) > 0 ? '2. ' : ''}Confirmar Stake
        </Button>
         <Button variant="outline" onClick={onClose} disabled={isLoading} className="w-full">
            Cancelar Operação
        </Button>
      </div>
      {parseFloat(amountToStake) > 0 && needsApproval && (
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md text-center mt-2">
              Passo 1: Aprovação necessária para permitir que o contrato de stake utilize seus tokens {token.symbol}.
          </p>
      )}
    </div>
  );
} 