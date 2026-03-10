'use client';

import React, { useEffect, useState } from 'react';
import { StakingToken, getTokenDecimals, isFanToken } from '@/lib/tokens';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useWallets } from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
import { useSwitchChain, useAccount } from 'wagmi';
import stakingABI from '@/abis/FTStakingABI.json';
import { TokenCard } from './token-card';
import { TokenCardSkeleton } from './token-card-skeleton';
import { ZeroBalanceModal } from '@/components/modals/ZeroBalanceModal';
import { SociosUnstakeModal } from '@/components/modals/SociosUnstakeModal';
import {
  trackStakeInitiated,
  trackStakeSuccessful,
  trackStakeFailed,
  trackUnstakeInitiated,
  trackUnstakeSuccessful,
  trackUnstakeFailed,
  trackClaimInitiated,
  trackClaimSuccessful,
  trackClaimFailed,
} from '@/lib/gtag';
import { SociosStakeModal } from '@/components/modals/SociosStakeModal';
import {
  getStakedAmount,
  getTokenBalance,
  getNativeBalance,
  getUnstakeCooldownPeriod,
  getClaimableAmount,
  getPendingUnstakeAmount,
} from '@/utils/chiliz-token-utils';
import { useEnsureWalletConsistency, WalletConsistencyError, WalletConsistencyErrorType } from '@/hooks/useEnsureWalletConsistency';
import { useChzBalanceCheck } from '@/hooks/useChzBalanceCheck';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { chiliz } from '@/lib/chains';
import { useWalletStrategy } from '@/hooks/useAuthenticationMethod';

// Interface for wrong network information
interface WrongNetworkInfo {
  currentChainId: number;
  correctChainId: number;
  correctChainName: string;
  correctChainRpcUrl: string;
}

/**
 * ErrorActionsModal Component - Mostra erros de carteira/rede com ações.
 */
interface ErrorActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorType: WalletConsistencyErrorType | null;
  errorData?: any;
  title?: string;
  description?: string;
}

