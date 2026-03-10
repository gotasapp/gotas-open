#!/usr/bin/env node

/**
 * Script de diagnóstico completo do sistema NFT Discovery para Chiliz Chain
 */

const { createPublicClient, http, getContract } = require('viem');
const { chiliz } = require('viem/chains');
const fs = require('fs');
const path = require('path');

// Carregar ABIs
const ERC721ABI = require('../src/abis/ERC721ABI.json');

// Configuração
const TEST_WALLET = '0x0000000000000000000000000000000000000000';
const RPC_URL = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://chiliz.publicnode.com/';

// Contratos conhecidos para testar
const KNOWN_CONTRACTS = [
  process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '',
  process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || '',
].filter(Boolean);

console.log('🔬 DIAGNÓSTICO COMPLETO NFT DISCOVERY - CHILIZ CHAIN\n');
console.log(`🎯 Wallet de teste: ${TEST_WALLET}`);
console.log(`📡 RPC URL: ${RPC_URL}`);
console.log(`⛓️  Chain: Chiliz (88888)\n`);

// Função para verificar um contrato ERC-721
async function analyzeContract(client, contractAddress, walletAddress) {
  console.log(`\n🔍 Analisando contrato: ${contractAddress}`);
  
  try {
    const contract = getContract({
      address: contractAddress,
      abi: ERC721ABI,
      client
    });

    // Teste 1: Verificar se é ERC-721
    let isERC721 = false;
    try {
      const supportsERC721 = await contract.read.supportsInterface(['0x80ac58cd']);
      isERC721 = !!supportsERC721;
      console.log(`   ✅ ERC-721 Interface: ${isERC721}`);
    } catch (error) {
      console.log(`   ⚠️  supportsInterface failed, trying balanceOf...`);
      try {
        await contract.read.balanceOf([walletAddress]);
        isERC721 = true;
        console.log(`   ✅ ERC-721 confirmed via balanceOf`);
      } catch (e) {
        console.log(`   ❌ Not ERC-721 contract`);
        return null;
      }
    }

    if (!isERC721) {
      console.log(`   ❌ Contract is not ERC-721`);
      return null;
    }

    // Teste 2: Obter informações básicas
    const [balance, name, symbol, totalSupply] = await Promise.allSettled([
      contract.read.balanceOf([walletAddress]),
      contract.read.name(),
      contract.read.symbol(),
      contract.read.totalSupply?.() || Promise.resolve(0)
    ]);

    const contractInfo = {
      address: contractAddress,
      name: name.status === 'fulfilled' ? name.value : 'Unknown',
      symbol: symbol.status === 'fulfilled' ? symbol.value : 'UNK',
      balance: balance.status === 'fulfilled' ? Number(balance.value) : 0,
      totalSupply: totalSupply.status === 'fulfilled' ? Number(totalSupply.value) : 0,
      isERC721: true
    };

    console.log(`   📛 Nome: ${contractInfo.name}`);
    console.log(`   🏷️  Símbolo: ${contractInfo.symbol}`);
    console.log(`   💰 Balance: ${contractInfo.balance} NFTs`);
    console.log(`   📊 Total Supply: ${contractInfo.totalSupply}`);

    return contractInfo;

  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return null;
  }
}

// Função para buscar eventos Transfer
async function findTransferEvents(client, walletAddress, maxBlocks = 50000) {
  console.log(`\n🔍 Buscando eventos Transfer para: ${walletAddress}`);
  console.log(`📦 Range: últimos ${maxBlocks} blocos`);
  
  try {
    const latestBlock = await client.getBlockNumber();
    const fromBlock = latestBlock - BigInt(maxBlocks);
    
    console.log(`   📊 Bloco atual: ${latestBlock}`);
    console.log(`   📊 Bloco inicial: ${fromBlock}`);
    
    const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    
    // Buscar eventos em chunks para evitar timeout
    const chunkSize = 10000;
    let currentFromBlock = fromBlock;
    const allLogs = [];
    
    while (currentFromBlock < latestBlock) {
      const currentToBlock = currentFromBlock + BigInt(chunkSize) > latestBlock 
        ? latestBlock 
        : currentFromBlock + BigInt(chunkSize);
      
      try {
        const logs = await client.getLogs({
          fromBlock: currentFromBlock,
          toBlock: currentToBlock,
          topics: [
            TRANSFER_EVENT_SIGNATURE,
            null, // from (qualquer endereço)
            `0x000000000000000000000000${walletAddress.slice(2).toLowerCase()}` // to (nossa wallet)
          ]
        });
        
        allLogs.push(...logs);
        console.log(`   📊 Chunk ${currentFromBlock}-${currentToBlock}: ${logs.length} eventos`);
        
      } catch (chunkError) {
        console.log(`   ⚠️  Erro no chunk ${currentFromBlock}-${currentToBlock}, continuando...`);
      }
      
      currentFromBlock = currentToBlock + BigInt(1);
    }
    
    console.log(`   🎉 Total de eventos encontrados: ${allLogs.length}`);
    
    // Extrair endereços únicos de contratos
    const contractAddresses = [...new Set(allLogs.map(log => log.address.toLowerCase()))];
    console.log(`   📋 Contratos únicos descobertos: ${contractAddresses.length}`);
    
    return { logs: allLogs, contractAddresses };
    
  } catch (error) {
    console.log(`   ❌ Erro na busca de eventos: ${error.message}`);
    return { logs: [], contractAddresses: [] };
  }
}

