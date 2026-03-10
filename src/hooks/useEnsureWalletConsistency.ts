import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useWallets } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';

export enum WalletConsistencyErrorType {
  NotAuthenticated = 'NotAuthenticated',
  PrivyNotReady = 'PrivyNotReady',
  NoDesiredWallet = 'NoDesiredWallet',
  WagmiNotConnected = 'WagmiNotConnected',
  AddressMismatch = 'AddressMismatch',
  NetworkMismatch = 'NetworkMismatch',
  Generic = 'Generic'
}

export interface WalletConsistencyError {
  type: WalletConsistencyErrorType;
  message: string;
  data?: any;
}

export function useEnsureWalletConsistency() {
  const { authenticated } = useUnifiedAuth();
  const { wallets, ready: privyWalletsReady } = useWallets();
  const { address: wagmiCurrentAddress, chainId: wagmiCurrentChainId, isConnected: wagmiIsConnected } = useAccount();

  const ensureWalletIsConsistent = async (desiredWalletAddressForOperation?: string): Promise<WalletConsistencyError | null> => {
    if (!authenticated) {
      if (!wagmiIsConnected || !wagmiCurrentAddress) {
        return { type: WalletConsistencyErrorType.WagmiNotConnected, message: "Por favor, conecte sua carteira via MetaMask ou similar." };
      }
      const { chiliz } = await import('@/lib/chains');
      if (wagmiCurrentChainId !== chiliz.id) {
        return { 
          type: WalletConsistencyErrorType.NetworkMismatch, 
          message: `Sua carteira (${wagmiCurrentAddress.slice(0,6)}...) está na rede errada.`,
          data: { currentChainId: wagmiCurrentChainId, correctChainId: chiliz.id, correctChainName: chiliz.name }
        };
      }
      return null; // OK para não autenticado no Privy mas Wagmi OK
    }

    if (!privyWalletsReady) {
      return { type: WalletConsistencyErrorType.PrivyNotReady, message: "Serviço de carteira Privy não está pronto. Tente novamente em instantes." }; 
    }

    if (!desiredWalletAddressForOperation) {
      return { type: WalletConsistencyErrorType.NoDesiredWallet, message: "Erro interno: Nenhuma carteira foi selecionada para a operação." };
    }
    
    if (!wagmiIsConnected || !wagmiCurrentAddress) {
      return { type: WalletConsistencyErrorType.WagmiNotConnected, message: "Sua carteira parece desconectada. Tente reconectar ou atualizar a página." };
    }

    if (wagmiCurrentAddress.toLowerCase() !== desiredWalletAddressForOperation.toLowerCase()) {
      return { 
        type: WalletConsistencyErrorType.AddressMismatch,
        message: `A carteira ativa (${wagmiCurrentAddress.slice(0,6)}...) não é a esperada (${desiredWalletAddressForOperation.slice(0,6)}...).`,
        data: { currentAddress: wagmiCurrentAddress, desiredAddress: desiredWalletAddressForOperation }
      };
    }

    const { chiliz } = await import('@/lib/chains');
    if (wagmiCurrentChainId !== chiliz.id) {
      return { 
        type: WalletConsistencyErrorType.NetworkMismatch, 
        message: `Sua carteira (${wagmiCurrentAddress.slice(0,6)}...) está na rede errada.`,
        data: { currentAddress: wagmiCurrentAddress, currentChainId: wagmiCurrentChainId, correctChainId: chiliz.id, correctChainName: chiliz.name }
      };
    }

    return null; // Tudo OK
  };

  return { ensureWalletIsConsistent };
} 