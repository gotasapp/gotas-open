/**
 * Utilitário para interagir com a Chiliz Chain e seu contrato de staking
 */
import { createPublicClient, http, createWalletClient, custom, parseEther, formatEther } from 'viem';
import { chiliz } from '../lib/chains';

// Lista de validadores da Chiliz Chain (temporário, até obter a lista real do contrato)
// Estes são endereços de exemplo e devem ser substituídos pelos validadores reais
export const CHILIZ_VALIDATORS = [
  '0x58f23D0a57e5250BF3Deaf7a55A25CFFc308f08E',
  '0x4EcC84B8431Ee3F95F7A396F89528B1D063fb4D7',
  '0x0D9C537995c3Da9A2c224AFa9abAbb4BF7026C75',
  '0x2c15A64536E25FBc1eE387bf17Aee7B904B87aE8',
  '0xAad1D1064Af488B04530ecee2D35A98cA5804D5f',
  '0x5b1336386905e5e93a756520015C1E0B49C2E388',
  '0x741d98F581F028A07d81bE430c0248936F533a53',
  '0xC845214D41279FC6CD088BC1601b9E8A80A17029',
  '0x87EBCD476DE18B57F33E6B88F60CFbC19fC60C9d',
  '0x8E2bCcE7601F7Ad1Ad6423424Df86290B9F17b95',
  '0x8FbE54EC15cE5DdE10Fb474dfAab64ba63143387'
];

// ABI mínimo para o contrato de staking na Chiliz Chain
const STAKING_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "validator",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "delegate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "validator",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "undelegate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getValidators",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "delegator",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "validator",
        "type": "address"
      }
    ],
    "name": "getDelegation",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "validator",
        "type": "address"
      }
    ],
    "name": "claimRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

/**
 * Cria um cliente público para interagir com a Chiliz Chain
 * @returns Client para leitura de dados da blockchain
 */
export function createChilizPublicClient() {
  // Usar o RPC fornecido por env ou fallback para o RPC público da Chiliz
  const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://rpc.chiliz.com';

  return createPublicClient({
    chain: chiliz,
    transport: http(rpcUrl)
  });
}

/**
 * Cria um cliente de carteira para interagir com a Chiliz Chain
 * @returns Client para escrita de dados na blockchain
 */
export function createChilizWalletClient() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Provider Ethereum não encontrado');
  }
  
  return createWalletClient({
    chain: chiliz,
    transport: custom(window.ethereum)
  });
}

/**
 * Obtém a lista de validadores disponíveis na Chiliz Chain
 * @returns Array de endereços dos validadores
 */
export async function getValidators(): Promise<string[]> {
  try {
    // Usar a lista estática de validadores até obter a lista real do contrato
    return CHILIZ_VALIDATORS;

    /* Desativado temporariamente devido a problemas com o contrato
    const publicClient = createChilizPublicClient();

    const validators = await publicClient.readContract({
      address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
      abi: STAKING_CONTRACT_ABI,
      functionName: 'getValidators'
    });

    return validators as string[];
    */
  } catch (error: any) {
    // Retornar a lista estática mesmo em caso de erro
    return CHILIZ_VALIDATORS;
  }
}

/**
 * Verifica se o usuário possui stake com um validador específico
 * @param delegator Endereço do delegator (usuário)
 * @param validator Endereço do validator
 * @returns Quantidade de tokens em stake (em CHZ)
 */
export async function getDelegationAmount(delegator: string, validator: string): Promise<string> {
  try {
    // Versão simulada para desenvolvimento

    // Comentado até obter o endereço correto do contrato
    /*
    const publicClient = createChilizPublicClient();

    const amount = await publicClient.readContract({
      address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
      abi: STAKING_CONTRACT_ABI,
      functionName: 'getDelegation',
      args: [delegator, validator]
    });

    // Converter de wei para CHZ
    return formatEther(amount as bigint);
    */

    // Para desenvolvimento, retorna valor zero
    return "0.0";
  } catch (error: any) {
    // Em caso de erro, retorna zero
    return "0.0";
  }
}

/**
 * Faz stake (delegação) de tokens CHZ para um validador
 * @param validator Endereço do validador
 * @param amount Quantidade de tokens em CHZ (não em wei)
 */
