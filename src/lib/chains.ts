import { defineChain } from 'viem';

// Verifica se estamos usando a Chiliz Testnet ou Mainnet baseado na variável de ambiente
const isTestnet = process.env.CHAINID === '88882';
const chainId = parseInt(process.env.CHAINID || '88888');

/**
 * Representação da Chiliz Chain para uso com viem
 * @see https://docs.chiliz.com/
 */
export const chiliz = defineChain({
  id: chainId,
  name: isTestnet ? 'Chiliz Testnet' : 'Chiliz Chain',
  network: isTestnet ? 'chiliz-testnet' : 'chiliz',
  nativeCurrency: {
    decimals: 18,
    name: 'CHZ',
    symbol: 'CHZ',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || (isTestnet
        ? 'https://chiliz-testnet.gateway.tatum.io/'
        : 'https://rpc.chiliz.com')],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || (isTestnet
        ? 'https://chiliz-testnet.gateway.tatum.io/'
        : 'https://rpc.chiliz.com')],
    },
  },
  blockExplorers: {
    default: {
      name: 'Chiliz Explorer',
      url: isTestnet
        ? 'https://spicy-explorer.chiliz.com'
        : 'https://explorer.chiliz.com',
    },
  },
  testnet: isTestnet,
});