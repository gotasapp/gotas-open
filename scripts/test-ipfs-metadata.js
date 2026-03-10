#!/usr/bin/env node

/**
 * Script para testar o carregamento de metadata IPFS com gateways públicos
 */

// Carregar dependências
const { createPublicClient, http, getContract } = require('viem');
const { chiliz } = require('viem/chains');
const ERC721ABI = require('../src/abis/ERC721ABI.json');

// Configuração
const TEST_WALLET = '0x0000000000000000000000000000000000000000';
const RPC_URL = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://chiliz.publicnode.com/';
const NFT_CONTRACT = '0x1e6F3a15ce830705914025DC2e9c1B5cDCA4C8Fd';

// Gateways IPFS para testar
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.infura.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://nftstorage.link/ipfs/',
];

console.log('🧪 TESTE DE METADATA IPFS - CHILIZ CHAIN\n');
console.log(`🎯 Wallet: ${TEST_WALLET}`);
console.log(`📃 Contrato NFT: ${NFT_CONTRACT}`);
console.log(`📡 RPC: ${RPC_URL}\n`);

// Função para resolver URL IPFS
function resolveIpfsUrl(ipfsUrl, gatewayIndex = 0) {
  if (!ipfsUrl) return '';
  
  if (ipfsUrl.startsWith('http://') || ipfsUrl.startsWith('https://')) {
    return ipfsUrl;
  }
  
  let ipfsHash = '';
  if (ipfsUrl.startsWith('ipfs://')) {
    ipfsHash = ipfsUrl.replace('ipfs://', '');
  } else if (ipfsUrl.startsWith('Qm') || ipfsUrl.startsWith('bafy')) {
    ipfsHash = ipfsUrl;
  } else {
    return ipfsUrl;
  }
  
  if (ipfsHash.startsWith('/')) {
    ipfsHash = ipfsHash.substring(1);
  }
  
  const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];
  return `${gateway}${ipfsHash}`;
}

// Função para testar carregamento de metadata
async function testMetadataLoading(tokenURI, tokenId) {
  console.log(`\n🔍 Testando metadata para Token #${tokenId}`);
  console.log(`📋 TokenURI: ${tokenURI}`);
  
  // Verificar se é IPFS
  const isIpfs = tokenURI.startsWith('ipfs://') || tokenURI.includes('/ipfs/');
  console.log(`🌐 É IPFS: ${isIpfs ? '✅' : '❌'}`);
  
  if (!isIpfs) {
    // Testar URL HTTP direta
    try {
      const response = await fetch(tokenURI);
      if (response.ok) {
        const metadata = await response.json();
        console.log(`✅ Metadata HTTP carregada: ${metadata.name || 'Nome não encontrado'}`);
        return { success: true, metadata, method: 'HTTP' };
      } else {
        console.log(`❌ Erro HTTP: ${response.status}`);
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.log(`❌ Erro HTTP: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  // Testar gateways IPFS
  for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
    const gateway = IPFS_GATEWAYS[i];
    const resolvedUrl = resolveIpfsUrl(tokenURI, i);
    
    console.log(`\n  🚪 Gateway ${i + 1}/${IPFS_GATEWAYS.length}: ${gateway}`);
    console.log(`  🔗 URL resolvida: ${resolvedUrl}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(resolvedUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const metadata = await response.json();
        console.log(`  ✅ Sucesso! Nome: ${metadata.name || 'N/A'}`);
        console.log(`  🖼️  Imagem: ${metadata.image || 'N/A'}`);
        
        // Se imagem também é IPFS, tentar resolver
        if (metadata.image && metadata.image.startsWith('ipfs://')) {
          const imageUrl = resolveIpfsUrl(metadata.image, i);
          console.log(`  🖼️  Imagem resolvida: ${imageUrl}`);
          metadata.resolvedImage = imageUrl;
        }
        
        return { 
          success: true, 
          metadata, 
          method: `IPFS Gateway ${i + 1}`,
          gateway: gateway,
          resolvedUrl 
        };
      } else {
        console.log(`  ❌ HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.log(`  ❌ Erro: ${error.message}`);
    }
  }
  
  return { success: false, error: 'Todos os gateways falharam' };
}

// Função principal
async function runMetadataTest() {
  try {
    // Criar cliente
    const client = createPublicClient({
      chain: chiliz,
      transport: http(RPC_URL),
    });
    
    console.log('🔗 Conectando ao contrato NFT...');
    
    const contract = getContract({
      address: NFT_CONTRACT,
      abi: ERC721ABI,
      client
    });
    
    // Verificar balance da wallet
    const balance = await contract.read.balanceOf([TEST_WALLET]);
    console.log(`💰 Balance: ${balance} NFTs`);
    
    if (balance === 0n) {
      console.log('❌ Wallet não possui NFTs neste contrato');
      return;
    }
    
    // Testar metadata dos primeiros NFTs
    const maxTokensToTest = Math.min(Number(balance), 3);
    console.log(`\n🧪 Testando metadata de ${maxTokensToTest} NFTs...\n`);
    
    const results = [];
    
    for (let i = 0; i < maxTokensToTest; i++) {
      try {
        // Buscar tokenId
        const tokenId = await contract.read.tokenOfOwnerByIndex([TEST_WALLET, BigInt(i)]);
        console.log(`\n📋 Token ${i + 1}/${maxTokensToTest} - ID: ${tokenId}`);
        
        // Buscar tokenURI
        const tokenURI = await contract.read.tokenURI([tokenId]);
        
        // Testar metadata
        const result = await testMetadataLoading(tokenURI, tokenId.toString());
        results.push({
          tokenId: tokenId.toString(),
          tokenURI,
          ...result
        });
        
      } catch (error) {
        console.log(`❌ Erro ao processar token ${i + 1}: ${error.message}`);
        results.push({
          tokenId: `Token ${i + 1}`,
          success: false,
          error: error.message
        });
      }
    }
    
    // Resumo final
    console.log('\n📊 RESUMO DOS TESTES');
    console.log('====================');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Sucessos: ${successful.length}/${results.length}`);
    console.log(`❌ Falhas: ${failed.length}/${results.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎉 TOKENS COM METADATA CARREGADA:');
      successful.forEach(result => {
        console.log(`  📋 Token ${result.tokenId}: ${result.metadata?.name || 'Nome N/A'}`);
        console.log(`    🚪 Método: ${result.method}`);
        if (result.gateway) {
          console.log(`    🌐 Gateway: ${result.gateway}`);
        }
      });
    }
    
    if (failed.length > 0) {
      console.log('\n💥 TOKENS COM FALHA:');
      failed.forEach(result => {
        console.log(`  📋 Token ${result.tokenId}: ${result.error}`);
      });
    }
    
    // Recomendações
    console.log('\n💡 RECOMENDAÇÕES:');
    if (successful.length === results.length) {
      console.log('✅ Todos os metadatas carregaram com sucesso!');
      console.log('🚀 Sistema IPFS está funcionando corretamente');
    } else if (successful.length > 0) {
      console.log('⚠️  Alguns metadatas falharam - verifique gateways');
      console.log('🔧 Considere implementar retry automático nos hooks');
    } else {
      console.log('❌ Nenhum metadata carregou - problema crítico');
      console.log('🆘 Verifique conectividade e URLs dos gateways');
    }
    
  } catch (error) {
    console.error('💥 Erro fatal no teste:', error);
  }
}

// Executar teste
runMetadataTest();