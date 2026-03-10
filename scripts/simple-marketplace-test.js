#!/usr/bin/env node

/**
 * Teste simplificado do marketplace - verifica configuração básica
 */

require('dotenv').config({ path: '.env.local' });

// Configurações
const MARKETPLACE_CONTRACT = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS;
const NFT_CONTRACT = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
const CHAIN_ID = process.env.CHAINID;
const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

console.log('🚀 TESTE SIMPLIFICADO DO MARKETPLACE');
console.log('====================================');
console.log('');

console.log('📋 CONFIGURAÇÕES:');
console.log(`✅ Client ID: ${CLIENT_ID ? CLIENT_ID.substring(0, 20) + '...' : '❌ NÃO DEFINIDO'}`);
console.log(`✅ Marketplace: ${MARKETPLACE_CONTRACT || '❌ NÃO DEFINIDO'}`);
console.log(`✅ NFT Contract: ${NFT_CONTRACT || '❌ NÃO DEFINIDO'}`);
console.log(`✅ Chain ID: ${CHAIN_ID || '❌ NÃO DEFINIDO'}`);
console.log('');

// Verificar se todas as configurações estão presentes
const missingConfigs = [];
if (!CLIENT_ID) missingConfigs.push('NEXT_PUBLIC_THIRDWEB_CLIENT_ID');
if (!MARKETPLACE_CONTRACT) missingConfigs.push('NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS');
if (!NFT_CONTRACT) missingConfigs.push('NEXT_PUBLIC_NFT_CONTRACT_ADDRESS');
if (!CHAIN_ID) missingConfigs.push('CHAINID');

if (missingConfigs.length > 0) {
  console.log('❌ CONFIGURAÇÕES FALTANDO:');
  missingConfigs.forEach(config => console.log(`   - ${config}`));
  console.log('');
  console.log('💡 SOLUÇÕES:');
  console.log('   1. Criar arquivo .env.local baseado em env.example');
  console.log('   2. Definir as variáveis de ambiente faltantes');
  console.log('   3. Verificar se não há espaços extras nas variáveis');
  process.exit(1);
}

console.log('✅ TODAS AS CONFIGURAÇÕES PRESENTES!');
console.log('');

console.log('🔗 LINKS ÚTEIS:');
console.log(`📍 Marketplace Contract: https://scan.chiliz.com/address/${MARKETPLACE_CONTRACT}`);
console.log(`📍 NFT Contract: https://scan.chiliz.com/address/${NFT_CONTRACT}`);
console.log('📍 Interface Marketplace: http://localhost:3000/marketplace');
console.log('📍 Debug Panel: http://localhost:3000/debug-enhanced');
console.log('');

console.log('💡 PRÓXIMOS PASSOS:');
console.log('===================');
console.log('1. Iniciar o servidor de desenvolvimento: npm run dev');
console.log('2. Acessar http://localhost:3000/debug-enhanced');
console.log('3. Conectar carteira e verificar se os dados aparecem');
console.log('4. Tentar listar um NFT no marketplace');
console.log('5. Verificar se a listagem aparece em /marketplace');
console.log('');

console.log('🎉 CONFIGURAÇÃO VERIFICADA COM SUCESSO!');
console.log('');
console.log('ℹ️  Para um teste mais detalhado, use o debug panel na interface web.');
console.log('   Ele vai mostrar dados reais dos contratos e status das transações.');