import { http, createConfig, type Config } from 'wagmi';
import { walletConnect } from 'wagmi/connectors';
import { chiliz } from './chains';
import type { Chain } from 'viem';

let wagmiSociosConfigInstance: Config<readonly [Chain], unknown> | null = null;

export function getWagmiSociosConfig(): Config<readonly [Chain], unknown> {
  if (wagmiSociosConfigInstance) {
    return wagmiSociosConfigInstance;
  }

  const WALLETCONNECT_PROJECT_ID = 
    process.env.NEXT_PUBLIC_WALLETCONNECT_SOCIOS_PROJECT_ID || 
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

  if (!WALLETCONNECT_PROJECT_ID || WALLETCONNECT_PROJECT_ID.trim() === '') {
    throw new Error(
      'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ou NEXT_PUBLIC_WALLETCONNECT_SOCIOS_PROJECT_ID é obrigatório e deve estar configurado no ambiente para usar Socios Wallet.'
    );
  }

  const chilizRpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL;
  if (!chilizRpcUrl) {
    throw new Error('NEXT_PUBLIC_CHILIZ_RPC_URL é obrigatória e deve estar configurada no ambiente');
  }

  console.log('[SociosDebug] Criando configuração Wagmi para Socios com Project ID:', WALLETCONNECT_PROJECT_ID?.substring(0, 10) + '...');

  const sociosWalletConnectorInstance = walletConnect({
    projectId: WALLETCONNECT_PROJECT_ID,
    metadata: {
      name: 'Socios Wallet Connection',
      description: 'Conecte-se usando Socios Wallet',
      url: typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : 'https://gotas.social',
      icons: typeof window !== 'undefined' ? [`${window.location.origin}/icon.png`] : ['https://gotas.social/icon.png'],
    },
    showQrModal: true,
  });

  console.log('[SociosDebug] Conector WalletConnect criado:', sociosWalletConnectorInstance);

  wagmiSociosConfigInstance = createConfig({
    chains: [chiliz],
    transports: {
      [chiliz.id]: http(chilizRpcUrl),
    },
    connectors: [
      sociosWalletConnectorInstance,
    ],
  });

  return wagmiSociosConfigInstance;
} 