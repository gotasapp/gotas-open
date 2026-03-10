#!/usr/bin/env node

/**
 * Script para testar a configuração do marketplace
 * Verifica se o endereço do contrato está sendo lido corretamente
 */

// Simular variáveis de ambiente do Next.js
process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS = "0x60A202C2908f49B2aA614964A6a0f8B0e804F816";
process.env.CHAINID = "88888";

console.log("🧪 Testando configuração do marketplace...\n");

async function testMarketplaceConfig() {
  try {
    // Importar as funções
    const { getMarketplaceContractAddress, validateMarketplaceConfig } = require('../src/lib/env-validator.ts');
    
    console.log("📋 Teste 1: Verificando leitura da variável de ambiente");
    const address = getMarketplaceContractAddress();
    console.log(`   Address obtido: ${address}`);
    console.log(`   Expected: 0x60A202C2908f49B2aA614964A6a0f8B0e804F816`);
    console.log(`   ✅ Leitura: ${address ? 'OK' : 'FALHOU'}\n`);
    
    console.log("📋 Teste 2: Validando configuração do marketplace");
    const validation = validateMarketplaceConfig();
    console.log(`   Válido: ${validation.isValid}`);
    console.log(`   Configurado: ${validation.configured}`);
    console.log(`   ✅ Validação: ${validation.isValid && validation.configured ? 'OK' : 'FALHOU'}\n`);
    
    console.log("📋 Teste 3: Testando função getMarketplaceContract");
    const { getMarketplaceContract } = require('../src/lib/thirdweb-client.ts');
    
    try {
      const contract = getMarketplaceContract();
      console.log(`   Contrato criado: ${!!contract}`);
      console.log(`   Address: ${contract.address}`);
      console.log(`   Chain ID: ${contract.chain.id}`);
      console.log(`   ✅ Contrato: OK\n`);
    } catch (error) {
      console.log(`   ❌ Erro ao criar contrato: ${error.message}\n`);
    }
    
    console.log("🎉 Testes concluídos!");
    
  } catch (error) {
    console.error("❌ Erro durante os testes:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Executar testes
testMarketplaceConfig();