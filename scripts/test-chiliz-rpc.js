#!/usr/bin/env node

/**
 * Script de teste básico para verificar conectividade com Chiliz Chain RPC
 */

const { createPublicClient, http } = require('viem');
const { chiliz } = require('viem/chains');

// Função principal de teste
async function testChilizRPC() {
  console.log('🚀 Iniciando teste de conectividade Chiliz Chain RPC...\n');
  
  // URLs para testar
  const rpcUrls = [
    process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://chiliz.publicnode.com/',
    'https://rpc.chiliz.com',
    'https://chiliz.publicnode.com/',
    'https://rpc.ankr.com/chiliz'
  ];
  
  const testWallet = '0x0000000000000000000000000000000000000000';
  
  for (const rpcUrl of rpcUrls) {
    console.log(`📡 Testando RPC: ${rpcUrl}`);
    
    try {
      // Criar cliente
      const client = createPublicClient({
        chain: chiliz,
        transport: http(rpcUrl),
      });
      
      const startTime = Date.now();
      
      // Teste 1: Obter número do bloco atual
      const blockNumber = await client.getBlockNumber();
      console.log(`✅ Bloco atual: ${blockNumber.toString()}`);
      
      // Teste 2: Obter balance CHZ da wallet de teste
      const balance = await client.getBalance({
        address: testWallet
      });
      console.log(`✅ Balance CHZ: ${Number(balance) / 1e18} CHZ`);
      
      // Teste 3: Verificar chain ID
      const chainId = await client.getChainId();
      console.log(`✅ Chain ID: ${chainId} (esperado: 88888)`);
      
      const duration = Date.now() - startTime;
      console.log(`⏱️  Tempo de resposta: ${duration}ms`);
      
      if (chainId === 88888) {
        console.log(`🎉 RPC ${rpcUrl} está funcionando corretamente!\n`);
        return { rpcUrl, success: true, duration, blockNumber, balance, chainId };
      } else {
        console.log(`❌ Chain ID incorreto para ${rpcUrl}\n`);
      }
      
    } catch (error) {
      console.log(`❌ Erro em ${rpcUrl}: ${error.message}\n`);
    }
  }
  
  return { success: false };
}

// Executar teste
testChilizRPC()
  .then((result) => {
    if (result.success) {
      console.log('🏆 Teste de conectividade Chiliz RPC concluído com sucesso!');
      console.log(`📊 RPC recomendado: ${result.rpcUrl}`);
    } else {
      console.log('💥 Nenhum RPC Chiliz funcionou corretamente');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Erro fatal no teste:', error);
    process.exit(1);
  });