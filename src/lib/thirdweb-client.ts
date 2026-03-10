import { createThirdwebClient, getContract, defineChain } from "thirdweb";
import { ethereum, polygon, base } from "thirdweb/chains";
import { getMarketplaceContractAddress } from "./env-validator";

// Criar client Thirdweb com o CLIENT_ID fornecido
export const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
  config: {
    rpc: {
      maxBatchSize: 1, // disable RPC batching - Chiliz RPC rejects batched calls with "Batch size too large"
    },
  },
});

// RPC URL da Chiliz Chain (usa variável de ambiente)
const CHILIZ_RPC_URL = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || "https://rpc.chiliz.com";
const CHILIZ_TESTNET_RPC_URL = "https://chiliz-testnet.gateway.tatum.io/";

// Definir Chiliz Chain
export const chilizChain = defineChain({
  id: 88888,
  name: "Chiliz Chain",
  nativeCurrency: {
    name: "Chiliz",
    symbol: "CHZ",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [CHILIZ_RPC_URL],
    },
    public: {
      http: [CHILIZ_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Chiliz Explorer",
      url: "https://scan.chiliz.com",
    },
  },
  testnet: false,
});

// Definir Chiliz Testnet
export const chilizTestnet = defineChain({
  id: 88882,
  name: "Chiliz Testnet",
  nativeCurrency: {
    name: "Chiliz",
    symbol: "CHZ",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [CHILIZ_TESTNET_RPC_URL],
    },
    public: {
      http: [CHILIZ_TESTNET_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Chiliz Testnet Explorer",
      url: "https://testnet.chiliscan.com",
    },
  },
  testnet: true,
});

// Função para obter a chain correta baseada no ambiente
export const getActiveChain = () => {
  const chainId = process.env.CHAINID || "88888";
  return chainId === "88882" ? chilizTestnet : chilizChain;
};

// Conectar ao contrato NFT principal
export const getNFTContract = () => {
  const contractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "";
  
  return getContract({
    client: thirdwebClient,
    chain: getActiveChain(),
    address: contractAddress,
  });
};

// Conectar ao contrato do Marketplace
export const getMarketplaceContract = () => {
  const contractAddress = getMarketplaceContractAddress() || "";
  
  if (!contractAddress) {
    throw new Error("Marketplace contract address not configured. Please set NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS in your environment variables.");
  }
  
  return getContract({
    client: thirdwebClient,
    chain: getActiveChain(),
    address: contractAddress,
  });
};