export async function delegateTokens(validator: string, amount: string): Promise<string> {
  try {
    // Simular transação para fins de desenvolvimento

    // Simular uma pausa para mostrar atividade
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Retornar um hash simulado para a transação
    const hash = `0x${Math.random().toString(16).substring(2, 42)}`;
    return hash;
    
    /* Desativado até termos o endereço correto do contrato
    const walletClient = createChilizWalletClient();
    const [address] = await walletClient.getAddresses();
    
    // Converter o valor para wei (a menor unidade)
    const amountInWei = parseEther(amount);
    
    const hash = await walletClient.writeContract({
      address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
      abi: STAKING_CONTRACT_ABI,
      functionName: 'delegate',
      args: [validator, amountInWei],
      account: address
    });
    
    return hash;
    */
  } catch (error: any) {
    throw new Error(`Falha ao delegar tokens: ${error.message || error}`);
  }
}

/**
 * Retira tokens de stake (undelegation)
 * @param validator Endereço do validador
 * @param amount Quantidade de tokens em CHZ (não em wei)
 */
export async function undelegateTokens(validator: string, amount: string): Promise<string> {
  try {
    // Simular transação para fins de desenvolvimento

    // Simular uma pausa para mostrar atividade
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Retornar um hash simulado para a transação
    const hash = `0x${Math.random().toString(16).substring(2, 42)}`;
    return hash;
    
    /* Desativado até termos o endereço correto do contrato
    const walletClient = createChilizWalletClient();
    const [address] = await walletClient.getAddresses();
    
    // Converter o valor para wei (a menor unidade)
    const amountInWei = parseEther(amount);
    
    const hash = await walletClient.writeContract({
      address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
      abi: STAKING_CONTRACT_ABI,
      functionName: 'undelegate',
      args: [validator, amountInWei],
      account: address
    });
    
    return hash;
    */
  } catch (error: any) {
    throw new Error(`Falha ao retirar delegação: ${error.message || error}`);
  }
}

/**
 * Resgata recompensas de staking
 * @param validator Endereço do validador
 */
export async function claimStakingRewards(validator: string): Promise<string> {
  try {
    // Simular transação para fins de desenvolvimento

    // Simular uma pausa para mostrar atividade
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Retornar um hash simulado para a transação
    const hash = `0x${Math.random().toString(16).substring(2, 42)}`;
    return hash;
    
    /* Desativado até termos o endereço correto do contrato
    const walletClient = createChilizWalletClient();
    const [address] = await walletClient.getAddresses();
    
    const hash = await walletClient.writeContract({
      address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
      abi: STAKING_CONTRACT_ABI,
      functionName: 'claimRewards',
      args: [validator],
      account: address
    });
    
    return hash;
    */
  } catch (error: any) {
    throw new Error(`Falha ao resgatar recompensas: ${error.message || error}`);
  }
}

/**
 * Verifica se o usuário está conectado à rede Chiliz Chain
 */
export async function isConnectedToChilizChain(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return false;
    }

    // @ts-ignore
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });

    // Para desenvolvimento, simular que estamos sempre na rede correta
    return true;

    // Verificação real (use em produção):
    // return chainId === '0x15b38' || chainId === '88888'; // 88888 em decimal, 0x15b38 em hex
  } catch (error) {
    return false;
  }
}

/**
 * Solicita ao usuário que troque para a rede Chiliz Chain
 */
export async function switchToChilizChain(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Provider Ethereum não encontrado');
    }

    // Para desenvolvimento, apenas simula que trocou a rede
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
    
    /* Desativado para desenvolvimento
    try {
      // Primeiro tenta trocar para a rede (caso ela já esteja configurada)
      // @ts-ignore
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x15b38' }], // Chiliz Chain ID em hex (88888)
      });
      return true;
    } catch (switchError: any) {
      // Se o código de erro é 4902, a rede não está adicionada na carteira
      if (switchError.code === 4902) {
        // @ts-ignore
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x15b38',
              chainName: 'Chiliz Chain',
              nativeCurrency: {
                name: 'CHZ',
                symbol: 'CHZ',
                decimals: 18,
              },
              rpcUrls: [process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://rpc.ankr.com/chiliz'],
              blockExplorerUrls: ['https://explorer.chiliz.com'],
            },
          ],
        });
        return true;
      }
      throw switchError;
    }
    */
  } catch (error: any) {
    throw new Error(`Falha ao trocar para Chiliz Chain: ${error.message || error}`);
  }
}