// Função principal de diagnóstico
async function runComprehensiveDiagnosis() {
  const startTime = Date.now();
  
  try {
    // Criar cliente
    const client = createPublicClient({
      chain: chiliz,
      transport: http(RPC_URL),
      batch: {
        multicall: true,
      }
    });
    
    console.log('FASE 1: VERIFICAÇÃO DE CONECTIVIDADE');
    console.log('=====================================');
    
    const blockNumber = await client.getBlockNumber();
    const balance = await client.getBalance({ address: TEST_WALLET });
    const chainId = await client.getChainId();
    
    console.log(`✅ Bloco atual: ${blockNumber}`);
    console.log(`✅ Balance CHZ: ${Number(balance) / 1e18} CHZ`);
    console.log(`✅ Chain ID: ${chainId}`);
    
    console.log('\nFASE 2: TESTE DE CONTRATOS CONHECIDOS');
    console.log('======================================');
    
    const knownContractResults = [];
    for (const contractAddr of KNOWN_CONTRACTS) {
      const result = await analyzeContract(client, contractAddr, TEST_WALLET);
      if (result) {
        knownContractResults.push(result);
      }
    }
    
    console.log('\nFASE 3: DESCOBERTA AUTOMÁTICA POR EVENTOS');
    console.log('==========================================');
    
    const { logs, contractAddresses } = await findTransferEvents(client, TEST_WALLET, 50000);
    
    console.log('\nFASE 4: ANÁLISE DE CONTRATOS DESCOBERTOS');
    console.log('========================================');
    
    const discoveredContractResults = [];
    for (const contractAddr of contractAddresses) {
      if (!KNOWN_CONTRACTS.includes(contractAddr)) {
        const result = await analyzeContract(client, contractAddr, TEST_WALLET);
        if (result) {
          discoveredContractResults.push(result);
        }
      }
    }
    
    console.log('\nFASE 5: RESUMO FINAL');
    console.log('====================');
    
    const allContracts = [...knownContractResults, ...discoveredContractResults];
    const totalNFTs = allContracts.reduce((sum, contract) => sum + contract.balance, 0);
    
    console.log(`📊 Total de contratos válidos: ${allContracts.length}`);
    console.log(`🎨 Total de NFTs encontrados: ${totalNFTs}`);
    console.log(`⏱️  Tempo total: ${Date.now() - startTime}ms`);
    
    if (allContracts.length > 0) {
      console.log('\n📋 CONTRATOS COM NFTs:');
      allContracts.forEach((contract, index) => {
        console.log(`${index + 1}. ${contract.name} (${contract.symbol})`);
        console.log(`   📍 ${contract.address}`);
        console.log(`   💰 ${contract.balance} NFTs`);
      });
    }
    
    // Salvar resultado em arquivo
    const result = {
      timestamp: new Date().toISOString(),
      walletAddress: TEST_WALLET,
      rpcUrl: RPC_URL,
      chainId,
      blockNumber: blockNumber.toString(),
      totalContracts: allContracts.length,
      totalNFTs,
      contracts: allContracts,
      eventsFound: logs.length,
      contractsDiscovered: contractAddresses.length,
      duration: Date.now() - startTime
    };
    
    const outputPath = path.join(__dirname, 'nft-diagnosis-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Resultado salvo em: ${outputPath}`);
    
    if (totalNFTs > 0) {
      console.log('\n🎉 DIAGNÓSTICO CONCLUÍDO COM SUCESSO!');
      console.log('✅ Sistema NFT Discovery está funcionando corretamente');
    } else {
      console.log('\n⚠️  DIAGNÓSTICO CONCLUÍDO - NENHUM NFT ENCONTRADO');
      console.log('📋 Isso pode indicar que a wallet de teste não possui NFTs on-chain');
    }
    
  } catch (error) {
    console.error('\n💥 ERRO FATAL NO DIAGNÓSTICO:', error);
    process.exit(1);
  }
}

// Executar diagnóstico
runComprehensiveDiagnosis();