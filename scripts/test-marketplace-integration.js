#!/usr/bin/env node

/**
 * Script para testar integração completa do marketplace NFT
 * 
 * Testa:
 * 1. Configuração do ambiente
 * 2. Conexão com contratos
 * 3. Busca de listings via Thirdweb SDK
 * 4. Validação dos dados retornados
 * 
 * Para executar:
 * node scripts/test-marketplace-integration.js
 */

const { createThirdwebClient, getContract, defineChain } = require("thirdweb");
const { getAllListings, totalListings } = require("thirdweb/extensions/marketplace");
require('dotenv').config({ path: '.env.local' });

// Configurações
const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "YOUR_THIRDWEB_CLIENT_ID";
const MARKETPLACE_CONTRACT = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || "";
const NFT_CONTRACT = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "";
const CHAIN_ID = parseInt(process.env.CHAINID || "88888");

// Definir Chiliz Chain
const chilizChain = defineChain({
  id: 88888,
  name: "Chiliz Chain",
  nativeCurrency: {
    name: "Chiliz",
    symbol: "CHZ",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || "https://rpc.ankr.com/chiliz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Chiliz Explorer",
      url: "https://scan.chiliz.com",
    },
  },
});

async function testMarketplaceIntegration() {
  console.log('🚀 Iniciando teste de integração do marketplace NFT\n');
  
  // 1. Verificar configurações
  console.log('📋 1. VERIFICAÇÃO DE CONFIGURAÇÕES');
  console.log('=====================================');
  console.log(`✅ Client ID: ${CLIENT_ID.substring(0, 20)}...`);
  console.log(`✅ Marketplace Contract: ${MARKETPLACE_CONTRACT}`);
  console.log(`✅ NFT Contract: ${NFT_CONTRACT}`);
  console.log(`✅ Chain ID: ${CHAIN_ID}`);
  console.log(`✅ RPC URL: ${process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || "https://rpc.ankr.com/chiliz"}`);
  console.log(`✅ Block Explorer: https://scan.chiliz.com\n`);
  
  try {
    // 2. Criar cliente Thirdweb
    console.log('🔧 2. CRIAÇÃO DO CLIENTE THIRDWEB');
    console.log('==================================');
    const client = createThirdwebClient({
      clientId: CLIENT_ID,
    });
    console.log('✅ Cliente Thirdweb criado com sucesso\n');
    
    // 3. Conectar ao contrato marketplace
    console.log('🏪 3. CONEXÃO COM CONTRATO MARKETPLACE');
    console.log('=======================================');
    const marketplaceContract = getContract({
      client: client,
      chain: chilizChain,
      address: MARKETPLACE_CONTRACT,
    });
    console.log('✅ Contrato marketplace conectado\n');
    
    // 4. Buscar total de listings
    console.log('📊 4. BUSCA DO TOTAL DE LISTINGS');
    console.log('=================================');
    const totalListingsResult = await totalListings({
      contract: marketplaceContract
    });
    const totalListings = Number(totalListingsResult);
    console.log(`✅ Total de listings encontrados: ${totalListings}\n`);
    
    if (totalListings === 0) {
      console.log('⚠️  AVISO: Nenhum listing encontrado no contrato');
      console.log('   Isso pode indicar que:');
      console.log('   - O marketplace está vazio (normal se recém-deployado)');
      console.log('   - As transações de listagem falharam silenciosamente');
      console.log('   - Há problema na configuração do contrato\n');
      
      // Verificar se o contrato é válido
      console.log('🔍 5. DIAGNÓSTICO DO CONTRATO');
      console.log('=============================');
      console.log(`📍 Endereço: ${MARKETPLACE_CONTRACT}`);
      console.log(`🔗 Explorer: https://scan.chiliz.com/address/${MARKETPLACE_CONTRACT}`);
      console.log('💡 Recomendações:');
      console.log('   1. Verificar se o contrato está deployado no endereço correto');
      console.log('   2. Confirmar se há listings criados via Chiliz Explorer');
      console.log('   3. Tentar criar um listing via interface do projeto\n');
      
      return;
    }
    
    // 5. Buscar listings detalhados
    console.log('📋 5. BUSCA DE LISTINGS DETALHADOS');
    console.log('===================================');
    const listingsToFetch = Math.min(5, totalListings); // Buscar até 5 listings
    const startIndex = Math.max(0, totalListings - listingsToFetch);
    
    console.log(`📄 Buscando ${listingsToFetch} listings mais recentes (índices ${startIndex} a ${startIndex + listingsToFetch - 1})...`);
    
    const listings = await getAllListings({
      contract: marketplaceContract,
      start: startIndex,
      count: listingsToFetch
    });
    
    console.log(`✅ ${listings.length} listings recuperados com sucesso\n`);
    
    // 6. Analisar listings
    console.log('🔍 6. ANÁLISE DOS LISTINGS');
    console.log('==========================');
    
    const statusCounts = {
      unset: 0,
      active: 0,
      completed: 0,
      cancelled: 0
    };
    
    const now = Math.floor(Date.now() / 1000);
    
    listings.forEach((listing, index) => {
      const listingId = listing.listingId.toString();
      const tokenId = listing.tokenId.toString();
      const price = Number(listing.pricePerToken) / (10 ** 18); // Wei para CHZ
      const status = Number(listing.status);
      const endTimestamp = Number(listing.endTimestamp);
      const isExpired = now > endTimestamp;
      
      // Contar status
      switch (status) {
        case 0: statusCounts.unset++; break;
        case 1: statusCounts.active++; break;
        case 2: statusCounts.completed++; break;
        case 3: statusCounts.cancelled++; break;
      }
      
      const statusText = {
        0: 'UNSET',
        1: 'ACTIVE',
        2: 'SOLD',
        3: 'CANCELLED'
      }[status] || 'UNKNOWN';
      
      console.log(`📦 Listing #${listingId}:`);
      console.log(`   Token ID: #${tokenId}`);
      console.log(`   Preço: ${price.toFixed(4)} CHZ`);
      console.log(`   Status: ${statusText} (${status})`);
      console.log(`   Vendedor: ${listing.listingCreator}`);
      console.log(`   Expirado: ${isExpired ? 'Sim' : 'Não'}`);
      
      if (status === 1 && !isExpired) {
        const timeRemaining = endTimestamp - now;
        const days = Math.floor(timeRemaining / (24 * 60 * 60));
        const hours = Math.floor((timeRemaining % (24 * 60 * 60)) / (60 * 60));
        console.log(`   Tempo restante: ${days}d ${hours}h`);
      }
      
      console.log('');
    });
    
    // 7. Estatísticas finais
    console.log('📈 7. ESTATÍSTICAS FINAIS');
    console.log('=========================');
    console.log(`📊 Total de listings: ${totalListings}`);
    console.log(`🟢 Ativos: ${statusCounts.active}`);
    console.log(`🔵 Vendidos: ${statusCounts.completed}`);
    console.log(`🔴 Cancelados: ${statusCounts.cancelled}`);
    console.log(`⚪ Não definidos: ${statusCounts.unset}\n`);
    
    // 8. Recomendações
    console.log('💡 8. RECOMENDAÇÕES');
    console.log('===================');
    
    if (statusCounts.active > 0) {
      console.log('✅ MARKETPLACE FUNCIONANDO!');
      console.log('   - Há listings ativos disponíveis');
      console.log('   - A integração está configurada corretamente');
      console.log('   - Os usuários podem ver e interagir com NFTs listados\n');
    } else if (totalListings > 0) {
      console.log('⚠️  MARKETPLACE PARCIALMENTE CONFIGURADO');
      console.log('   - Há listings no contrato, mas nenhum ativo');
      console.log('   - Pode indicar que os listings expiraram ou foram vendidos');
      console.log('   - Recomenda-se criar novos listings para testar\n');
    }
    
    console.log('🔗 LINKS ÚTEIS:');
    console.log(`   Marketplace Contract: https://scan.chiliz.com/address/${MARKETPLACE_CONTRACT}`);
    console.log(`   NFT Contract: https://scan.chiliz.com/address/${NFT_CONTRACT}`);
    console.log('   Interface: http://localhost:3000/marketplace');
    console.log('   Debug Panel: http://localhost:3000/debug-enhanced\n');
    
    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
    
  } catch (error) {
    console.error('❌ ERRO DURANTE O TESTE:');
    console.error('=========================');
    console.error(`Tipo: ${error.name}`);
    console.error(`Mensagem: ${error.message}`);
    
    if (error.cause) {
      console.error(`Causa: ${error.cause}`);
    }
    
    if (error.stack) {
      console.error(`Stack trace:\n${error.stack}`);
    }
    
    console.error('\n🔧 POSSÍVEIS SOLUÇÕES:');
    console.error('======================');
    console.error('1. Verificar se as variáveis de ambiente estão corretas em .env.local');
    console.error('2. Confirmar se a RPC do Chiliz está respondendo');
    console.error('3. Validar se os endereços dos contratos estão corretos');
    console.error('4. Verificar se a versão do Thirdweb SDK é compatível');
    console.error('5. Testar a conexão com um RPC alternativo');
    
    process.exit(1);
  }
}

// Executar o teste
if (require.main === module) {
  testMarketplaceIntegration().catch(console.error);
}

module.exports = { testMarketplaceIntegration };
