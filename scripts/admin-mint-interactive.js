/**
 * Script interativo para admin mint de assets específicos
 * Executa um mint por vez, aguardando confirmação
 *
 * Uso: node scripts/admin-mint-interactive.js [índice]
 * Exemplo: node scripts/admin-mint-interactive.js 0  (para primeiro mint)
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Configuração dos mints
const MINTS = [
  {
    index: 0,
    assetId: 'f4787835-7b28-4d0d-9c99-d0b8ce8cc9f5',
    username: 'user885244',
    time: 'Fluminense',
    token: 'FLU'
  },
  {
    index: 1,
    assetId: '949b685a-b88b-48b0-b1bb-64c87a058553',
    username: 'user885244',
    time: 'Vasco',
    token: 'VASCO'
  },
  {
    index: 2,
    assetId: '57eb5b0e-62c0-412b-b9b2-d136178c800f',
    username: 'user885244',
    time: 'São Paulo',
    token: 'SPFC'
  },
  {
    index: 3,
    assetId: 'd7b0abef-2a3f-4657-8730-63fe75e4b54b',
    username: 'user885244',
    time: 'Palmeiras',
    token: 'VERDAO'
  },
  {
    index: 4,
    assetId: 'a7caf62b-c460-4505-a019-56b6912d4469',
    username: 'user656125',
    time: 'Flamengo',
    token: 'MENGO'
  },
  {
    index: 5,
    assetId: 'b6d93b67-e5a9-42e6-a072-a945eab7ab18',
    username: 'user600115',
    time: 'Internacional',
    token: 'SACI'
  },
];

// Função para limpar valor de env
function cleanEnvValue(value) {
  if (!value) return value;
  return value
    .replace(/^\\"/, '')
    .replace(/\\"$/, '')
    .replace(/^"/, '')
    .replace(/"$/, '');
}

// Verificar configuração do Thirdweb
function validateThirdwebConfig() {
  const vars = [
    'THIRDWEB_ENGINE_URL',
    'THIRDWEB_ENGINE_ACCESS_TOKEN',
    'THIRDWEB_ENGINE_BACKEND_WALLET_ADDRESS',
    'THIRDWEB_NFT_CONTRACT_ADDRESS',
    'THIRDWEB_CHAIN_ID'
  ];

  const present = vars.filter(v => cleanEnvValue(process.env[v]));

  if (present.length === 0) {
    return { configured: false, isValid: true };
  }

  if (present.length === vars.length) {
    return { configured: true, isValid: true };
  }

  return {
    configured: false,
    isValid: false,
    missing: vars.filter(v => !cleanEnvValue(process.env[v]))
  };
}

// Executar mint
async function executeMint(mintConfig) {
  const { assetId, username, time, token, index } = mintConfig;

  console.log('\n' + '='.repeat(60));
  console.log(`🎯 MINT #${index + 1}: ${time} (${token}) → ${username}`);
  console.log('='.repeat(60));

  const client = await pool.connect();

  try {
    // 1. Buscar asset
    console.log('\n📦 Buscando asset...');
    const assetResult = await client.query(
      `SELECT id, nft_id, title, description, image_url, ipfs_image_url, metadata_json, rarity, claimed
       FROM asset WHERE id = $1`,
      [assetId]
    );

    if (assetResult.rows.length === 0) {
      throw new Error(`Asset não encontrado: ${assetId}`);
    }

    const asset = assetResult.rows[0];
    console.log(`   ✅ Asset: ${asset.title} (${asset.rarity})`);

    if (asset.claimed) {
      throw new Error(`Asset já foi claimed!`);
    }
    console.log(`   ✅ Status: Disponível`);

    // 2. Buscar usuário
    console.log('\n👤 Buscando usuário...');
    const userResult = await client.query(
      `SELECT id, wallet_address, privy_user_id, username, display_name
       FROM users WHERE username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      throw new Error(`Usuário não encontrado: ${username}`);
    }

    const user = userResult.rows[0];
    console.log(`   ✅ Usuário: ${user.display_name || user.username}`);
    console.log(`   ✅ Wallet: ${user.wallet_address}`);

    if (!user.wallet_address) {
      throw new Error(`Usuário não tem wallet configurada!`);
    }

    const walletAddress = user.wallet_address.toLowerCase();

    // 3. Executar transação
    console.log('\n💾 Registrando no banco de dados...');
    await client.query('BEGIN');

    // Lock do asset
    const lockCheck = await client.query(
      'SELECT claimed FROM asset WHERE id = $1 FOR UPDATE',
      [assetId]
    );

    if (lockCheck.rows[0]?.claimed) {
      await client.query('ROLLBACK');
      throw new Error('Asset foi claimed por outro processo!');
    }

    // Criar userassetclaims
    await client.query(
      `INSERT INTO userassetclaims (user_id, asset_id, nft_id, claimed_at, privy_user_id, wallet_address)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)`,
      [user.id, assetId, asset.nft_id, user.privy_user_id || 'admin-assigned', walletAddress]
    );
    console.log('   ✅ userassetclaims criado');

    // Marcar asset como claimed
    await client.query(
      'UPDATE asset SET claimed = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [assetId]
    );
    console.log('   ✅ Asset marcado como claimed');

    // Atualizar supply
    await client.query(
      'UPDATE nfts SET claimed_supply = claimed_supply + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [asset.nft_id]
    );
    console.log('   ✅ Supply atualizado');

    // Criar mint log
    const mintLogResult = await client.query(
      `INSERT INTO nft_mint_log (asset_id, user_wallet_address, quantity_minted, status, engine_status, created_at)
       VALUES ($1, $2, 1, 'PENDING_ENGINE_CALL', 'PENDING', CURRENT_TIMESTAMP)
       RETURNING id`,
      [assetId, walletAddress]
    );

    const mintLogId = mintLogResult.rows[0].id;
    console.log(`   ✅ nft_mint_log criado (ID: ${mintLogId})`);

    await client.query('COMMIT');
    console.log('   ✅ Transação commitada');

    // 4. Chamar Thirdweb Engine
    console.log('\n🔗 Chamando Thirdweb Engine...');

    const thirdwebConfig = validateThirdwebConfig();

    if (!thirdwebConfig.configured) {
      console.log('   ⚠️ Thirdweb Engine não configurado - Mint registrado apenas no banco');
      return {
        success: true,
        mintLogId,
        thirdweb: { status: 'SKIPPED', reason: 'Engine não configurado' }
      };
    }

    // Construir payload
    let enginePayload;

    if (asset.metadata_json) {
      try {
        const metadata = JSON.parse(asset.metadata_json);

        if (metadata.ipfs_uri || metadata.metadata_uri) {
          enginePayload = {
            receiver: walletAddress,
            tokenId: assetId,
            metadataUri: metadata.ipfs_uri || metadata.metadata_uri
          };
          console.log(`   📄 Usando metadataUri: ${enginePayload.metadataUri}`);
        } else {
          enginePayload = {
            receiver: walletAddress,
            tokenId: assetId,
            metadata: metadata
          };
          console.log(`   📄 Usando metadata object`);
        }
      } catch (e) {
        enginePayload = buildFallbackPayload(assetId, walletAddress, asset);
      }
    } else {
      enginePayload = buildFallbackPayload(assetId, walletAddress, asset);
    }

    const engineUrl = `${cleanEnvValue(process.env.THIRDWEB_ENGINE_URL)}/contract/${cleanEnvValue(process.env.THIRDWEB_CHAIN_ID)}/${cleanEnvValue(process.env.THIRDWEB_NFT_CONTRACT_ADDRESS)}/erc721/mint-to`;

    console.log(`   🌐 URL: ${engineUrl}`);

    const response = await fetch(engineUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanEnvValue(process.env.THIRDWEB_ENGINE_ACCESS_TOKEN)}`,
        'x-backend-wallet-address': cleanEnvValue(process.env.THIRDWEB_ENGINE_BACKEND_WALLET_ADDRESS)
      },
      body: JSON.stringify(enginePayload),
    });

    const responseData = await response.json();

    if (response.ok && responseData.result?.queueId) {
      const queueId = responseData.result.queueId;

      // Atualizar mint log
      await pool.query(
        `UPDATE nft_mint_log
         SET status = 'ENGINE_QUEUED',
             thirdweb_engine_queue_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [queueId, mintLogId]
      );

      console.log(`   ✅ Engine Queue ID: ${queueId}`);

      // Aguardar e verificar status
      console.log('\n⏳ Aguardando confirmação do Engine...');
      const finalStatus = await waitForMintCompletion(queueId, mintLogId);

      return {
        success: true,
        mintLogId,
        thirdweb: {
          status: finalStatus.status,
          queueId,
          transactionHash: finalStatus.transactionHash,
          explorerUrl: finalStatus.transactionHash
            ? `https://scan.chiliz.com/tx/${finalStatus.transactionHash}`
            : null
        }
      };
    } else {
      const errorMsg = responseData.error?.message || JSON.stringify(responseData);
      console.log(`   ❌ Erro no Engine: ${errorMsg}`);

      await pool.query(
        `UPDATE nft_mint_log
         SET status = 'ENGINE_CALL_FAILED',
             error_message = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [errorMsg, mintLogId]
      );

      return {
        success: false,
        mintLogId,
        thirdweb: { status: 'ENGINE_CALL_FAILED', error: errorMsg }
      };
    }

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.log(`\n❌ ERRO: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

function buildFallbackPayload(assetId, walletAddress, asset) {
  return {
    receiver: walletAddress,
    tokenId: assetId,
    metadata: {
      name: asset.title || `Asset #${assetId}`,
      description: asset.description || `NFT Asset ID ${assetId}`,
      image: asset.ipfs_image_url || asset.image_url || '',
      attributes: [
        { trait_type: 'Asset ID', value: assetId },
        { trait_type: 'Rarity', value: asset.rarity || 'Common' }
      ]
    }
  };
}

async function waitForMintCompletion(queueId, mintLogId, maxAttempts = 30) {
  const statusUrl = `${cleanEnvValue(process.env.THIRDWEB_ENGINE_URL)}/transaction/status/${queueId}`;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos

    try {
      const response = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${cleanEnvValue(process.env.THIRDWEB_ENGINE_ACCESS_TOKEN)}`
        }
      });

      if (!response.ok) continue;

      const data = await response.json();
      const result = data.result;

      if (!result) continue;

      const { status, transactionHash, blockNumber, gasUsed } = result;

      process.stdout.write(`\r   Status: ${status}${' '.repeat(20)}`);

      if (status === 'mined') {
        console.log(`\n   ✅ MINTADO com sucesso!`);
        console.log(`   📋 Transaction Hash: ${transactionHash}`);
        console.log(`   🔗 Explorer: https://scan.chiliz.com/tx/${transactionHash}`);

        // Atualizar banco
        await pool.query(
          `UPDATE nft_mint_log
           SET engine_status = 'MINTED',
               transaction_hash = $1,
               block_number = $2,
               gas_used = $3,
               minted_at = CURRENT_TIMESTAMP,
               last_checked_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [transactionHash, blockNumber, gasUsed, mintLogId]
        );

        return { status: 'MINTED', transactionHash, blockNumber };
      }

      if (status === 'errored' || status === 'cancelled') {
        console.log(`\n   ❌ Falha: ${status}`);

        await pool.query(
          `UPDATE nft_mint_log
           SET engine_status = $1,
               last_checked_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [status === 'errored' ? 'FAILED' : 'CANCELLED', mintLogId]
        );

        return { status: status.toUpperCase() };
      }

    } catch (e) {
      // Continua tentando
    }
  }

  console.log('\n   ⚠️ Timeout aguardando confirmação');
  return { status: 'PENDING' };
}

// Main
async function main() {
  const indexArg = process.argv[2];

  if (indexArg === undefined) {
    console.log('\n📋 LISTA DE MINTS DISPONÍVEIS:\n');
    MINTS.forEach((m, i) => {
      console.log(`   ${i}: ${m.time} (${m.token}) → ${m.username}`);
    });
    console.log('\n💡 Uso: node scripts/admin-mint-interactive.js <índice>');
    console.log('   Exemplo: node scripts/admin-mint-interactive.js 0\n');
    await pool.end();
    return;
  }

  const index = parseInt(indexArg);

  if (isNaN(index) || index < 0 || index >= MINTS.length) {
    console.log(`\n❌ Índice inválido: ${indexArg}`);
    console.log(`   Índices válidos: 0-${MINTS.length - 1}\n`);
    await pool.end();
    return;
  }

  const mint = MINTS[index];
  const result = await executeMint(mint);

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADO:');
  console.log('='.repeat(60));
  console.log(JSON.stringify(result, null, 2));

  if (result.success && index < MINTS.length - 1) {
    console.log(`\n✅ Mint #${index + 1} concluído!`);
    console.log(`\n🔜 Próximo: Mint #${index + 2}: ${MINTS[index + 1].time} (${MINTS[index + 1].token}) → ${MINTS[index + 1].username}`);
    console.log(`   Execute: node scripts/admin-mint-interactive.js ${index + 1}\n`);
  } else if (result.success && index === MINTS.length - 1) {
    console.log('\n🎉 TODOS OS MINTS CONCLUÍDOS!\n');
  }

  await pool.end();
}

main().catch(err => {
  console.error('Erro fatal:', err);
  pool.end();
  process.exit(1);
});
