/**
 * Sistema avançado de descoberta automática de contratos NFT
 * 
 * Utiliza eventos Transfer da blockchain para descobrir automaticamente
 * contratos ERC-721 que contêm NFTs de uma wallet específica.
 */

import { createPublicClient, http, getContract, Address, Log } from 'viem';
import { chiliz } from 'viem/chains';
import ERC721ABI from '@/abis/ERC721ABI.json';

// Cliente público configurável para Chiliz Chain
const getPublicClient = () => createPublicClient({
  chain: chiliz,
  transport: http(process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://chiliz.publicnode.com/')
});

// Event signature para Transfer(address,address,uint256)
const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Interface expandida para contrato descoberto
export interface DiscoveredContract {
  address: string;
  name: string;
  symbol: string;
  isERC721: boolean;
  balance: number;
  totalSupply?: number;
  lastActivity?: number;
  error?: string;
}

// Resultado completo da descoberta
export interface DiscoveryResult {
  contracts: DiscoveredContract[];
  totalNFTs: number;
  discoveredAt: number;
  walletAddress: string;
  searchBlocks: number;
  errors: string[];
}

/**
 * Busca eventos Transfer onde o usuário foi destinatário (mint ou transfer recebido)
 */
async function findTransferEvents(
  walletAddress: string, 
  maxBlocks = 50000,
  debug = false
): Promise<{ logs: Log[], blocksSearched: number }> {
  const client = getPublicClient();
  
  if (debug) {
    console.log(`🔍 [Discovery] Buscando eventos Transfer para: ${walletAddress}`);
  }

  try {
    const latestBlock = await client.getBlockNumber();
    const fromBlock = latestBlock - BigInt(maxBlocks);
    
    if (debug) {
      console.log(`📦 [Discovery] Range de blocos: ${fromBlock} to ${latestBlock} (${maxBlocks} blocos)`);
    }

    // Buscar eventos Transfer onde walletAddress é o destinatário (topic2)
    const logs = await client.getLogs({
      fromBlock,
      toBlock: latestBlock,
      topics: [
        TRANSFER_EVENT_SIGNATURE, // Transfer event
        null, // from (qualquer endereço)
        `0x000000000000000000000000${walletAddress.slice(2).toLowerCase()}` // to (nossa wallet)
      ]
    });

    if (debug) {
      console.log(`📊 [Discovery] ${logs.length} eventos Transfer encontrados`);
    }

    return { logs, blocksSearched: maxBlocks };
  } catch (error) {
    console.error('❌ [Discovery] Erro ao buscar eventos Transfer:', error);
    return { logs: [], blocksSearched: 0 };
  }
}

/**
 * Extrai endereços únicos de contratos dos logs
 */
function extractUniqueContracts(logs: Log[], debug = false): string[] {
  const contractSet = new Set<string>();

  for (const log of logs) {
    if (log.address) {
      contractSet.add(log.address.toLowerCase());
    }
  }

  const contracts = Array.from(contractSet);
  
  if (debug) {
    console.log(`🏗️ [Discovery] ${contracts.length} contratos únicos encontrados`);
  }

  return contracts;
}

/**
 * Analisa um contrato e verifica se é ERC-721, obtendo informações básicas
 */
async function analyzeContract(
  contractAddress: string, 
  walletAddress: string,
  debug = false
): Promise<DiscoveredContract> {
  const client = getPublicClient();
  
  if (debug) {
    console.log(`🔍 [Discovery] Analisando contrato: ${contractAddress}`);
  }

  const result: DiscoveredContract = {
    address: contractAddress,
    name: 'Unknown',
    symbol: 'UNK',
    isERC721: false,
    balance: 0,
    lastActivity: Date.now()
  };

  try {
    const contract = getContract({
      address: contractAddress as Address,
      abi: ERC721ABI,
      client
    });

    // Verificar se suporta ERC-721 (supportsInterface)
    let isERC721 = false;
    try {
      const supportsERC721 = await contract.read.supportsInterface(['0x80ac58cd']);
      isERC721 = !!supportsERC721;
    } catch {
      // Se não tem supportsInterface, tentar balanceOf como fallback
      try {
        await contract.read.balanceOf([walletAddress as Address]);
        isERC721 = true;
      } catch {
        isERC721 = false;
      }
    }

    if (!isERC721) {
      result.error = 'Não é contrato ERC-721';
      if (debug) {
        console.log(`❌ [Discovery] ${contractAddress} não é ERC-721`);
      }
      return result;
    }

    // Buscar informações do contrato e balance do usuário
    const [balance, name, symbol, totalSupply] = await Promise.allSettled([
      contract.read.balanceOf([walletAddress as Address]),
      contract.read.name(),
      contract.read.symbol(),
      contract.read.totalSupply?.() // Pode não existir em todos os contratos
    ]);

    result.isERC721 = true;
    result.balance = balance.status === 'fulfilled' ? Number(balance.value) : 0;
    result.name = name.status === 'fulfilled' ? name.value as string : 'Unknown Contract';
    result.symbol = symbol.status === 'fulfilled' ? symbol.value as string : 'UNK';
    result.totalSupply = totalSupply.status === 'fulfilled' ? Number(totalSupply.value) : undefined;

    if (debug) {
      console.log(`✅ [Discovery] ${contractAddress}: ${result.name} (${result.symbol}) - ${result.balance} NFTs`);
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`❌ [Discovery] Erro ao analisar ${contractAddress}:`, error);
    return result;
  }
}

/**
 * Função principal de descoberta automática de contratos NFT
 */
export async function discoverNFTContracts(
  walletAddress: string,
  options: {
    maxBlocks?: number;
    includeZeroBalance?: boolean;
    debug?: boolean;
  } = {}
): Promise<DiscoveryResult> {
  const startTime = Date.now();
  const { maxBlocks = 50000, includeZeroBalance = false, debug = false } = options;
  const errors: string[] = [];

  if (debug) {
    console.log(`🚀 [Discovery] Iniciando descoberta automática para: ${walletAddress}`);
  }

  try {
    // 1. Buscar eventos Transfer
    const { logs, blocksSearched } = await findTransferEvents(walletAddress, maxBlocks, debug);
    
    if (logs.length === 0) {
      if (debug) {
        console.log(`ℹ️ [Discovery] Nenhum evento Transfer encontrado nos últimos ${blocksSearched} blocos`);
      }
      return {
        contracts: [],
        totalNFTs: 0,
        discoveredAt: Date.now(),
        walletAddress,
        searchBlocks: blocksSearched,
        errors
      };
    }

    // 2. Extrair contratos únicos
    const contractAddresses = extractUniqueContracts(logs, debug);

    // 3. Analisar cada contrato
    const contractAnalysisPromises = contractAddresses.map(address => 
      analyzeContract(address, walletAddress, debug)
    );

    const analyzedContracts = await Promise.all(contractAnalysisPromises);

    // 4. Filtrar contratos válidos
    const validContracts = analyzedContracts.filter(contract => {
      if (!contract.isERC721) {
        if (contract.error) errors.push(`${contract.address}: ${contract.error}`);
        return false;
      }
      if (!includeZeroBalance && contract.balance === 0) return false;
      return true;
    });

    const totalNFTs = validContracts.reduce((sum, contract) => sum + contract.balance, 0);

    const result: DiscoveryResult = {
      contracts: validContracts,
      totalNFTs,
      discoveredAt: Date.now(),
      walletAddress,
      searchBlocks: blocksSearched,
      errors
    };

    if (debug) {
      const duration = Date.now() - startTime;
      console.log(`🎉 [Discovery] Descoberta concluída em ${duration}ms:`);
      console.log(`📊 [Discovery] ${validContracts.length} contratos ERC-721 com NFTs`);
      console.log(`🎨 [Discovery] ${totalNFTs} NFTs totais`);
      
      validContracts.forEach(contract => {
        console.log(`  📍 ${contract.name} (${contract.symbol}): ${contract.balance} NFTs - ${contract.address}`);
      });
      
      if (errors.length > 0) {
        console.log(`⚠️ [Discovery] ${errors.length} erros encontrados`);
      }
    }

    return result;
  } catch (error) {
    console.error('❌ [Discovery] Erro geral na descoberta:', error);
    errors.push(`Erro geral: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    
    return {
      contracts: [],
      totalNFTs: 0,
      discoveredAt: Date.now(),
      walletAddress,
      searchBlocks: 0,
      errors
    };
  }
}

/**
 * Sistema de cache para evitar descobertas repetidas
 */
const discoveryCache = new Map<string, DiscoveryResult>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

function getCachedDiscovery(walletAddress: string): DiscoveryResult | null {
  const cached = discoveryCache.get(walletAddress.toLowerCase());
  if (!cached) return null;

  const isExpired = Date.now() - cached.discoveredAt > CACHE_DURATION;
  if (isExpired) {
    discoveryCache.delete(walletAddress.toLowerCase());
    return null;
  }

  return cached;
}

function setCachedDiscovery(result: DiscoveryResult): void {
  discoveryCache.set(result.walletAddress.toLowerCase(), result);
}

/**
 * Descoberta com cache automático
 */
export async function discoverNFTContractsWithCache(
  walletAddress: string,
  options: {
    maxBlocks?: number;
    includeZeroBalance?: boolean;
    debug?: boolean;
    forceRefresh?: boolean;
  } = {}
): Promise<DiscoveryResult> {
  const { forceRefresh = false, ...discoveryOptions } = options;

  // Verificar cache se não for refresh forçado
  if (!forceRefresh) {
    const cached = getCachedDiscovery(walletAddress);
    if (cached) {
      if (discoveryOptions.debug) {
        console.log(`📋 [Discovery] Usando resultado em cache para ${walletAddress}`);
      }
      return cached;
    }
  }

  // Realizar descoberta
  const result = await discoverNFTContracts(walletAddress, discoveryOptions);
  
  // Salvar no cache
  setCachedDiscovery(result);
  
  return result;
}

/**
 * Descoberta híbrida: combina contratos conhecidos + descoberta automática
 */
export async function discoverUserNFTContracts(
  userAddress: string,
  knownContracts: string[] = [],
  options: {
    maxBlocks?: number;
    includeZeroBalance?: boolean;
    debug?: boolean;
  } = {}
): Promise<DiscoveryResult> {
  const { debug = false } = options;

  if (debug) {
    console.log(`🔧 [Discovery] Descoberta híbrida para ${userAddress}`);
    console.log(`📋 [Discovery] ${knownContracts.length} contratos conhecidos fornecidos`);
  }

  // Executar descoberta automática
  const discoveredResult = await discoverNFTContractsWithCache(userAddress, options);

  // Analisar contratos conhecidos adicionais
  const knownContractPromises = knownContracts
    .filter(addr => !discoveredResult.contracts.some(c => c.address.toLowerCase() === addr.toLowerCase()))
    .map(addr => analyzeContract(addr, userAddress, debug));

  const knownContractResults = await Promise.all(knownContractPromises);
  
  // Filtrar contratos conhecidos válidos
  const validKnownContracts = knownContractResults.filter(contract => 
    contract.isERC721 && (options.includeZeroBalance || contract.balance > 0)
  );

  // Combinar resultados
  const allContracts = [...discoveredResult.contracts, ...validKnownContracts];
  const totalNFTs = allContracts.reduce((sum, contract) => sum + contract.balance, 0);
  const allErrors = [...discoveredResult.errors];

  // Adicionar erros dos contratos conhecidos
  knownContractResults.forEach(contract => {
    if (!contract.isERC721 && contract.error) {
      allErrors.push(`${contract.address}: ${contract.error}`);
    }
  });

  if (debug && validKnownContracts.length > 0) {
    console.log(`🔧 [Discovery] ${validKnownContracts.length} contratos conhecidos adicionados`);
  }

  return {
    contracts: allContracts,
    totalNFTs,
    discoveredAt: Date.now(),
    walletAddress: userAddress,
    searchBlocks: discoveredResult.searchBlocks,
    errors: allErrors
  };
}

/**
 * Função legacy para compatibilidade
 */
export async function verifyERC721Contract(contractAddress: string): Promise<DiscoveredContract | null> {
  console.warn('⚠️ verifyERC721Contract está deprecated. Use analyzeContract.');
  const result = await analyzeContract(contractAddress, '0x0000000000000000000000000000000000000000', false);
  return result.isERC721 ? result : null;
}

/**
 * Utilitário para adicionar contratos descobertos à lista conhecida
 */
export function addKnownContract(address: string): boolean {
  try {
    // Validar formato do endereço
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      console.error(`❌ Endereço inválido: ${address}`);
      return false;
    }
    
    console.log(`📝 [Discovery] Contrato adicionado à lista: ${address}`);
    // Em uma implementação real, salvaria em localStorage ou database
    return true;
  } catch (error) {
    console.error('❌ Erro ao adicionar contrato:', error);
    return false;
  }
}

/**
 * Estatísticas da descoberta para debugging
 */
export function getDiscoveryStats(): {
  cacheSize: number;
  cachedWallets: string[];
} {
  return {
    cacheSize: discoveryCache.size,
    cachedWallets: Array.from(discoveryCache.keys())
  };
}