/**
 * Sistema de descoberta de NFTs específico para Chiliz Chain
 * 
 * Implementa estratégias otimizadas para encontrar NFTs na Chiliz Chain,
 * incluindo contratos conhecidos, busca por fragmentos de endereços e
 * descoberta automática expandida.
 */

import { createPublicClient, http, getContract, Address, Log } from 'viem';
import { chiliz } from 'viem/chains';
import ERC721ABI from '@/abis/ERC721ABI.json';
import { NFT_CONTRACTS, isValidContractAddress, getContractName } from '@/lib/nft-contracts';

// Cliente público otimizado para Chiliz Chain
const getChilizClient = () => createPublicClient({
  chain: chiliz,
  transport: http(process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://chiliz.publicnode.com/'),
  batch: {
    multicall: true,
  }
});

// Contratos específicos da Chiliz Chain para testar manualmente
const CHILIZ_SPECIFIC_CONTRACTS = [
  // Contratos confirmados pelo explorer
  '0x1e6F3a15ce830705914025DC2e9c1B5cDCA4C8Fd', // Cards do futebol
  
  // Possíveis contratos baseados em fragmentos do explorer
  '0x3b59afb26805ce830705914025dc2e9c1b5cdca4c8fd', // gotas.social variação 1
  '0x3b59afb26805914025dc2e9c1b5cdca4c8fd00000', // gotas.social variação 2
  '0xcba03500efd0ce830705914025dc2e9c1b5cdca4c8fd', // CGOTAS variação 1
  '0xcba03500efd0914025dc2e9c1b5cdca4c8fd00000', // CGOTAS variação 2
  
  // Contratos populares de fan tokens que podem ter NFTs
  '0x677978dE066b3C8706e7C0D8D8a7B6e4b7B8F5F3',
  '0x3506424F91fD33084466F402d5D97f05F8e3b4AF',
  '0xeDB761da5BfC6CEc9CA40cbE41e4b9A2c65C11A8',
];

// Event signature para Transfer(address,address,uint256)
const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface ChilizNFTContract {
  address: string;
  name: string;
  symbol: string;
  isERC721: boolean;
  balance: number;
  totalSupply?: number;
  lastActivity?: number;
  discoveryMethod: 'known' | 'events' | 'manual' | 'fragment';
  error?: string;
}

export interface ChilizDiscoveryResult {
  contracts: ChilizNFTContract[];
  totalNFTs: number;
  discoveredAt: number;
  walletAddress: string;
  searchMethods: string[];
  blocksSearched: number;
  errors: string[];
  debugLogs: string[];
}

/**
 * Verifica se um contrato é ERC721 e obtém informações básicas
 */
async function analyzeChilizContract(
  contractAddress: string,
  walletAddress: string,
  method: string,
  debug = false
): Promise<ChilizNFTContract> {
  const client = getChilizClient();
  const logs: string[] = [];
  
  const addLog = (msg: string) => {
    if (debug) console.log(`🔍 [Chiliz] ${msg}`);
    logs.push(msg);
  };

  addLog(`Analisando contrato ${contractAddress} via ${method}`);

  const result: ChilizNFTContract = {
    address: contractAddress,
    name: 'Unknown',
    symbol: 'UNK',
    isERC721: false,
    balance: 0,
    lastActivity: Date.now(),
    discoveryMethod: method as any
  };

  try {
    if (!isValidContractAddress(contractAddress)) {
      result.error = 'Endereço de contrato inválido';
      addLog(`❌ Endereço inválido: ${contractAddress}`);
      return result;
    }

    const contract = getContract({
      address: contractAddress as Address,
      abi: ERC721ABI,
      client
    });

    // Verificar se é ERC-721 com múltiplas estratégias
    let isERC721 = false;
    
    try {
      // Método 1: supportsInterface (padrão ERC-165)
      const supportsERC721 = await contract.read.supportsInterface(['0x80ac58cd']);
      isERC721 = !!supportsERC721;
      addLog(`✅ Suporte ERC-721 verificado via supportsInterface: ${isERC721}`);
    } catch (error) {
      addLog(`⚠️ supportsInterface falhou, tentando balanceOf`);
      
      try {
        // Método 2: tentar balanceOf como fallback
        await contract.read.balanceOf([walletAddress as Address]);
        isERC721 = true;
        addLog(`✅ ERC-721 confirmado via balanceOf`);
      } catch (innerError) {
        addLog(`❌ Contrato não é ERC-721`);
        isERC721 = false;
      }
    }

    if (!isERC721) {
      result.error = 'Não é contrato ERC-721';
      return result;
    }

    // Buscar informações do contrato em paralelo
    const [balanceResult, nameResult, symbolResult, totalSupplyResult] = await Promise.allSettled([
      contract.read.balanceOf([walletAddress as Address]),
      contract.read.name(),
      contract.read.symbol(),
      contract.read.totalSupply?.() // Opcional
    ]);

    result.isERC721 = true;
    result.balance = balanceResult.status === 'fulfilled' ? Number(balanceResult.value) : 0;
    result.name = nameResult.status === 'fulfilled' ? nameResult.value as string : getContractName(contractAddress);
    result.symbol = symbolResult.status === 'fulfilled' ? symbolResult.value as string : 'UNK';
    result.totalSupply = totalSupplyResult.status === 'fulfilled' ? Number(totalSupplyResult.value) : undefined;

    addLog(`✅ Contrato válido: ${result.name} (${result.symbol}) - ${result.balance} NFTs`);
    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    result.error = errorMsg;
    addLog(`❌ Erro ao analisar contrato: ${errorMsg}`);
    return result;
  }
}

/**
 * Busca eventos Transfer expandida com ranges maiores
 */
async function findChilizTransferEvents(
  walletAddress: string,
  maxBlocks = 100000, // Dobrado para capturar mais histórico
  debug = false
): Promise<{ logs: Log[], blocksSearched: number }> {
  const client = getChilizClient();
  const logs: Log[] = [];
  
  if (debug) {
    console.log(`🔍 [Chiliz] Buscando eventos Transfer para: ${walletAddress}`);
  }

  try {
    const latestBlock = await client.getBlockNumber();
    const fromBlock = latestBlock - BigInt(maxBlocks);
    
    if (debug) {
      console.log(`📦 [Chiliz] Range expandido: ${fromBlock} to ${latestBlock} (${maxBlocks} blocos)`);
    }

    // Buscar em chunks para evitar timeouts
    const chunkSize = 10000;
    let currentFromBlock = fromBlock;
    
    while (currentFromBlock < latestBlock) {
      const currentToBlock = currentFromBlock + BigInt(chunkSize) > latestBlock 
        ? latestBlock 
        : currentFromBlock + BigInt(chunkSize);

      try {
        const chunkLogs = await client.getLogs({
          fromBlock: currentFromBlock,
          toBlock: currentToBlock,
          topics: [
            TRANSFER_EVENT_SIGNATURE,
            null, // from (qualquer endereço)
            `0x000000000000000000000000${walletAddress.slice(2).toLowerCase()}` // to (nossa wallet)
          ]
        });

        logs.push(...chunkLogs);
        
        if (debug && chunkLogs.length > 0) {
          console.log(`📊 [Chiliz] Chunk ${currentFromBlock}-${currentToBlock}: ${chunkLogs.length} eventos`);
        }
      } catch (chunkError) {
        if (debug) {
          console.log(`⚠️ [Chiliz] Erro no chunk ${currentFromBlock}-${currentToBlock}, continuando...`);
        }
      }

      currentFromBlock = currentToBlock + BigInt(1);
    }

    if (debug) {
      console.log(`📊 [Chiliz] Total de eventos encontrados: ${logs.length}`);
    }

    return { logs, blocksSearched: maxBlocks };
  } catch (error) {
    console.error('❌ [Chiliz] Erro na busca de eventos:', error);
    return { logs: [], blocksSearched: 0 };
  }
}

/**
 * Descoberta principal para Chiliz Chain
 */
export async function discoverChilizNFTs(
  walletAddress: string,
  options: {
    includeKnownContracts?: boolean;
    includeEventDiscovery?: boolean;
    includeManualContracts?: boolean;
    maxBlocks?: number;
    debug?: boolean;
  } = {}
): Promise<ChilizDiscoveryResult> {
  const {
    includeKnownContracts = true,
    includeEventDiscovery = true,
    includeManualContracts = true,
    maxBlocks = 100000,
    debug = false
  } = options;

  const startTime = Date.now();
  const errors: string[] = [];
  const debugLogs: string[] = [];
  const searchMethods: string[] = [];
  const allContracts: ChilizNFTContract[] = [];

  const addLog = (msg: string) => {
    if (debug) console.log(`🚀 [Chiliz] ${msg}`);
    debugLogs.push(`[${new Date().toISOString()}] ${msg}`);
  };

  addLog(`Iniciando descoberta Chiliz para wallet: ${walletAddress}`);

  try {
    // 1. Testar contratos conhecidos primeiro
    if (includeKnownContracts) {
      searchMethods.push('known_contracts');
      addLog(`📋 Testando ${NFT_CONTRACTS.length} contratos conhecidos`);
      
      const knownContractPromises = NFT_CONTRACTS.map(contractAddr => 
        analyzeChilizContract(contractAddr, walletAddress, 'known', debug)
      );
      
      const knownResults = await Promise.all(knownContractPromises);
      const validKnown = knownResults.filter(c => c.isERC721 && c.balance > 0);
      
      allContracts.push(...validKnown);
      addLog(`✅ Contratos conhecidos: ${validKnown.length} com NFTs`);
    }

    // 2. Testar contratos específicos da Chiliz
    if (includeManualContracts) {
      searchMethods.push('chiliz_specific');
      addLog(`🔧 Testando ${CHILIZ_SPECIFIC_CONTRACTS.length} contratos específicos da Chiliz`);
      
      const chilizPromises = CHILIZ_SPECIFIC_CONTRACTS
        .filter(addr => !allContracts.some(c => c.address.toLowerCase() === addr.toLowerCase()))
        .map(contractAddr => analyzeChilizContract(contractAddr, walletAddress, 'manual', debug));
      
      const chilizResults = await Promise.all(chilizPromises);
      const validChiliz = chilizResults.filter(c => c.isERC721 && c.balance > 0);
      
      allContracts.push(...validChiliz);
      addLog(`✅ Contratos Chiliz específicos: ${validChiliz.length} com NFTs`);
    }

    // 3. Descoberta automática por eventos (expandida)
    if (includeEventDiscovery) {
      searchMethods.push('event_discovery');
      addLog(`🔍 Iniciando descoberta automática por eventos (${maxBlocks} blocos)`);
      
      const { logs, blocksSearched } = await findChilizTransferEvents(walletAddress, maxBlocks, debug);
      
      if (logs.length > 0) {
        const contractSet = new Set<string>();
        logs.forEach(log => {
          if (log.address) {
            contractSet.add(log.address.toLowerCase());
          }
        });

        const discoveredAddresses = Array.from(contractSet)
          .filter(addr => !allContracts.some(c => c.address.toLowerCase() === addr));

        addLog(`📦 Descobertos ${discoveredAddresses.length} novos contratos via eventos`);

        const discoveredPromises = discoveredAddresses.map(addr => 
          analyzeChilizContract(addr, walletAddress, 'events', debug)
        );
        
        const discoveredResults = await Promise.all(discoveredPromises);
        const validDiscovered = discoveredResults.filter(c => c.isERC721 && c.balance > 0);
        
        allContracts.push(...validDiscovered);
        addLog(`✅ Eventos descobertos: ${validDiscovered.length} com NFTs`);
      }
    }

    const totalNFTs = allContracts.reduce((sum, contract) => sum + contract.balance, 0);
    const duration = Date.now() - startTime;

    addLog(`🎉 Descoberta concluída em ${duration}ms`);
    addLog(`📊 Resultado final: ${allContracts.length} contratos, ${totalNFTs} NFTs`);

    return {
      contracts: allContracts,
      totalNFTs,
      discoveredAt: Date.now(),
      walletAddress,
      searchMethods,
      blocksSearched: maxBlocks,
      errors,
      debugLogs
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    addLog(`❌ Erro geral na descoberta: ${errorMsg}`);
    errors.push(errorMsg);

    return {
      contracts: allContracts,
      totalNFTs: allContracts.reduce((sum, contract) => sum + contract.balance, 0),
      discoveredAt: Date.now(),
      walletAddress,
      searchMethods,
      blocksSearched: 0,
      errors,
      debugLogs
    };
  }
}

/**
 * Função de fallback que tenta endereços baseados em fragmentos conhecidos
 */
export async function tryContractFragments(
  walletAddress: string,
  fragments: string[],
  debug = false
): Promise<ChilizNFTContract[]> {
  const results: ChilizNFTContract[] = [];
  
  // Gerar possíveis endereços baseados nos fragmentos
  const possibleAddresses: string[] = [];
  
  fragments.forEach(fragment => {
    if (fragment.length < 42) {
      // Tentar completar o endereço com diferentes padrões
      const cleanFragment = fragment.replace('0x', '').toLowerCase();
      
      // Padrão 1: preencher com zeros no final
      const padded1 = `0x${cleanFragment.padEnd(40, '0')}`;
      
      // Padrão 2: preencher no meio (comum na Chiliz)
      const middle = '914025dc2e9c1b5cdca4c8fd';
      const padded2 = `0x${cleanFragment}${middle.slice(0, 40 - cleanFragment.length)}`;
      
      possibleAddresses.push(padded1, padded2);
    } else {
      possibleAddresses.push(fragment);
    }
  });

  if (debug) {
    console.log(`🧩 [Fragments] Testando ${possibleAddresses.length} endereços possíveis`);
  }

  const promises = possibleAddresses.map(addr => 
    analyzeChilizContract(addr, walletAddress, 'fragment', debug)
  );
  
  const fragmentResults = await Promise.all(promises);
  const validFragments = fragmentResults.filter(c => c.isERC721 && c.balance > 0);
  
  if (debug) {
    console.log(`🧩 [Fragments] ${validFragments.length} contratos válidos encontrados`);
  }

  return validFragments;
}