function ErrorActionsModal({ isOpen, onClose, errorType, errorData, title, description }: ErrorActionsModalProps) {
  const { switchChain } = useSwitchChain();
  const { wallets } = useWallets();
  const { shouldUseEmbedded, authMethod } = useWalletStrategy();
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  if (!isOpen || !errorType) return null;

  let modalTitle = title || "Atenção";
  let modalDescription = description || "Ocorreu um problema.";
  const actionButtons: React.ReactNode[] = [];

  // Preparar informações de debug
  let activeWallet;
  if (shouldUseEmbedded) {
    // Priorizar embedded wallet (privy) para email/social login
    activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
  } else {
    // Priorizar external wallet (não privy) para login via carteira externa
    activeWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
  }

  const debugInfo = {
    errorType,
    errorData,
    authMethod,
    shouldUseEmbedded,
    walletsCount: wallets.length,
    wallets: wallets.map(w => ({
      address: w.address,
      walletClientType: w.walletClientType,
      connectorType: w.connectorType,
      imported: w.imported
    })),
    activeWallet,
    windowEthereum: typeof window !== 'undefined' && !!window.ethereum,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
    timestamp: new Date().toISOString()
  };

  switch (errorType) {
    case WalletConsistencyErrorType.AddressMismatch:
      modalTitle = "Inconsistência de Carteira";
      modalDescription = `A carteira selecionada no seu provedor (${errorData?.currentAddress ? errorData.currentAddress.slice(0,6)+'...'+errorData.currentAddress.slice(-4) : 'desconhecida'}) não é a que o app espera (${errorData?.desiredAddress ? errorData.desiredAddress.slice(0,6)+'...'+errorData.desiredAddress.slice(-4) : 'desconhecida'}). Por favor, selecione a carteira correta no seu MetaMask (ou similar) e tente novamente.`;
      break;
    case WalletConsistencyErrorType.NetworkMismatch:
      modalTitle = "Rede Incorreta";
      modalDescription = `Sua carteira (${errorData?.currentAddress ? errorData.currentAddress.slice(0,6)+'...'+errorData.currentAddress.slice(-4) : 'desconhecida'}) está conectada à rede errada (ID: ${errorData?.currentChainId}). Por favor, mude para a rede ${errorData?.correctChainName || 'Chiliz'}.`;
      if (switchChain && errorData?.correctChainId) {
        actionButtons.push(
          <AlertDialogAction key="switch" onClick={async () => {
            try {
              await switchChain({ chainId: errorData.correctChainId });
              onClose();
            } catch (switchError) {
              console.error("Falha ao tentar trocar de rede:", switchError); 
            }
          }}>
            Mudar para {errorData?.correctChainName || 'Chiliz'}
          </AlertDialogAction>
        );
      }
      break;
    case WalletConsistencyErrorType.WagmiNotConnected:
       modalTitle = "Carteira Desconectada";
       modalDescription = errorData?.message || "Sua carteira parece desconectada. Por favor, conecte-a e tente novamente.";
       break;
    default:
      modalDescription = errorData?.message || modalDescription;
      break;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center justify-between">
            {modalTitle}
            <button 
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
            >
              {showDebugInfo ? 'Ocultar Debug' : 'Ver Detalhes'}
            </button>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {modalDescription}
            {errorType === WalletConsistencyErrorType.NetworkMismatch && (
              <div className="mt-3 p-3 rounded-md bg-amber-100 border border-amber-300 text-amber-800 text-sm">
                Caso exista mais de uma carteira conectada no seu navegador e alguma delas esteja em outra rede, desconecte ou conecte todas na mesma rede que está sendo solicitada. Pode estar acontecendo algum conflito de chain entre carteiras diferentes.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {showDebugInfo && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs font-mono space-y-2 max-h-64 overflow-y-auto">
            <h4 className="font-bold text-sm mb-2">🔍 Informações de Debug:</h4>
            
            <div><strong>Tipo do Erro:</strong> {errorType}</div>
            <div><strong>Timestamp:</strong> {debugInfo.timestamp}</div>
            
            <div className="mt-3">
              <strong>🔐 Método de Autenticação:</strong>
              <div className="ml-2 mt-1 p-2 bg-blue-50 rounded border">
                <div><strong>Método:</strong> {debugInfo.authMethod}</div>
                <div><strong>Usar Embedded:</strong> {debugInfo.shouldUseEmbedded ? 'Sim' : 'Não'}</div>
                <div><strong>Estratégia:</strong> {debugInfo.shouldUseEmbedded ? 'Embedded Wallet (Privy)' : 'External Wallet'}</div>
              </div>
            </div>
            
            <div className="mt-3">
              <strong>🔗 Wallets Conectadas ({debugInfo.walletsCount}):</strong>
              {debugInfo.wallets.map((wallet, index) => (
                <div key={index} className="ml-2 mt-1 p-2 bg-white rounded border">
                  <div><strong>#{index + 1} Endereço:</strong> {wallet.address}</div>
                  <div><strong>Tipo:</strong> {wallet.walletClientType}</div>
                  <div><strong>Conector:</strong> {wallet.connectorType}</div>
                  <div><strong>Importada:</strong> {wallet.imported ? 'Sim' : 'Não'}</div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <strong>🎯 Wallet Ativa Selecionada (Baseada na Estratégia):</strong>
              {debugInfo.activeWallet ? (
                <div className="ml-2 mt-1 p-2 bg-blue-50 rounded border">
                  <div><strong>Endereço:</strong> {debugInfo.activeWallet.address}</div>
                  <div><strong>Tipo:</strong> {debugInfo.activeWallet.walletClientType}</div>
                  <div><strong>É Externa:</strong> {debugInfo.activeWallet.walletClientType !== 'privy' ? 'Sim' : 'Não'}</div>
                  <div><strong>Selecionada por:</strong> {debugInfo.shouldUseEmbedded ? 'Estratégia Embedded' : 'Estratégia Externa'}</div>
                </div>
              ) : (
                <div className="ml-2 text-red-600">Nenhuma wallet ativa encontrada</div>
              )}
            </div>

            <div className="mt-3">
              <strong>🌐 Informações de Rede:</strong>
              <div className="ml-2 mt-1 p-2 bg-green-50 rounded border">
                <div><strong>Chain ID Atual:</strong> {errorData?.currentChainId || 'N/A'}</div>
                <div><strong>Chain ID Esperado:</strong> {errorData?.correctChainId || 'N/A'}</div>
                <div><strong>Nome da Rede:</strong> {errorData?.correctChainName || 'N/A'}</div>
              </div>
            </div>

            <div className="mt-3">
              <strong>🔧 Ambiente:</strong>
              <div className="ml-2 mt-1 p-2 bg-yellow-50 rounded border">
                <div><strong>window.ethereum:</strong> {debugInfo.windowEthereum ? 'Disponível' : 'Não disponível'}</div>
                <div><strong>User Agent:</strong> {debugInfo.userAgent.slice(0, 100)}...</div>
              </div>
            </div>

            {errorData && (
              <div className="mt-3">
                <strong>📊 Dados do Erro:</strong>
                <pre className="ml-2 mt-1 p-2 bg-red-50 rounded border overflow-x-auto text-xs">
                  {JSON.stringify(errorData, null, 2)}
                </pre>
              </div>
            )}

            <button 
              onClick={() => {
                const debugText = `WALLET DEBUG INFO - ${debugInfo.timestamp}\n\n` +
                  `Erro: ${errorType}\n` +
                  `Wallets: ${debugInfo.walletsCount}\n` +
                  `Wallet Ativa: ${debugInfo.activeWallet?.address || 'N/A'} (${debugInfo.activeWallet?.walletClientType || 'N/A'})\n` +
                  `Chain Atual: ${errorData?.currentChainId || 'N/A'}\n` +
                  `Chain Esperado: ${errorData?.correctChainId || 'N/A'}\n` +
                  `window.ethereum: ${debugInfo.windowEthereum}\n\n` +
                  `Detalhes: ${JSON.stringify(debugInfo, null, 2)}`;
                
                navigator.clipboard.writeText(debugText);
                alert('Informações de debug copiadas para a área de transferência!');
              }}
              className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
            >
              📋 Copiar Debug Info
            </button>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Fechar</AlertDialogCancel>
          {actionButtons.length > 0 && actionButtons}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Função para forçar sincronização completa da wallet ativa com wagmi
 */
async function ensureWalletSync(
  selectedWallet: any, 
  setActiveWallet: any, 
  wagmiAccount: any,
  maxRetries = 5
): Promise<boolean> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await setActiveWallet(selectedWallet);
      
      const waitTime = 500 + (retries * 200);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      if (wagmiAccount.address?.toLowerCase() === selectedWallet.address?.toLowerCase()) {
        return true;
      }
      
      retries++;
      
    } catch (error) {
      retries++;
    }
  }
  
  return false;
}

/**
 * StakeModal Component - Handles token staking operations
 */
function StakeModal({ token, open, onClose }: { token: StakingToken | null; open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string | null>(null);
  const [showSociosModal, setShowSociosModal] = useState(false);
  const { wallets } = useWallets();
  const { shouldUseEmbedded, authMethod } = useWalletStrategy();
  const { ensureWalletIsConsistent } = useEnsureWalletConsistency();
  const { setActiveWallet } = useSetActiveWallet();
  const { checkChzBalance } = useChzBalanceCheck();
  const wagmiAccount = useAccount();
  const [errorModalState, setErrorModalState] = useState<Omit<ErrorActionsModalProps, 'onClose'>>({ isOpen: false, errorType: null, errorData: null });
  const { authProvider } = useUnifiedAuth();
  
  // Se for usuário Socios, mostrar modal específico imediatamente
  useEffect(() => {
    if (open && authProvider === 'socios' && token) {
      setShowSociosModal(true);
      return;
    }
  }, [open, authProvider, token]);

  // Auto-selecionar wallet quando modal abre baseado na estratégia de autenticação
  useEffect(() => {
    if (open && wallets.length > 0 && authProvider !== 'socios') {
      setAmount('');
      setErrorModalState({ isOpen: false, errorType: null, errorData: null });
      
      // Usar estratégia baseada no método de autenticação
      let defaultWallet;
      if (shouldUseEmbedded) {
        // Priorizar embedded wallet (privy)
        defaultWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
      } else {
        // Priorizar external wallet (não privy)
        defaultWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
      }
      setSelectedWalletAddress(defaultWallet.address);
    } else if (!open) {
      setSelectedWalletAddress(null);
    }
  }, [open, wallets, shouldUseEmbedded, authProvider]);
  
  const handleError = (errorResult: WalletConsistencyError | null) => {
    if (errorResult) {
      setErrorModalState({ 
        isOpen: true, 
        errorType: errorResult.type, 
        description: errorResult.message,
        errorData: errorResult.data 
      });
      setIsLoading(false);
    } else {
      setErrorModalState({ isOpen: false, errorType: null, errorData: null });
    }
  };

  const handleStake = async () => {
    if (!token) {
      return;
    }

    if (wallets.length === 0) {
      handleError({type: WalletConsistencyErrorType.Generic, message: 'Nenhuma carteira conectada. Por favor, conecte uma carteira primeiro.'});
      return;
    }

    if (!selectedWalletAddress) {
      handleError({type: WalletConsistencyErrorType.Generic, message: 'Por favor, selecione uma carteira para fazer o stake.'});
      return;
    }

    const activeWallet = wallets.find(w => w.address === selectedWalletAddress);

    if (!activeWallet) {
      handleError({type: WalletConsistencyErrorType.Generic, message: 'Carteira selecionada não encontrada. Tente selecionar outra carteira.'});
      return;
    }

    setIsLoading(true);

    // Sincronização da wallet (apenas para wallets externas)
    const isPrivyEmbedded = activeWallet.walletClientType === 'privy';
    
    if (!isPrivyEmbedded) {
      const walletSynced = await ensureWalletSync(activeWallet, setActiveWallet, wagmiAccount);
      
      if (!walletSynced) {
        handleError({
          type: WalletConsistencyErrorType.Generic, 
          message: `Falha ao sincronizar com a wallet ${activeWallet.walletClientType}. Tente novamente ou selecione outra carteira.`
        });
        setIsLoading(false);
        return;
      }
    }

    const chzCheckResult = await checkChzBalance(1, activeWallet);
    
    if (!chzCheckResult.hasMinimumChz) {
      handleError({
        type: WalletConsistencyErrorType.Generic, 
        message: chzCheckResult.message || 'Saldo CHZ insuficiente para pagar as taxas da rede.'
      });
      setIsLoading(false);
      return;
    }

    // Verificação de consistência (apenas para wallets externas)
    if (!isPrivyEmbedded) {
      const consistencyError = await ensureWalletIsConsistent(activeWallet.address);
      
      if (consistencyError) {
        handleError(consistencyError);
        return;
      }
    }

    handleError(null);

    try {
      const { createWalletClient, custom, createPublicClient, http } = await import('viem');
      
      const contractAddress = process.env.NEXT_PUBLIC_STAKE_CONTRACT;
      const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';

      if (!contractAddress || !rpcUrl) {
        handleError({type: WalletConsistencyErrorType.Generic, message: 'Configuração inválida: Endereço do contrato ou RPC não definido.'});
        setIsLoading(false);
        return;
      }

      const stakerAddress = activeWallet.address as `0x${string}`;
      const decimals = getTokenDecimals(token);
      const rawAmountInput = amount;
      
      if (isNaN(parseFloat(rawAmountInput)) || parseFloat(rawAmountInput) <= 0) {
        handleError({type: WalletConsistencyErrorType.Generic, message: 'Por favor, insira um valor válido para stake.'});
        setIsLoading(false);
        return;
      }
      const amountWei = BigInt(Math.floor(parseFloat(rawAmountInput) * (10 ** decimals)));

      let walletClient: any;
      
      if (isPrivyEmbedded) {
        try {
          const provider = await activeWallet.getEthereumProvider();
          walletClient = createWalletClient({ account: stakerAddress, chain: chiliz, transport: custom(provider) });
        } catch (providerError: any) {
          handleError({type: WalletConsistencyErrorType.Generic, message: `Erro ao conectar com carteira Privy: ${providerError.message || providerError}`});
          setIsLoading(false);
          return;
        }
      } else {
        if (typeof window !== 'undefined' && window.ethereum) {
          walletClient = createWalletClient({ account: stakerAddress, chain: chiliz, transport: custom(window.ethereum) });
        } else {
          handleError({type: WalletConsistencyErrorType.Generic, message: "Provedor de carteira externa não encontrado."});
         setIsLoading(false);
         return;
        }
      }
      
      const publicClient = createPublicClient({ chain: chiliz, transport: http(rpcUrl) });

      // Verificar se a carteira está na rede correta antes de prosseguir
      let currentChainId: number | undefined;
      try {
        currentChainId = await walletClient.getChainId();
      } catch (chainCheckError) {
        console.error("Erro ao verificar chain ID:", chainCheckError);
      }

      if (currentChainId && currentChainId !== chiliz.id) {
        handleError({
          type: WalletConsistencyErrorType.NetworkMismatch,
          message: `Sua carteira está conectada à rede errada (ID: ${currentChainId}). Por favor, mude para a rede Chiliz (ID: ${chiliz.id}).`,
          data: { 
            currentChainId, 
          correctChainId: chiliz.id,
          correctChainName: chiliz.name,
            currentAddress: activeWallet.address
          }
        });
        setIsLoading(false);
        return;
      }

      const isNative = token.address.toLowerCase() === '0x0000000000000000000000000000000000000000';
      const safeTokenAddress = token.address as `0x${string}`;

      if (!isNative) {
        try {
          const allowanceAbi = [{ "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }];
          const currentAllowance = await publicClient.readContract({
            address: safeTokenAddress, abi: allowanceAbi, functionName: 'allowance',
            args: [stakerAddress, contractAddress as `0x${string}`],
          }) as bigint;

          if (currentAllowance < amountWei) {
            const erc20ApproveAbi = [{ "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "nonpayable", "type": "function" }];
            const approvalAmount = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");
            
            const approveTxHash = await walletClient.writeContract({
              address: safeTokenAddress, abi: erc20ApproveAbi, functionName: 'approve',
              args: [contractAddress as `0x${string}`, approvalAmount], account: stakerAddress,
            });
            
            await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
          }
        } catch (approvalError: any) {
          let errorMsg = "Falha ao aprovar token: ";
          if (approvalError.shortMessage) errorMsg += approvalError.shortMessage;
          else if (approvalError.message) errorMsg += approvalError.message;
          handleError({type: WalletConsistencyErrorType.Generic, message: errorMsg});
          return;
        }
      }

      // Track stake initiated
      try {
        trackStakeInitiated({
          wallet: activeWallet.address,
          tokenSymbol: token.symbol,
          tokenAddress: token.address,
          amount: parseFloat(rawAmountInput),
        });
      } catch {}

      const stakeTxHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`, abi: stakingABI, functionName: 'stake',
        args: [amountWei, safeTokenAddress], account: stakerAddress,
      });
      
      await publicClient.waitForTransactionReceipt({ hash: stakeTxHash });
      try {
        trackStakeSuccessful({
          wallet: activeWallet.address,
          tokenSymbol: token.symbol,
          tokenAddress: token.address,
          amount: parseFloat(rawAmountInput),
          txHash: stakeTxHash,
        });
      } catch {}
      
      handleError(null);
      onClose();

    } catch (e: any) {
      let detailedErrorMessage = e.message || 'Erro ao fazer stake. Tente novamente.';
      if (e.cause && typeof e.cause.message === 'string') detailedErrorMessage = e.cause.message;
      else if (typeof e.shortMessage === 'string') detailedErrorMessage = e.shortMessage;
      
      if (detailedErrorMessage.toLowerCase().includes("insufficient funds")) detailedErrorMessage = "Fundos insuficientes para transação.";
      else if (detailedErrorMessage.toLowerCase().includes("user rejected")) detailedErrorMessage = "Transação rejeitada pelo usuário.";
      else if (detailedErrorMessage.toLowerCase().includes("network error")) detailedErrorMessage = "Erro de rede. Verifique sua conexão.";
      
      try {
        trackStakeFailed({
          wallet: selectedWalletAddress || undefined,
          tokenSymbol: token?.symbol || '',
          tokenAddress: token?.address || '',
          amount: amount ? parseFloat(amount) : undefined,
          error: detailedErrorMessage,
        });
      } catch {}
      handleError({type: WalletConsistencyErrorType.Generic, message: detailedErrorMessage});
    } finally {
      setIsLoading(false);
    }
  };

  // Se for usuário Socios, mostrar modal específico
  if (authProvider === 'socios') {
    return (
      <SociosStakeModal
        isOpen={showSociosModal}
        onClose={() => {
          setShowSociosModal(false);
          onClose();
        }}
        data={{
          nftTitle: `${token?.symbol || ''} Token`,
          requiredToken: token,
          requiredAmount: 1,
          tokenSymbol: token?.symbol || ''
        }}
      />
    );
  }

  if (!open || !token) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
          <div className="font-bold mb-4">Stake {token.symbol}</div>
          
          <WalletSelector
            selectedWalletAddress={selectedWalletAddress}
            onWalletSelect={setSelectedWalletAddress}
            className="mb-4"
          />
          
            <input
            type="number" min="0" step="any" value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
            placeholder={`Quantidade de ${token.symbol}`}
          />
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 rounded bg-primary text-white font-medium hover:bg-primary/90 transition"
                onClick={handleStake}
              disabled={isLoading || !amount || parseFloat(amount) <= 0 || !selectedWalletAddress}
              >
              {isLoading ? 'Aguarde...' : 'Confirmar'}
              </button>
              <button
                className="flex-1 px-4 py-2 rounded bg-muted text-muted-foreground font-medium"
                onClick={onClose}
                disabled={isLoading}
              >
              Cancelar
              </button>
            </div>
      </div>
    </div>
      <ErrorActionsModal 
        isOpen={errorModalState.isOpen}
        onClose={() => setErrorModalState({...errorModalState, isOpen: false})}
        errorType={errorModalState.errorType}
        errorData={errorModalState.errorData}
        description={errorModalState.description}
      />
    </>
  );
}

/**
 * UnstakeModal Component - Handles token unstaking operations
 */
function UnstakeModal({ token, open, onClose }: { token: StakingToken | null; open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string | null>(null);
  const [showSociosModal, setShowSociosModal] = useState(false);
  const { wallets } = useWallets();
  const { shouldUseEmbedded, authMethod } = useWalletStrategy();
  const { ensureWalletIsConsistent } = useEnsureWalletConsistency();
  const { setActiveWallet } = useSetActiveWallet();
  const { checkChzBalance } = useChzBalanceCheck();
  const wagmiAccount = useAccount();
  const [errorModalState, setErrorModalState] = useState<Omit<ErrorActionsModalProps, 'onClose'>>({ isOpen: false, errorType: null, errorData: null });
  const { authProvider } = useUnifiedAuth();
  
  // Se for usuário Socios, mostrar modal específico imediatamente
  useEffect(() => {
    if (open && authProvider === 'socios' && token) {
      setShowSociosModal(true);
      return;
    }
  }, [open, authProvider, token]);

  // Auto-selecionar wallet quando modal abre baseado na estratégia de autenticação
  useEffect(() => {
    if (open && wallets.length > 0 && authProvider !== 'socios') {
      setAmount('');
      setErrorModalState({ isOpen: false, errorType: null, errorData: null });
      
      // Usar estratégia baseada no método de autenticação
      let defaultWallet;
      if (shouldUseEmbedded) {
        // Priorizar embedded wallet (privy)
        defaultWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
      } else {
        // Priorizar external wallet (não privy)
        defaultWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
      }
      setSelectedWalletAddress(defaultWallet.address);
    } else if (!open) {
      setSelectedWalletAddress(null);
    }
  }, [open, wallets, shouldUseEmbedded, authProvider]);
  
  const handleError = (errorResult: WalletConsistencyError | null) => {
    if (errorResult) {
      setErrorModalState({ 
        isOpen: true, 
        errorType: errorResult.type, 
        description: errorResult.message, 
        errorData: errorResult.data 
      });
      setIsLoading(false);
    } else {
      setErrorModalState({ isOpen: false, errorType: null, errorData: null });
    }
  };

  const handleUnstake = async () => {
    if (!token) return;

    if (wallets.length === 0) {
      handleError({type: WalletConsistencyErrorType.Generic, message: 'Nenhuma carteira conectada.'});
      return;
    }

    if (!selectedWalletAddress) {
      handleError({type: WalletConsistencyErrorType.Generic, message: 'Por favor, selecione uma carteira para fazer o unstake.'});
      return;
    }

    const activeWallet = wallets.find(w => w.address === selectedWalletAddress);

    if (!activeWallet) {
      handleError({type: WalletConsistencyErrorType.Generic, message: 'Carteira selecionada não encontrada. Tente selecionar outra carteira.'});
      return;
    }

    setIsLoading(true);

    // Sincronização da wallet (apenas para wallets externas)
    const isPrivyEmbeddedUnstake = activeWallet.walletClientType === 'privy';
    
    if (!isPrivyEmbeddedUnstake) {
      const walletSynced = await ensureWalletSync(activeWallet, setActiveWallet, wagmiAccount);
      
      if (!walletSynced) {
        handleError({
          type: WalletConsistencyErrorType.Generic, 
          message: `Falha ao sincronizar com a wallet ${activeWallet.walletClientType}. Tente novamente ou selecione outra carteira.`
        });
        setIsLoading(false);
        return;
      }
    }

    const chzCheckResult = await checkChzBalance(1, activeWallet);
    if (!chzCheckResult.hasMinimumChz) {
      handleError({
        type: WalletConsistencyErrorType.Generic, 
        message: chzCheckResult.message || 'Saldo CHZ insuficiente para pagar as taxas da rede.'
      });
        setIsLoading(false);
        return;
      }
      
    // Verificação de consistência (apenas para wallets externas)
    if (!isPrivyEmbeddedUnstake) {
      const consistencyError = await ensureWalletIsConsistent(activeWallet.address);
      if (consistencyError) {
        handleError(consistencyError);
        return;
      }
    }
    
    setIsLoading(true);
    handleError(null);
    try {
      const { createWalletClient, custom, createPublicClient, http } = await import('viem');
      const contractAddress = process.env.NEXT_PUBLIC_STAKE_CONTRACT;
      const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';
      if (!contractAddress || !rpcUrl) {
        handleError({type: WalletConsistencyErrorType.Generic, message: 'Configuração inválida.'});
        setIsLoading(false); return;
      }
      const stakerAddress = activeWallet.address as `0x${string}`;
      const decimals = getTokenDecimals(token);
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        handleError({type: WalletConsistencyErrorType.Generic, message: 'Por favor, insira um valor válido para unstake.'});
         setIsLoading(false);
         return;
      }
      const amountWei = BigInt(Math.floor(parseFloat(amount) * (10 ** decimals)));
      const safeTokenAddress = token.address as `0x${string}`;
      let walletClient: any;
      if (isPrivyEmbeddedUnstake) {
        const provider = await activeWallet.getEthereumProvider();
        walletClient = createWalletClient({ account: stakerAddress, chain: chiliz, transport: custom(provider) });
      } else {
        if (typeof window !== 'undefined' && window.ethereum) {
          walletClient = createWalletClient({ account: stakerAddress, chain: chiliz, transport: custom(window.ethereum) });
        } else {
          handleError({type: WalletConsistencyErrorType.Generic, message: "Provedor de carteira externa não encontrado."});
          setIsLoading(false); return;
        }
      }
      const publicClient = createPublicClient({ chain: chiliz, transport: http(rpcUrl) });
      
      // Verificar se a carteira está na rede correta antes de prosseguir
      let currentChainId: number | undefined;
      try {
        currentChainId = await walletClient.getChainId();
      } catch (chainCheckError) {
        console.error("Erro ao verificar chain ID:", chainCheckError);
      }
      
      if (currentChainId && currentChainId !== chiliz.id) {
        handleError({
          type: WalletConsistencyErrorType.NetworkMismatch,
          message: `Sua carteira está conectada à rede errada (ID: ${currentChainId}). Por favor, mude para a rede Chiliz (ID: ${chiliz.id}).`,
          data: { 
            currentChainId, 
          correctChainId: chiliz.id,
          correctChainName: chiliz.name,
            currentAddress: activeWallet.address
          }
        });
        setIsLoading(false);
        return;
      }

      // Track unstake initiated
      try {
        trackUnstakeInitiated({
          wallet: activeWallet.address,
          tokenSymbol: token.symbol,
          tokenAddress: token.address,
          amount: parseFloat(amount),
        });
      } catch {}

      const unstakeTxHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`, abi: stakingABI, functionName: 'unstake',
        args: [amountWei, safeTokenAddress], account: stakerAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash: unstakeTxHash });
      try {
        trackUnstakeSuccessful({
          wallet: activeWallet.address,
          tokenSymbol: token.symbol,
          tokenAddress: token.address,
          amount: parseFloat(amount),
          txHash: unstakeTxHash,
        });
      } catch {}
      handleError(null);
      onClose();
    } catch (e: any) {
      let detailedErrorMessage = e.message || 'Erro ao fazer unstake.';
      if (e.cause && typeof e.cause.message === 'string') detailedErrorMessage = e.cause.message;
      else if (typeof e.shortMessage === 'string') detailedErrorMessage = e.shortMessage;
      if (detailedErrorMessage.toLowerCase().includes("insufficient funds")) detailedErrorMessage = "Fundos insuficientes.";
      else if (detailedErrorMessage.toLowerCase().includes("user rejected")) detailedErrorMessage = "Transação rejeitada.";
      else if (detailedErrorMessage.toLowerCase().includes("network error")) detailedErrorMessage = "Erro de rede.";
      else if (detailedErrorMessage.toLowerCase().includes("amount exceeds staked balance") || detailedErrorMessage.toLowerCase().includes("unstake amount exceeds balance")) detailedErrorMessage = "Valor de unstake excede o saldo em stake.";
      try {
        trackUnstakeFailed({
          wallet: selectedWalletAddress || undefined,
          tokenSymbol: token?.symbol || '',
          tokenAddress: token?.address || '',
          amount: amount ? parseFloat(amount) : undefined,
          error: detailedErrorMessage,
        });
      } catch {}
      handleError({type: WalletConsistencyErrorType.Generic, message: detailedErrorMessage});
    } finally {
      setIsLoading(false);
    }
  };

  // Se for usuário Socios, mostrar modal específico
  if (authProvider === 'socios') {
    return (
      <SociosUnstakeModal
        isOpen={showSociosModal}
        onClose={() => {
          setShowSociosModal(false);
          onClose();
        }}
        data={{
          tokenSymbol: token?.symbol || '',
          tokenName: token?.name || '',
          requiredToken: token
        }}
      />
    );
  }

  if (!open || !token) return null;
  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
          <div className="font-bold mb-4">Unstake {token.symbol}</div>
          
          <WalletSelector
            selectedWalletAddress={selectedWalletAddress}
            onWalletSelect={setSelectedWalletAddress}
            className="mb-4"
          />
          
          <input type="number" min="0" step="any" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border rounded px-3 py-2 mb-4" placeholder={`Quantidade de ${token.symbol}`} />
          <p className="text-sm text-gray-500 mb-4">Ao fazer unstake, seus tokens entrarão em um período de cooldown antes de ficarem disponíveis para saque.</p>
            <div className="flex gap-2">
            <button className="flex-1 px-4 py-2 rounded bg-primary text-white font-medium hover:bg-primary/90 transition" onClick={handleUnstake} disabled={isLoading || !amount || parseFloat(amount) <= 0 || !selectedWalletAddress}>{isLoading ? 'Aguarde...' : 'Confirmar'}</button>
            <button className="flex-1 px-4 py-2 rounded bg-muted text-muted-foreground font-medium" onClick={onClose} disabled={isLoading}>Cancelar</button>
            </div>
      </div>
    </div>
      <ErrorActionsModal isOpen={errorModalState.isOpen} onClose={() => setErrorModalState({...errorModalState, isOpen: false})} errorType={errorModalState.errorType} errorData={errorModalState.errorData} description={errorModalState.description} />
    </>
  );
}

/**
 * TokenGrid Component - Main component displaying available tokens
 */
interface TokenGridProps {
  onLoadingStateChange?: (isReady: boolean) => void;
}

export function TokenGrid({ onLoadingStateChange }: TokenGridProps) {
  const [selectedStakeToken, setSelectedStakeToken] = useState<StakingToken | null>(null);
  const [selectedUnstakeToken, setSelectedUnstakeToken] = useState<StakingToken | null>(null);
  const [selectedClaimToken, setSelectedClaimToken] = useState<StakingToken | null>(null);
  const [showZeroBalanceModal, setShowZeroBalanceModal] = useState(false);
  const [zeroBalanceToken, setZeroBalanceToken] = useState<StakingToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [stakingTokens, setStakingTokens] = useState<StakingToken[]>([]);
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [stakedAmounts, setStakedAmounts] = useState<Record<string, string>>({});
  const [isLoadingStakes, setIsLoadingStakes] = useState(true);
  const [claimableAmounts, setClaimableAmounts] = useState<Record<string, string>>({});
  const [isLoadingClaimable, setIsLoadingClaimable] = useState(true);
  const [pendingCooldownAmounts, setPendingCooldownAmounts] = useState<Record<string, string>>({});
  const [unstakeCooldownPeriod, setUnstakeCooldownPeriod] = useState<string | null>(null);
  const [isCooldownLoading, setIsCooldownLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const { authenticated, authProvider } = useUnifiedAuth();
  const { wallets } = useWallets();
  const { shouldUseEmbedded } = useWalletStrategy();

  // Global failsafe timeout - garantir que loading não fique travado para sempre
  useEffect(() => {
    const failsafeTimer = setTimeout(() => {
      console.log('[TokenGrid] FAILSAFE TIMEOUT ACTIVATED - Forcing all loading states to false');
      if (isLoadingTokens) {
        console.log('[TokenGrid] Forcing isLoadingTokens = false');
        setIsLoadingTokens(false);
      }
      if (isLoadingBalances) {
        console.log('[TokenGrid] Forcing isLoadingBalances = false');
        setIsLoadingBalances(false);
      }
      if (isLoadingStakes) {
        console.log('[TokenGrid] Forcing isLoadingStakes = false');
        setIsLoadingStakes(false);
      }
      if (isLoadingClaimable) {
        console.log('[TokenGrid] Forcing isLoadingClaimable = false');
        setIsLoadingClaimable(false);
      }
      if (isCooldownLoading) {
        console.log('[TokenGrid] Forcing isCooldownLoading = false');
        setIsCooldownLoading(false);
      }
    }, 30000); // 30 segundos de timeout global

    return () => clearTimeout(failsafeTimer);
  }, [isLoadingTokens, isLoadingBalances, isLoadingStakes, isLoadingClaimable, isCooldownLoading]);

  // Fetch staking tokens from API
  useEffect(() => {
    const fetchStakingTokens = async () => {
      setIsLoadingTokens(true);
      console.log('[TokenGrid] Starting to fetch staking tokens...');
      
      // Implementar timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('[TokenGrid] Fetch tokens timeout after 15s');
      }, 15000);
      
      try {
        const response = await fetch('/api/staking-tokens', {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch staking tokens');
        }
        const data = await response.json();
        
        // Filtrar CHZ no frontend como segurança adicional - CHZ nunca deve ser opção de stake
        const filteredTokens = (data as StakingToken[]).filter(token => 
          token.symbol && token.symbol.toUpperCase() !== 'CHZ'
        );
        
        console.log(`[TokenGrid] Fetched ${filteredTokens.length} tokens successfully`);
        setStakingTokens(filteredTokens);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error("[TokenGrid] Fetch tokens aborted due to timeout");
          setGlobalError("Timeout ao carregar tokens. Tente novamente.");
        } else {
          console.error("[TokenGrid] Error fetching staking tokens:", error);
          setGlobalError("Falha ao carregar tokens disponíveis. Tente novamente mais tarde.");
        }
        setStakingTokens([]);
      } finally {
        clearTimeout(timeoutId);
        setIsLoadingTokens(false);
      }
    };
    fetchStakingTokens();
  }, []);
    
  // Combinar isLoading principal com isLoadingTokens e notificar o parent
  useEffect(() => {
    const isCurrentlyLoading = isLoadingTokens || isLoadingBalances || isLoadingStakes || isLoadingClaimable || isCooldownLoading;
    
    console.log('[TokenGrid] Loading states:', {
      isLoadingTokens,
      isLoadingBalances,
      isLoadingStakes,
      isLoadingClaimable,
      isCooldownLoading,
      isCurrentlyLoading,
      authenticated
    });
    
    setIsLoading(isCurrentlyLoading);
    
    // Notificar o parent sobre o estado de loading
    if (authenticated) {
      onLoadingStateChange?.(!isCurrentlyLoading);
    } else {
      onLoadingStateChange?.(true); // Consider ready when not authenticated
    }
  }, [isLoadingTokens, isLoadingBalances, isLoadingStakes, isLoadingClaimable, isCooldownLoading, authenticated, onLoadingStateChange]);

  // Fetch cooldown period
  useEffect(() => {
    const fetchCooldown = async () => {
      console.log('[TokenGrid] Starting to fetch cooldown period...');
      const contractAddress = process.env.NEXT_PUBLIC_STAKE_CONTRACT;
      if (!contractAddress) {
        console.log('[TokenGrid] No stake contract address found');
        setUnstakeCooldownPeriod(null);
        setIsCooldownLoading(false);
        return;
      }
      
      // Implementar timeout
      const timeoutId = setTimeout(() => {
        console.log('[TokenGrid] Cooldown fetch timeout after 10s');
        setUnstakeCooldownPeriod(null);
        setIsCooldownLoading(false);
      }, 10000);
      
      try {
        setIsCooldownLoading(true);
        const period = await getUnstakeCooldownPeriod(contractAddress);
        
        if (period && period !== 'Error' && !isNaN(Number(period))){
            const periodInSeconds = parseInt(period, 10);
            const days = Math.floor(periodInSeconds / (3600 * 24));
            const hours = Math.floor((periodInSeconds % (3600 * 24)) / 3600);
            const minutes = Math.floor((periodInSeconds % 3600) / 60);
            let formattedPeriod = '';
            if (days > 0) formattedPeriod += `${days} dias `;
            if (hours > 0) formattedPeriod += `${hours}h `;
            if (minutes > 0) formattedPeriod += `${minutes}m`;
            if(formattedPeriod.trim() === '') formattedPeriod = `${periodInSeconds}s`;

            console.log(`[TokenGrid] Cooldown period: ${formattedPeriod.trim()}`);
            setUnstakeCooldownPeriod(formattedPeriod.trim());
        } else {
            console.log('[TokenGrid] Invalid cooldown period received');
            setUnstakeCooldownPeriod(null);
        }
      } catch (err) {
        console.error('[TokenGrid] Error fetching cooldown:', err);
        setUnstakeCooldownPeriod(null);
      } finally {
        clearTimeout(timeoutId);
        setIsCooldownLoading(false);
      }
    };
    fetchCooldown();
  }, []);

  // Get staked amounts and claimable amounts
  useEffect(() => {
    if (!authenticated || wallets.length === 0) {
      console.log('[TokenGrid] No auth/wallets, skipping stakes fetch');
      setIsLoadingStakes(false);
      setIsLoadingClaimable(false);
      return;
    }

    console.log('[TokenGrid] Starting to fetch stakes and claimable amounts...');
    setIsLoadingStakes(true);
    setIsLoadingClaimable(true);
    const contractAddress = process.env.NEXT_PUBLIC_STAKE_CONTRACT;
    
    // Usar estratégia baseada no método de autenticação
    let activeWallet;
    if (shouldUseEmbedded) {
      // Priorizar embedded wallet (privy) para email/social login
      activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
    } else {
      // Priorizar external wallet (não privy) para login via carteira externa
      activeWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
    }
    const staker = activeWallet?.address;

    if (!contractAddress || !staker) {
      console.log('[TokenGrid] Missing contract or staker address');
      setIsLoadingStakes(false);
      setIsLoadingClaimable(false);
      return;
    }

    // Implementar timeout
    const timeoutId = setTimeout(() => {
      console.log('[TokenGrid] Stakes/claimable fetch timeout after 20s');
      setIsLoadingStakes(false);
      setIsLoadingClaimable(false);
    }, 20000);

    const fetchAmounts = async () => {
      try {
        const newStakedAmounts: Record<string, string> = {};
        const newClaimableAmounts: Record<string, string> = {};
        const newPendingCooldown: Record<string, string> = {};

        console.log(`[TokenGrid] Fetching amounts for ${stakingTokens.length} tokens`);
        
        // Usar Promise.all com timeout individual por token
        await Promise.all(stakingTokens.map(async (token) => {
          try {
            // Timeout individual de 5s por token
            const tokenTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Token fetch timeout')), 5000)
            );
            
            const fetchPromises = Promise.all([
              getStakedAmount(staker, token.address, contractAddress),
              getClaimableAmount(staker, token.address, contractAddress),
              getPendingUnstakeAmount(staker, token.address, contractAddress),
            ]);
            
            const [stakedAmountRaw, claimableAmountRaw, pendingCooldownRaw] = await Promise.race([
              fetchPromises,
              tokenTimeout
            ]) as [string, bigint, bigint];
            
            newStakedAmounts[token.id] = stakedAmountRaw;
            
            const decimals = getTokenDecimals(token);
            const formattedClaimable = (Number(claimableAmountRaw) / (10 ** decimals)).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
            newClaimableAmounts[token.id] = formattedClaimable;

            const formattedPending = (Number(pendingCooldownRaw) / (10 ** decimals)).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
            newPendingCooldown[token.id] = formattedPending;

          } catch (error) {
            console.error(`[TokenGrid] Error fetching amounts for ${token.symbol}:`, error);
            newStakedAmounts[token.id] = '0';
            newClaimableAmounts[token.id] = '0';
          }
        }));

        setStakedAmounts(newStakedAmounts);
        setClaimableAmounts(newClaimableAmounts);
        setPendingCooldownAmounts(newPendingCooldown);
      } catch (error) {
        console.error('[TokenGrid] Critical error fetching amounts:', error);
      } finally {
        clearTimeout(timeoutId);
        setIsLoadingStakes(false);
        setIsLoadingClaimable(false);
      }
    };

    fetchAmounts();
  }, [authenticated, wallets, refreshTrigger, stakingTokens, shouldUseEmbedded]);

  // Get wallet balances
  useEffect(() => {
    if (!authenticated || wallets.length === 0) {
      console.log('[TokenGrid] No auth/wallets, skipping balances fetch');
      setTokenBalances({});
      setIsLoadingBalances(false);
      return;
    }

    console.log('[TokenGrid] Starting to fetch wallet balances...');
    // Usar estratégia baseada no método de autenticação
    let activeWallet;
    if (shouldUseEmbedded) {
      // Priorizar embedded wallet (privy) para email/social login
      activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
    } else {
      // Priorizar external wallet (não privy) para login via carteira externa
      activeWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
    }
    
    setIsLoadingBalances(true);

    // Implementar timeout
    const timeoutId = setTimeout(() => {
      console.log('[TokenGrid] Balances fetch timeout after 20s');
      setIsLoadingBalances(false);
    }, 20000);

    const fetchWalletBalances = async () => {
      try {
        if (!activeWallet?.address) {
          console.log('[TokenGrid] No active wallet address');
          setIsLoadingBalances(false);
          return;
        }

        const balances: Record<string, string> = {};
        const { createPublicClient, http } = await import('viem');
        const { chiliz } = await import('@/lib/chains');
        const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';

        if (!rpcUrl) {
          console.log('[TokenGrid] No RPC URL configured');
          stakingTokens.forEach(token => balances[token.id] = 'Error');
          setTokenBalances(balances);
          setIsLoadingBalances(false);
          return;
        }
        
        const publicClientForBalances = createPublicClient({ chain: chiliz, transport: http(rpcUrl) });

        console.log(`[TokenGrid] Fetching balances for ${stakingTokens.length} tokens`);
        
        // Usar Promise.all com timeout individual por token
        await Promise.all(stakingTokens.map(async (token) => {
          try {
            // Timeout individual de 5s por token
            const tokenTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Balance fetch timeout')), 5000)
            );
            
            const fetchBalance = async () => {
              if (token.address.toLowerCase() === '0x0000000000000000000000000000000000000000') {
                const balanceWei = await publicClientForBalances.getBalance({ address: activeWallet.address as `0x${string}` });
                const nativeBalanceValue = (Number(balanceWei) / (10 ** 18));
                return nativeBalanceValue.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
              } else {
                const rawBalance = await publicClientForBalances.readContract({
                  address: token.address as `0x${string}`,
                  abi: [
                    { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "type": "function" },
                  ],
                  functionName: 'balanceOf',
                  args: [activeWallet.address as `0x${string}`]
                });
                const tokenDecimals = getTokenDecimals(token);
                const value = Number(rawBalance) / (10 ** tokenDecimals);
                return value.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
              }
            };
            
            const balance = await Promise.race([
              fetchBalance(),
              tokenTimeout
            ]) as string;
            
            balances[token.id] = balance;
          } catch (error) {
            console.error(`[TokenGrid] Error fetching balance for ${token.symbol}:`, error);
            balances[token.id] = '0';
          }
        }));

        setTokenBalances(balances);
      } catch (error) {
        console.error('[TokenGrid] Critical error fetching balances:', error);
      } finally {
        clearTimeout(timeoutId);
        setIsLoadingBalances(false);
      }
    };

    fetchWalletBalances();
  }, [authenticated, wallets, refreshTrigger, stakingTokens, shouldUseEmbedded]);

  // Token action handlers
  const handleStakeToken = (token: StakingToken) => {
    const balance = tokenBalances[token.id] || '0';
    const numericBalance = parseFloat(balance.replace(/[^\d.,]/g, '').replace(',', '.'));
    
    if (numericBalance === 0) {
      setZeroBalanceToken(token);
      setShowZeroBalanceModal(true);
    } else {
      setSelectedStakeToken(token);
    }
  };

  const handleUnstakeToken = (token: StakingToken) => {
    setSelectedUnstakeToken(token);
  };

  const handleClaimToken = (token: StakingToken) => {
    setSelectedClaimToken(token);
  };

  return (
    <>
      {/* Retry button for error cases */}
      {!isLoading && 
        (Object.keys(tokenBalances).length === 0 || 
         Object.keys(stakedAmounts).length === 0 || 
         unstakeCooldownPeriod === null
        ) && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-amber-800 mb-2">An error occurred while loading token data or cooldown period.</p>
          <button 
            onClick={() => {
              setIsLoadingBalances(true);
              setIsLoadingStakes(true);
              setIsLoadingClaimable(true);
              setIsCooldownLoading(true);
              setRefreshTrigger(prev => prev + 1);
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition"
          >
            Try again
          </button>
        </div>
      )}
      
      {/* Display Cooldown Period */}
      {isCooldownLoading ? (
        <p className="text-sm text-gray-500 mb-4 animate-pulse">Loading cooldown period...</p>
      ) : unstakeCooldownPeriod !== null ? (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-center">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Período de Cooldown do Unstake:</span> {unstakeCooldownPeriod}
          </p>
        </div>
      ) : null}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {isLoading || stakingTokens.length === 0 ? (
          // Show skeleton cards while loading OR when no tokens are available yet
          <>
            {Array(stakingTokens.length > 0 ? stakingTokens.length : 3).fill(0).map((_, index) => (
              <TokenCardSkeleton key={index} />
            ))}
          </>
        ) : (
          // Show actual token cards ONLY when ALL data is loaded
          stakingTokens.map(token => {
            const hasBalance = tokenBalances[token.id] !== undefined;
            const hasStakedAmount = stakedAmounts[token.id] !== undefined;
            const hasClaimableAmount = claimableAmounts[token.id] !== undefined;
            
            // Only show the card if we have all the data, otherwise show skeleton
            if (!hasBalance || !hasStakedAmount || !hasClaimableAmount) {
              return <TokenCardSkeleton key={token.id} />;
            }
            
            return (
              <TokenCard
                key={token.id}
                token={token}
                balance={tokenBalances[token.id]}
                stakedAmount={stakedAmounts[token.id]}
                claimableAmount={claimableAmounts[token.id]}
                pendingCooldownAmount={pendingCooldownAmounts[token.id]}
                onStake={() => handleStakeToken(token)}
                onUnstake={() => handleUnstakeToken(token)}
                onClaim={() => handleClaimToken(token)}
              />
            );
          })
        )}
      </div>

      {/* Modals */}
      <StakeModal
        token={selectedStakeToken}
        open={!!selectedStakeToken}
        onClose={() => {
          setSelectedStakeToken(null);
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      <UnstakeModal
        token={selectedUnstakeToken}
        open={!!selectedUnstakeToken}
        onClose={() => {
          setSelectedUnstakeToken(null);
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* ClaimModal */}
      <ClaimModal
        token={selectedClaimToken}
        claimableAmountProp={selectedClaimToken ? claimableAmounts[selectedClaimToken.id] || '0' : '0'}
        open={!!selectedClaimToken}
        onClose={() => {
          setSelectedClaimToken(null);
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* Zero Balance Modal */}
      <ZeroBalanceModal
        isOpen={showZeroBalanceModal}
        onClose={() => {
          setShowZeroBalanceModal(false);
          setZeroBalanceToken(null);
        }}
        tokenSymbol={zeroBalanceToken?.symbol || ''}
        tokenName={zeroBalanceToken?.name}
      />
    </>
  );
}

/**
 * ClaimModal Component - Handles token claiming operations
 */
function ClaimModal({ 
  token, 
  open, 
  onClose, 
  claimableAmountProp 
}: { 
  token: StakingToken | null; 
  open: boolean; 
  onClose: () => void; 
  claimableAmountProp: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { shouldUseEmbedded, authMethod } = useWalletStrategy();
  const { ensureWalletIsConsistent } = useEnsureWalletConsistency();
  const { setActiveWallet } = useSetActiveWallet();
  const { checkChzBalance } = useChzBalanceCheck();
  const wagmiAccount = useAccount();
  const [errorModalState, setErrorModalState] = useState<Omit<ErrorActionsModalProps, 'onClose'>>({ isOpen: false, errorType: null, errorData: null });

  // Auto-selecionar wallet quando modal abre baseado na estratégia de autenticação
  useEffect(() => {
    if (open && wallets.length > 0) {
      setErrorModalState({ isOpen: false, errorType: null, errorData: null });
      
      // Usar estratégia baseada no método de autenticação
      let defaultWallet;
      if (shouldUseEmbedded) {
        // Priorizar embedded wallet (privy)
        defaultWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
      } else {
        // Priorizar external wallet (não privy)
        defaultWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
      }
      setSelectedWalletAddress(defaultWallet.address);
    } else if (!open) {
      setSelectedWalletAddress(null);
    }
  }, [open, wallets, shouldUseEmbedded]);

  const handleError = (errorResult: WalletConsistencyError | null) => {
    if (errorResult) {
      setErrorModalState({ isOpen: true, errorType: errorResult.type, description: errorResult.message, errorData: errorResult.data });
      setIsLoading(false);
      } else {
      setErrorModalState({ isOpen: false, errorType: null, errorData: null });
    }
  };

  const handleClaim = async () => {
    if (!token) return;
    if (wallets.length === 0) {
      handleError({type: WalletConsistencyErrorType.Generic, message: 'Nenhuma carteira conectada.'});
      return;
    }

    if (!selectedWalletAddress) {
      handleError({type: WalletConsistencyErrorType.Generic, message: 'Por favor, selecione uma carteira para fazer o claim.'});
      return;
    }

    const activeWallet = wallets.find(w => w.address === selectedWalletAddress);

    if (!activeWallet) {
      handleError({type: WalletConsistencyErrorType.Generic, message: 'Carteira selecionada não encontrada. Tente selecionar outra carteira.'});
      return;
    }
    
    setIsLoading(true);

    // Sincronização da wallet (apenas para wallets externas)
    const isPrivyEmbeddedClaim = activeWallet.walletClientType === 'privy';
    
    if (!isPrivyEmbeddedClaim) {
      const walletSynced = await ensureWalletSync(activeWallet, setActiveWallet, wagmiAccount);
      
      if (!walletSynced) {
        handleError({
          type: WalletConsistencyErrorType.Generic, 
          message: `Falha ao sincronizar com a wallet ${activeWallet.walletClientType}. Tente novamente ou selecione outra carteira.`
        });
        setIsLoading(false);
        return;
      }
    }

    const chzCheckResult = await checkChzBalance(1, activeWallet);
    if (!chzCheckResult.hasMinimumChz) {
      handleError({
        type: WalletConsistencyErrorType.Generic, 
        message: chzCheckResult.message || 'Saldo CHZ insuficiente para pagar as taxas da rede.'
      });
        setIsLoading(false);
        return;
      }

    // Verificação de consistência (apenas para wallets externas)
    if (!isPrivyEmbeddedClaim) {
      const consistencyError = await ensureWalletIsConsistent(activeWallet.address);
      if (consistencyError) {
        handleError(consistencyError);
        return;
      }
    }
    
    handleError(null);
    try {
      const { createWalletClient, custom, createPublicClient, http } = await import('viem');
      const contractAddress = process.env.NEXT_PUBLIC_STAKE_CONTRACT;
      const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';
      if (!contractAddress || !rpcUrl) {
        handleError({type: WalletConsistencyErrorType.Generic, message: 'Configuração inválida.'});
        setIsLoading(false); return;
      }
      const stakerAddress = activeWallet.address as `0x${string}`;
      const tokenToClaimAddress = token.address as `0x${string}`;
      let walletClient: any;
      if (isPrivyEmbeddedClaim) {
        const provider = await activeWallet.getEthereumProvider();
        walletClient = createWalletClient({ account: stakerAddress, chain: chiliz, transport: custom(provider) });
      } else {
        if (typeof window !== 'undefined' && window.ethereum) {
          walletClient = createWalletClient({ account: stakerAddress, chain: chiliz, transport: custom(window.ethereum) });
        } else {
          handleError({type: WalletConsistencyErrorType.Generic, message: "Provedor de carteira externa não encontrado."});
          setIsLoading(false); return;
        }
      }
      const publicClient = createPublicClient({ chain: chiliz, transport: http(rpcUrl) });

      // Verificar se a carteira está na rede correta antes de prosseguir
      let currentChainId: number | undefined;
      try {
        currentChainId = await walletClient.getChainId();
      } catch (chainCheckError) {
        console.error("Erro ao verificar chain ID:", chainCheckError);
      }

      if (currentChainId && currentChainId !== chiliz.id) {
        handleError({
          type: WalletConsistencyErrorType.NetworkMismatch,
          message: `Sua carteira está conectada à rede errada (ID: ${currentChainId}). Por favor, mude para a rede Chiliz (ID: ${chiliz.id}).`,
          data: { 
          currentChainId,
          correctChainId: chiliz.id,
          correctChainName: chiliz.name,
            currentAddress: activeWallet.address
          }
        });
        setIsLoading(false);
        return;
      }

      // Track claim initiated
      try {
        trackClaimInitiated({
          wallet: activeWallet.address,
          tokenSymbol: token.symbol,
          tokenAddress: token.address,
          amount: claimableAmountProp ? parseFloat(claimableAmountProp) : undefined,
        });
      } catch {}

      let claimTxHash;
      try {
        claimTxHash = await walletClient.writeContract({
          address: contractAddress as `0x${string}`, abi: stakingABI, functionName: 'claim',
          args: [tokenToClaimAddress], account: stakerAddress,
        });
      } catch (errorOuter: any) {
        try {
            claimTxHash = await walletClient.writeContract({
            address: contractAddress as `0x${string}`, abi: stakingABI, functionName: 'claim',
            args: [stakerAddress, tokenToClaimAddress], account: stakerAddress,
          });
        } catch (errorInner: any) { throw errorInner; }
      }
      await publicClient.waitForTransactionReceipt({ hash: claimTxHash });
      try {
        trackClaimSuccessful({
          wallet: activeWallet.address,
          tokenSymbol: token.symbol,
          tokenAddress: token.address,
          amount: claimableAmountProp ? parseFloat(claimableAmountProp) : undefined,
          txHash: claimTxHash,
        });
      } catch {}
      handleError(null);
      onClose();
    } catch (e: any) {
      let detailedErrorMessage = e.message || e.shortMessage || 'Erro ao resgatar.';
      if (detailedErrorMessage.toLowerCase().includes("nothing to claim")) detailedErrorMessage = "Nada a resgatar para este token.";
      else if (detailedErrorMessage.toLowerCase().includes("user rejected")) detailedErrorMessage = "Transação rejeitada.";
      try {
        trackClaimFailed({
          wallet: selectedWalletAddress || undefined,
          tokenSymbol: token?.symbol,
          tokenAddress: token?.address,
          amount: claimableAmountProp ? parseFloat(claimableAmountProp) : undefined,
          error: detailedErrorMessage,
        });
      } catch {}
      handleError({type: WalletConsistencyErrorType.Generic, message: detailedErrorMessage});
    } finally {
      setIsLoading(false);
    }
  };

  if (!open || !token) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-lg p-6 w-full max-w-sm">
          <div className="font-bold mb-4">Resgatar {token.symbol}</div>
          
          <WalletSelector
            selectedWalletAddress={selectedWalletAddress}
            onWalletSelect={setSelectedWalletAddress}
            className="mb-4"
          />
          
          <p className="text-sm text-gray-600 mb-4">Você está prestes a resgatar aproximadamente <span className="font-semibold">{claimableAmountProp} {token.symbol}</span>.</p>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 px-4 py-2 rounded bg-green-500 text-white font-medium hover:bg-green-600 transition disabled:bg-gray-300" onClick={handleClaim} disabled={isLoading || !selectedWalletAddress}>{isLoading ? 'Resgatando...' : 'Confirmar Resgate'}</button>
            <button className="flex-1 px-4 py-2 rounded bg-muted text-muted-foreground font-medium" onClick={onClose} disabled={isLoading}>Cancelar</button>
          </div>
        </div>
      </div>
      <ErrorActionsModal isOpen={errorModalState.isOpen} onClose={() => setErrorModalState({...errorModalState, isOpen: false})} errorType={errorModalState.errorType} errorData={errorModalState.errorData} description={errorModalState.description} />
    </>
  );
}

/**
 * WalletSelector Component - Permite escolher qual wallet usar
 */
interface WalletSelectorProps {
  selectedWalletAddress: string | null;
  onWalletSelect: (address: string) => void;
  className?: string;
}

function WalletSelector({ selectedWalletAddress, onWalletSelect, className }: WalletSelectorProps) {
  const { wallets, ready } = useWallets();

  if (!ready) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (wallets.length <= 1) {
    return null; // Não mostrar se só tem uma wallet
  }

  const formatWalletDisplay = (wallet: any) => {
    const address = wallet.address;
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    const isMetaMask = wallet.walletClientType === 'metamask';
    const isOKX = wallet.walletClientType === 'okx_wallet';
    const isRabby = wallet.walletClientType === 'rabby_wallet';
    const isEmbed = wallet.walletClientType === 'privy';
    
    let walletName = 'Externa';
    if (isMetaMask) walletName = 'MetaMask';
    else if (isOKX) walletName = 'OKX';
    else if (isRabby) walletName = 'Rabby';
    else if (isEmbed) walletName = 'Carteira do App';

    return { shortAddress, walletName, isEmbed };
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Selecionar Carteira para Transação:
      </label>
      <select
        value={selectedWalletAddress || ''}
        onChange={(e) => onWalletSelect(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
      >
        <option value="">Escolher carteira...</option>
        {wallets.map((wallet, index) => {
          const { shortAddress, walletName, isEmbed } = formatWalletDisplay(wallet);
          return (
            <option key={wallet.address} value={wallet.address}>
              {walletName} - {shortAddress} {index === 0 ? '(Recente)' : ''} {isEmbed ? '🔒' : '🔗'}
            </option>
          );
        })}
      </select>
      {selectedWalletAddress && (
        <p className="text-xs text-gray-500 mt-1">
          ✅ Wallet selecionada: {formatWalletDisplay(wallets.find(w => w.address === selectedWalletAddress)).shortAddress}
        </p>
      )}
    </div>
  );
}
