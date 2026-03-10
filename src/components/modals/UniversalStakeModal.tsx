'use client';

// Imports do StakeModal original e adicionais necessários
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
import { toast } from 'sonner'; // Para notificações consistentes
import { Loader2, AlertTriangle } from 'lucide-react'; // Para loading spinner
import { createWalletClient, custom, createPublicClient, http, parseUnits } from 'viem';
import { chiliz } from '@/lib/chains';
import stakingABIJson from '@/abis/FTStakingABI.json'; // Usar .json para que o TS não reclame

// Interface para wrong network information (copiada do StakeModal)
interface WrongNetworkInfo {
  currentChainId: number;
  correctChainId: number;
  correctChainName: string;
  correctChainRpcUrl: string;
}

// Props adaptadas
interface UniversalStakeModalProps {
  token: StakingToken | null;
  minRequiredAmount: number; // Para calcular quanto precisa
  currentStakedAmount: number; // Para calcular quanto precisa
  onStakeSuccess: () => void; // Chamado no sucesso do stake
  onClose: () => void; // Para fechar o modal
  isOpen: boolean; // Controla a visibilidade
}

// O ABI do contrato de staking
const stakingABI = stakingABIJson;

export function UniversalStakeModal({ 
  token, 
  isOpen, 
  onClose, 
  onStakeSuccess,
  minRequiredAmount,
  currentStakedAmount
}: UniversalStakeModalProps) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongNetwork, setWrongNetwork] = useState<WrongNetworkInfo | null>(null);
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const { checkChzBalance } = useChzBalanceCheck();
  const { shouldUseEmbedded, authMethod } = useWalletStrategy();

  // Reset state e calcula a quantidade sugerida quando o modal abre ou o token muda
  useEffect(() => {
    if (isOpen && token) {
      console.log(`UniversalStakeModal opened for token ${token.symbol}:`, token);
      setError(null);
      setWrongNetwork(null);
      
      const amountNeeded = minRequiredAmount - currentStakedAmount;
      const suggestedAmount = Math.max(0, amountNeeded);
      // Formata com decimais, garantindo que não haja erro se token.decimals for undefined
      const decimalsToUse = token.decimals === undefined || token.decimals === null ? 18 : token.decimals;
      setAmount(suggestedAmount.toFixed(decimalsToUse === 0 ? 0 : 4));

    } else if (!isOpen) {
      // Limpa o amount quando o modal é fechado, para não persistir entre aberturas
      setAmount('');
    }
  }, [isOpen, token, minRequiredAmount, currentStakedAmount]);

  const switchToChilizChain = async () => {
    // Lógica de switchToChilizChain (copiada do StakeModal original)
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

  const handleStake = async () => {
    setIsLoading(true);
    setError(null);
    setWrongNetwork(null);
    const toastId = toast.loading("Verificando saldo CHZ...");

    // Usar estratégia baseada no método de autenticação
    let activeWallet;
    if (shouldUseEmbedded) {
      // Priorizar embedded wallet (privy) para email/social login
      activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
      console.log(`[UniversalStakeModal] Using embedded wallet for stake (auth method: ${authMethod})`);
    } else {
      // Priorizar external wallet (não privy) para login via carteira externa
      activeWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
      console.log(`[UniversalStakeModal] Using external wallet for stake (auth method: ${authMethod})`);
    }
    
    if (!activeWallet) {
      setError('Nenhuma carteira conectada. Por favor, conecte uma carteira.');
      toast.error('Carteira não conectada.', { id: toastId });
      setIsLoading(false);
      return;
    }

    await setActiveWallet(activeWallet);
    await new Promise(resolve => setTimeout(resolve, 250));

    // Verificação de saldo CHZ com logs detalhados
    console.log(`[UniversalStakeModal] Checking CHZ balance for wallet: ${activeWallet.address} (${activeWallet.walletClientType})`);
    const chzCheckResult = await checkChzBalance(1, activeWallet);
    console.log(`[UniversalStakeModal] CHZ check result:`, chzCheckResult);
    
    if (!chzCheckResult.hasMinimumChz) {
      console.error(`[UniversalStakeModal] Insufficient CHZ balance: ${chzCheckResult.currentBalance} CHZ`);
      setError(chzCheckResult.message || 'Saldo CHZ insuficiente para pagar as taxas da rede.');
      toast.error(chzCheckResult.message || 'Saldo CHZ insuficiente.', { id: toastId });
      setIsLoading(false);
      return;
    }
    
    console.log(`[UniversalStakeModal] CHZ balance check passed: ${chzCheckResult.currentBalance} CHZ`);

    toast.info("Processando stake...", { id: toastId });

    // Usar a estratégia correta baseada no método de autenticação
    const isEmbeddedWallet = activeWallet.walletClientType === 'privy';

    try {
      const { createWalletClient, custom, createPublicClient, http, parseUnits } = await import('viem');
      const { chiliz } = await import('@/lib/chains');
      
      const contractAddress = process.env.NEXT_PUBLIC_STAKE_CONTRACT;
      const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';

      if (!contractAddress || !rpcUrl) {
        setError('Configuração inválida: Endereço do contrato ou RPC não definido.');
        toast.error('Erro de configuração.', { id: toastId });
        setIsLoading(false);
        return;
      }
      if (!activeWallet.address) {
        setError('Erro no stake: Endereço da carteira não disponível.');
        toast.error('Wallet not connected.', { id: toastId });
        setIsLoading(false);
        return;
      }
      if (!token) {
        setError('Token não especificado.');
        toast.error('Token não especificado.', { id: toastId });
        setIsLoading(false);
        return;
      }
       if (parseFloat(amount) <=0) {
        setError("A quantidade para stake deve ser maior que zero.");
        toast.error("A quantidade para stake deve ser maior que zero.", { id: toastId });
        setIsLoading(false);
        return;
    }


      const stakerAddress = activeWallet.address as `0x${string}`;
      const decimals = getTokenDecimals(token); // Usar getTokenDecimals como no original
      // Validar amount antes de parseUnits
      const rawAmountInput = amount;
      if (isNaN(parseFloat(rawAmountInput)) || parseFloat(rawAmountInput) <= 0) {
          setError('Quantidade inválida para stake.');
          toast.error('Quantidade inválida.', { id: toastId });
          setIsLoading(false);
          return;
      }
      const amountWei = parseUnits(rawAmountInput, decimals);


      let walletClient: any;
      
      if (isEmbeddedWallet) {
        // Para embedded wallets (Privy), usar o provider da wallet
        const provider = await activeWallet.getEthereumProvider();
        walletClient = createWalletClient({
          account: stakerAddress,
          chain: chiliz,
          transport: custom(provider),
        });
      } else if (typeof window !== 'undefined' && window.ethereum) {
        // Para external wallets (MetaMask, etc.), usar window.ethereum
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
      } catch (e) { /* ... (error handling for getChainId) ... */ }

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

      const isNative = token.address.toLowerCase() === '0x0000000000000000000000000000000000000000';
      const safeTokenAddress = token.address as `0x${string}`;

      if (!isNative) {
        try {
          // ABI de allowance e approve (copiado do StakeModal original e funcional)
          const allowanceAbiDef = [{ "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }] as const;
          const erc20ApproveAbiDef = [{ "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function" }] as const;
          
          const currentAllowance = await publicClient.readContract({
            address: safeTokenAddress,
            abi: allowanceAbiDef,
            functionName: 'allowance',
            args: [stakerAddress, contractAddress as `0x${string}`],
          });

          if ((currentAllowance as bigint) < amountWei) {
            const approvalAmount = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935"); // Max uint256
            toast.info("Aprovando tokens...", { id: toastId, duration: 15000 }); // Atualiza toast
            
            const approveTxHash = await walletClient.writeContract({
              address: safeTokenAddress,
              abi: erc20ApproveAbiDef,
              functionName: 'approve',
              args: [contractAddress as `0x${string}`, approvalAmount],
              account: stakerAddress,
            });
            await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
            toast.success("Tokens aprovados!", { id: toastId }); 
          }
        } catch (approvalError: any) {
          console.error("Erro durante o processo de aprovação:", approvalError);
          const message = approvalError.shortMessage || approvalError.message || "Failed to approve tokens.";
          setError(`Approval error: ${message}`);
          toast.error(`Approval error: ${message}`, { id: toastId });
          setIsLoading(false);
          return;
        }
      }
      
      // Lógica de Stake (stakeTokens)
      // O FTStakingABI.json já define `stakeTokens` com os inputs corretos
      // (address _tokenAddress, uint256 _amount)
      // A função 'stake' com (uint256 amount, address token) parece ser a do contrato antigo ou variação.
      // Vamos usar 'stakeTokens' que é o padrão no FTStakingABI.json
      // Certifique-se que stakingABI (importado do JSON) contenha a definição correta.

      toast.info("Realizando stake...", { id: toastId, duration: 15000 }); // Atualiza toast

      const stakeTxHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: stakingABI, // Usar o stakingABI importado do JSON
        functionName: 'stake', // CORRIGIDO para 'stake'
        args: [amountWei, safeTokenAddress], // CORRIGIDO para amount, tokenAddress
        account: stakerAddress,
      });

      await publicClient.waitForTransactionReceipt({ hash: stakeTxHash });
      
      toast.success("Stake realizado com sucesso!", { id: toastId });
      setError(null);
      onStakeSuccess(); // Chamar o callback de sucesso
      // onClose(); // O componente pai (StakeRequiredModal) decide se fecha após o sucesso.

    } catch (e: any) {
      console.error("Erro no stake:", e);
      let detailedErrorMessage = e.shortMessage || e.message || 'Erro ao realizar stake. Tente novamente.';
      // ... (tratamento de e.cause e shortMessage como no original)
      setError(detailedErrorMessage);
      toast.error(detailedErrorMessage, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // Não renderiza nada se não estiver aberto ou sem token
  if (!isOpen || !token) return null;

  // UI (copiada e adaptada do StakeModal, usando inputs e botões do shadcn/ui)
  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center space-x-3 mb-3">
          {token.icon_url && <img src={token.icon_url} alt={token.symbol} className="w-10 h-10 rounded-full border" />}
          <div>
              <p className="font-semibold text-lg text-gray-800">Stake {token.symbol}</p>
              <p className="text-xs text-gray-500">Contrato: {token.address.substring(0,6)}...{token.address.substring(token.address.length - 4)}</p>
          </div>
      </div>
      
      <div>
        <Label htmlFor="universalAmountToStake" className="text-sm font-medium text-gray-700">
          Quantidade de {token.symbol} para Stake
        </Label>
        <Input
          id="universalAmountToStake"
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full border rounded px-3 py-2 mt-1"
          placeholder={`Ex: ${(minRequiredAmount - currentStakedAmount > 0 ? (minRequiredAmount - currentStakedAmount) : 1).toFixed(token.decimals === 0 ? 0 : 2)}`}
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">
            Necessário para este NFT: {minRequiredAmount.toLocaleString()} {token.symbol}. Você já tem: {currentStakedAmount.toLocaleString()} {token.symbol} em stake.
        </p>
      </div>

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

      <div className="flex flex-col space-y-3 mt-4">
        <Button
          onClick={handleStake} // O handleStake agora cuida da aprovação e do stake
          disabled={isLoading || !amount || parseFloat(amount) <= 0 || !!wrongNetwork}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Confirmar Stake de {token.symbol}
        </Button>
        <Button variant="outline" onClick={onClose} disabled={isLoading} className="w-full">
          Cancelar
        </Button>
      </div>
    </div>
  );
} 