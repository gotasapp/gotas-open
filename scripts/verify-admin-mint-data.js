/**
 * Script para verificar se assets e usuários existem antes do admin mint
 * Executa com: node scripts/verify-admin-mint-data.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Dados do mint administrativo
const MINTS = [
  { assetId: 'f4787835-7b28-4d0d-9c99-d0b8ce8cc9f5', username: 'user885244', time: 'Fluminense', token: 'FLU' },
  { assetId: '949b685a-b88b-48b0-b1bb-64c87a058553', username: 'user885244', time: 'Vasco', token: 'VASCO' },
  { assetId: '57eb5b0e-62c0-412b-b9b2-d136178c800f', username: 'user885244', time: 'São Paulo', token: 'SPFC' },
  { assetId: 'd7b0abef-2a3f-4657-8730-63fe75e4b54b', username: 'user885244', time: 'Palmeiras', token: 'VERDAO' },
  { assetId: 'a7caf62b-c460-4505-a019-56b6912d4469', username: 'user656125', time: 'Flamengo', token: 'MENGO' },
  { assetId: 'b6d93b67-e5a9-42e6-a072-a945eab7ab18', username: 'user600115', time: 'Internacional', token: 'SACI' },
];

async function verifyData() {
  console.log('\n========================================');
  console.log('VERIFICAÇÃO DE DADOS PARA ADMIN MINT');
  console.log('========================================\n');

  const client = await pool.connect();
  let allValid = true;

  try {
    // Verificar cada asset
    console.log('📦 VERIFICANDO ASSETS:\n');

    for (const mint of MINTS) {
      const assetResult = await client.query(
        `SELECT id, nft_id, title, rarity, claimed, image_url, ipfs_image_url
         FROM asset WHERE id = $1`,
        [mint.assetId]
      );

      if (assetResult.rows.length === 0) {
        console.log(`❌ ${mint.time} (${mint.token}): Asset NÃO ENCONTRADO - ${mint.assetId}`);
        allValid = false;
      } else {
        const asset = assetResult.rows[0];
        const status = asset.claimed ? '⚠️ JÁ CLAIMED' : '✅ DISPONÍVEL';
        console.log(`${status} ${mint.time} (${mint.token})`);
        console.log(`   Asset ID: ${mint.assetId}`);
        console.log(`   Título: ${asset.title || 'N/A'}`);
        console.log(`   Raridade: ${asset.rarity || 'N/A'}`);
        console.log(`   NFT ID: ${asset.nft_id}`);
        console.log(`   Image URL: ${asset.image_url ? 'Sim' : 'Não'}`);
        console.log(`   IPFS URL: ${asset.ipfs_image_url ? 'Sim' : 'Não'}`);
        console.log('');

        if (asset.claimed) {
          allValid = false;
        }
      }
    }

    // Verificar usuários
    console.log('\n👤 VERIFICANDO USUÁRIOS:\n');

    const uniqueUsernames = [...new Set(MINTS.map(m => m.username))];

    for (const username of uniqueUsernames) {
      const userResult = await client.query(
        `SELECT id, wallet_address, username, display_name, email, privy_user_id
         FROM users WHERE username = $1`,
        [username]
      );

      if (userResult.rows.length === 0) {
        console.log(`❌ ${username}: USUÁRIO NÃO ENCONTRADO`);
        allValid = false;
      } else {
        const user = userResult.rows[0];
        const hasWallet = user.wallet_address ? '✅' : '❌';
        console.log(`✅ ${username}`);
        console.log(`   User ID: ${user.id}`);
        console.log(`   Display Name: ${user.display_name || 'N/A'}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   ${hasWallet} Wallet: ${user.wallet_address || 'NÃO CONFIGURADA'}`);
        console.log(`   Privy ID: ${user.privy_user_id || 'N/A'}`);
        console.log('');

        if (!user.wallet_address) {
          allValid = false;
        }
      }
    }

    // Resumo final
    console.log('\n========================================');
    if (allValid) {
      console.log('✅ TODOS OS DADOS ESTÃO VÁLIDOS!');
      console.log('   Pronto para executar os mints.');
    } else {
      console.log('❌ EXISTEM PROBLEMAS NOS DADOS');
      console.log('   Corrija os problemas antes de continuar.');
    }
    console.log('========================================\n');

  } catch (error) {
    console.error('Erro ao verificar dados:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyData();
