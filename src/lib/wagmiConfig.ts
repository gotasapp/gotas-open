import { createConfig } from '@privy-io/wagmi';
import { http } from 'wagmi';
import { chiliz } from './chains';

// Usar apenas Chiliz Chain RPC - não incluir ETH mainnet
const chilizRpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL;

if (!chilizRpcUrl) {
  throw new Error('NEXT_PUBLIC_CHILIZ_RPC_URL é obrigatória e deve estar configurada no ambiente');
}

export const wagmiConfig = createConfig({
  chains: [chiliz], // Apenas Chiliz Chain - sem mainnet ETH
  transports: {
    [chiliz.id]: http(chilizRpcUrl),
  },
}); 