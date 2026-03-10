import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useMemo } from 'react';

export enum AuthenticationMethod {
  EMAIL = 'email',
  SOCIAL = 'social', 
  EXTERNAL_WALLET = 'external_wallet',
  EMBEDDED_WALLET = 'embedded_wallet',
  UNKNOWN = 'unknown'
}

export interface AuthenticationInfo {
  method: AuthenticationMethod;
  isEmbeddedWallet: boolean;
  isExternalWallet: boolean;
  primaryAccount: string | null;
  linkedAccounts: string[];
  walletType: string | null;
  shouldUseEmbeddedWallet: boolean;
}

export function useAuthenticationMethod(): AuthenticationInfo {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();

  return useMemo(() => {
    if (!authenticated || !user) {
      return {
        method: AuthenticationMethod.UNKNOWN,
        isEmbeddedWallet: false,
        isExternalWallet: false,
        primaryAccount: null,
        linkedAccounts: [],
        walletType: null,
        shouldUseEmbeddedWallet: false
      };
    }

    // Analisar as contas vinculadas do usuário
    const linkedAccounts: string[] = [];
    let primaryAccount: string | null = null;
    let method = AuthenticationMethod.UNKNOWN;

    // Verificar se tem email vinculado
    if (user.email?.address) {
      linkedAccounts.push('email');
      if (!primaryAccount) {
        primaryAccount = 'email';
        method = AuthenticationMethod.EMAIL;
      }
    }

    // Verificar se tem telefone vinculado
    if (user.phone?.number) {
      linkedAccounts.push('phone');
      if (!primaryAccount) {
        primaryAccount = 'phone';
        method = AuthenticationMethod.EMAIL; // Tratamos phone como método similar ao email
      }
    }

    // Verificar contas sociais vinculadas
    const socialAccounts = [
      user.google?.email && 'google',
      user.twitter?.username && 'twitter', 
      user.discord?.username && 'discord',
      user.github?.username && 'github',
      user.linkedin?.email && 'linkedin',
      user.spotify?.email && 'spotify',
      user.instagram?.username && 'instagram',
      user.tiktok?.username && 'tiktok',
      user.farcaster?.username && 'farcaster',
      user.telegram?.username && 'telegram',
      user.apple?.email && 'apple'
    ].filter(Boolean) as string[];

    linkedAccounts.push(...socialAccounts);

    if (socialAccounts.length > 0 && !primaryAccount) {
      primaryAccount = socialAccounts[0];
      method = AuthenticationMethod.SOCIAL;
    }

    // Verificar carteiras vinculadas
    if (user.wallet?.address) {
      linkedAccounts.push('wallet');
    }

    // Encontrar a carteira ativa
    const activeWallet = wallets.find(wallet => wallet.address === user.wallet?.address);
    const walletType = activeWallet?.walletClientType || null;

    // Determinar se é embedded wallet ou external wallet
    const isEmbeddedWallet = walletType === 'privy';
    const isExternalWallet = walletType && walletType !== 'privy';

    // Se o usuário se conectou diretamente com uma carteira externa
    if (isExternalWallet && !user.email?.address && socialAccounts.length === 0) {
      method = AuthenticationMethod.EXTERNAL_WALLET;
      primaryAccount = 'external_wallet';
    }

    // Lógica para determinar qual carteira usar
    const shouldUseEmbeddedWallet = (
      // Se o método primário foi email ou social, usar embedded wallet
      (method === AuthenticationMethod.EMAIL || method === AuthenticationMethod.SOCIAL) ||
      // Se tem embedded wallet disponível e não é exclusivamente external wallet
      (isEmbeddedWallet && method !== AuthenticationMethod.EXTERNAL_WALLET)
    );

    return {
      method,
      isEmbeddedWallet,
      isExternalWallet: !!isExternalWallet,
      primaryAccount,
      linkedAccounts,
      walletType,
      shouldUseEmbeddedWallet
    };
  }, [user, authenticated, wallets]);
}

// Hook auxiliar para facilitar o uso
export function useWalletStrategy() {
  const authInfo = useAuthenticationMethod();
  const { wallets } = useWallets();
  const { user } = usePrivy();

  return useMemo(() => {
    if (!user?.wallet?.address) {
      return {
        activeWallet: null,
        shouldUseEmbedded: false,
        authMethod: authInfo.method
      };
    }

    const activeWallet = wallets.find(w => w.address === user.wallet?.address);
    
    return {
      activeWallet,
      shouldUseEmbedded: authInfo.shouldUseEmbeddedWallet,
      authMethod: authInfo.method
    };
  }, [authInfo, wallets, user?.wallet?.address]);
} 