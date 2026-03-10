'use client';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { wagmiConfig } from '@/lib/wagmiConfig';
import { chiliz } from '@/lib/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CacheCleanup } from './cache-cleanup';
import { SociosWarningProvider } from '@/contexts/SociosWarningContext';
import { SociosWarningWrapper } from './SociosWarningWrapper';
import { SociosSessionProvider } from '@/components/providers/SociosSessionProvider';

// Criar uma instância do QueryClient
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  // Verificar se a variável de ambiente está definida
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    console.error("NEXT_PUBLIC_PRIVY_APP_ID não está definido no ambiente!");
  }

  // RPC da Chiliz Chain
  const chilizRpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://rpc.chiliz.com';

  return (
    <SociosWarningProvider>
      <QueryClientProvider client={queryClient}>
        <SociosSessionProvider>
          <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
          config={{
        appearance: {
          theme: 'light',
          accentColor: '#7084FF',
          showWalletLoginFirst: true,
        },
        walletList: [
          'metamask',
          'rabby_wallet',
          'detected_ethereum_wallets',
        ],
        connectorTimeout: 30000,
        defaultChain: {
          id: chiliz.id,
          name: chiliz.name,
          nativeCurrency: chiliz.nativeCurrency,
          rpcUrls: {
            default: {
              http: [chilizRpcUrl],
            },
          },
          blockExplorers: {
            default: { 
              name: chiliz.blockExplorers?.default?.name || 'Chiliz Scan',
              url: chiliz.blockExplorers?.default?.url || '' 
            },
          },
        },
        supportedChains: [
          {
            id: chiliz.id,
            name: chiliz.name,
            nativeCurrency: chiliz.nativeCurrency,
            rpcUrls: {
              default: {
                http: [chilizRpcUrl],
              },
            },
            blockExplorers: {
              default: { 
                name: chiliz.blockExplorers?.default?.name || 'Chiliz Scan',
                url: chiliz.blockExplorers?.default?.url || '' 
              },
            },
          },
          {
            id: 1,
            name: 'Ethereum',
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: {
              default: {
                http: ['https://eth.llamarpc.com'],
              },
            },
            blockExplorers: {
              default: { 
                name: 'Etherscan',
                url: 'https://etherscan.io' 
              }
            }
          }
        ],
        loginMethods: ['wallet', 'email'], // Suporte para ambos métodos
        embeddedWallets: {
          createOnLogin: 'all-users',
        },
        // siwe: { // Comentado temporariamente devido a erro de tipo
        //   enabled: false
        // }
      }}
    >
        <WagmiProvider config={wagmiConfig}>
          <CacheCleanup />
          <SociosWarningWrapper>
            {children}
          </SociosWarningWrapper>
        </WagmiProvider>
      </PrivyProvider>
      </SociosSessionProvider>
      </QueryClientProvider>
    </SociosWarningProvider>
  );
}