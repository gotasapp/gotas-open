import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { generateRandomUserData, generateDisplayNameFromEmail, generateUsernameFromWallet } from '@/utils/user-generator';
import { getCleanEnv, validateThirdwebConfig } from '@/lib/env-validator';

// Log de verificação de deploy - REMOVER APÓS CONFIRMAR
console.error(`[DEPLOY CHECK] claim-asset route carregado em: ${new Date().toISOString()}`);

export const runtime = 'nodejs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL não está definida. Configure as variáveis de ambiente.');
}

const pool = new Pool({
  connectionString,
});

interface ClaimAssetRequestBody {
  nftId: number;
  privyUserId: string; // Privy user ID (geralmente um UUID)
  userWalletAddress: string; // Endereço da carteira do usuário
  userEmail?: string; // Email do usuário, opcional
  userName?: string; // Nome de usuário derivado, opcional
}

export async function POST(request: NextRequest) {
  // Log no início para confirmar que a requisição chegou
  console.error(`[CLAIM-ASSET] Requisição recebida em ${new Date().toISOString()}`);
  
  let client;
  let mainDbTransactionCommitted = false; // Flag para saber se a transação principal foi commitada

  try {
    const body = await request.json() as ClaimAssetRequestBody;
    let { nftId, privyUserId, userWalletAddress, userEmail, userName } = body;
    
    // IMPORTANTE: Normalizar wallet para lowercase para evitar duplicações
    userWalletAddress = userWalletAddress?.toLowerCase();
    
    console.error(`[CLAIM-ASSET] Dados recebidos - NFT ID: ${nftId}, Wallet normalizado: ${userWalletAddress}`);

    if (!nftId || !privyUserId || !userWalletAddress) {
      return NextResponse.json({ error: 'nftId, privyUserId e userWalletAddress são obrigatórios' }, { status: 400 });
    }

    client = await pool.connect();
    try {
      // Etapa Pré-Transação: Buscar dados do NFT e fazer verificações de regras
      const nftDetailsQuery = 'SELECT max_per_user, cooldown_minutes FROM nfts WHERE id = $1';
      const nftDetailsResult = await client.query(nftDetailsQuery, [nftId]);

      if (nftDetailsResult.rows.length === 0) {
        return NextResponse.json({ error: 'NFT não encontrado para aplicar regras.' }, { status: 404 });
      }
      const nftData = nftDetailsResult.rows[0];
      const maxPerUser = nftData.max_per_user;
      const cooldownMinutes = nftData.cooldown_minutes;

      // Verificar limite de claims por usuário
      // Se cooldown_minutes = 0: limite absoluto total
      // Se cooldown_minutes > 0: limite por período de cooldown
      if (cooldownMinutes === 0) {
        // Limite absoluto total - conta todos os claims já feitos
        const countUserClaimsQuery = `
          SELECT COUNT(*) as claim_count
          FROM userassetclaims
          WHERE privy_user_id = $1 AND nft_id = $2;
        `;
        const countUserClaimsResult = await client.query(countUserClaimsQuery, [privyUserId, nftId]);
        const currentClaimCount = parseInt(countUserClaimsResult.rows[0].claim_count, 10);

        if (currentClaimCount >= maxPerUser) {
          return NextResponse.json({ error: 'Limite de claims por usuário atingido para este NFT.' }, { status: 403 });
        }
      } else {
        // Com cooldown: verificar se já atingiu o limite no período atual
        // Primeiro verifica se existe um claim anterior
        const lastClaimQuery = `
          SELECT MAX(claimed_at) as last_claimed_at, COUNT(*) as total_claims
          FROM userassetclaims
          WHERE privy_user_id = $1 AND nft_id = $2;
        `;
        const lastClaimResult = await client.query(lastClaimQuery, [privyUserId, nftId]);
        const lastClaimedAt = lastClaimResult.rows[0]?.last_claimed_at;
        const totalClaims = parseInt(lastClaimResult.rows[0]?.total_claims || '0', 10);

        if (lastClaimedAt) {
          const cooldownEndTime = new Date(new Date(lastClaimedAt).getTime() + cooldownMinutes * 60 * 1000);
          
          if (new Date() < cooldownEndTime) {
            // Ainda em cooldown
            const remainingTime = Math.ceil((cooldownEndTime.getTime() - new Date().getTime()) / 1000);
            return NextResponse.json({ 
              error: 'Você precisa esperar para resgatar este NFT novamente.',
              cooldownActive: true,
              remainingSeconds: remainingTime,
              cooldownEndsAt: cooldownEndTime.toISOString()
            }, { status: 403 });
          }
          // Cooldown expirou, pode fazer novo claim (não precisa verificar max_per_user pois é por período)
        } else if (totalClaims >= maxPerUser) {
          // Primeira vez mas já atingiu limite (caso edge)
          return NextResponse.json({ error: 'Limite de claims por usuário atingido para este NFT.' }, { status: 403 });
        }
      }

      await client.query('BEGIN');

      const selectAssetQuery = `
        SELECT id
        FROM asset
        WHERE nft_id = $1 AND claimed = FALSE
        ORDER BY RANDOM()
        LIMIT 1 FOR UPDATE; 
      `;
      const assetResult = await client.query(selectAssetQuery, [nftId]);

      if (assetResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Nenhum asset disponível para este NFT ou NFT não encontrado.' }, { status: 404 });
      }

      const assetId = assetResult.rows[0].id;

      let numericUserId: number | null = null;
      
      // Primeiro tentar buscar por wallet (normalizado para lowercase)
      const userSelectQuery = 'SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)';
      let userResult = await client.query(userSelectQuery, [userWalletAddress]);

      if (userResult.rows.length > 0) {
        numericUserId = userResult.rows[0].id;
      } else if (userEmail) {
        // Se não encontrou por wallet mas tem email, verificar se existe usuário com esse email
        const userByEmailQuery = 'SELECT id FROM users WHERE email = $1';
        const userByEmailResult = await client.query(userByEmailQuery, [userEmail]);
        
        if (userByEmailResult.rows.length > 0) {
          // Usuário já existe com esse email, atualizar o wallet_address (normalizado)
          numericUserId = userByEmailResult.rows[0].id;
          const updateUserQuery = 'UPDATE users SET wallet_address = LOWER($1), updated_at = CURRENT_TIMESTAMP WHERE id = $2';
          await client.query(updateUserQuery, [userWalletAddress, numericUserId]);
          console.log(`Wallet atualizada (normalizada) para usuário existente com id: ${numericUserId}, email: ${userEmail}, wallet: ${userWalletAddress}`);
        }
      }
      
      // Se ainda não tem usuário, criar novo
      if (!numericUserId) {
        // Gerar dados automaticamente se não foram fornecidos
        let displayName = userName;
        let username = userName;

        if (!displayName) {
          if (userEmail) {
            // Se tem email, gera nome baseado no email
            displayName = generateDisplayNameFromEmail(userEmail);
          } else {
            // Se não tem nada, gera dados completamente aleatórios
            const generatedData = generateRandomUserData();
            displayName = generatedData.displayName;
            username = generatedData.username;
          }
        }

        // Se ainda não tem username, gera um
        if (!username) {
          if (displayName) {
            // Gera username baseado no display name (simplificado para esta API)
            username = displayName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);
          } else {
            username = generateUsernameFromWallet(userWalletAddress);
          }
        }

        const insertUserQuery = `
          INSERT INTO users (wallet_address, email, username, display_name)
          VALUES (LOWER($1), $2, $3, $4) RETURNING id
        `;
        userResult = await client.query(insertUserQuery, [
          userWalletAddress, 
          userEmail || null, 
          username,
          displayName
        ]);
        numericUserId = userResult.rows[0].id;
        console.log(`Novo usuário criado com id: ${numericUserId} para wallet: ${userWalletAddress}, email: ${userEmail}, username: ${username}, displayName: ${displayName}`);
      }

      const insertClaimQuery = `
        INSERT INTO userassetclaims (user_id, asset_id, nft_id, claimed_at, privy_user_id, wallet_address)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5);
      `;
      await client.query(insertClaimQuery, [numericUserId, assetId, nftId, privyUserId, userWalletAddress]);

      // Marcar o asset como claimed
      const updateAssetQuery = `
        UPDATE asset
        SET claimed = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1;
      `;
      await client.query(updateAssetQuery, [assetId]);

      const updateNftSupplyQuery = `
        UPDATE nfts
        SET claimed_supply = claimed_supply + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1;
      `;
      await client.query(updateNftSupplyQuery, [nftId]);

      await client.query('COMMIT'); 
      mainDbTransactionCommitted = true;

      // Buscar os dados completos do asset que foi claimado
      const claimedAssetQuery = `
        SELECT id, title, description, image_url, rarity, nft_number
        FROM asset
        WHERE id = $1;
      `;
      const claimedAssetResult = await client.query(claimedAssetQuery, [assetId]);
      const claimedAsset = claimedAssetResult.rows[0];

      // Retornar a resposta de sucesso do claim ANTES de iniciar o mint assíncrono
      // para não prender a requisição do usuário.
      // É crucial que esta seja a ÚLTIMA operação que pode retornar um NextResponse
      // diretamente para esta chamada de função POST.
      const successResponse = NextResponse.json({ 
        message: 'Asset reivindicado com sucesso! Processo de mint do NFT foi iniciado em segundo plano.', 
        assetId: assetId,
        claimedAsset: {
          id: claimedAsset.id,
          title: claimedAsset.title,
          description: claimedAsset.description,
          imageUrl: claimedAsset.image_url,
          rarity: claimedAsset.rarity,
          nftNumber: claimedAsset.nft_number
        }
      }, { status: 200 });

      // ****** INÍCIO DA LÓGICA DE MINT ASSÍNCRONO (FIRE-AND-FORGET) ******
      (async (currentAssetId: string, walletAddress: string) => {
        // Usando console.error para garantir que apareça em produção
        console.error(`[MINT ASYNC] ===== INICIANDO PROCESSO DE MINT =====`);
        console.error(`[MINT ASYNC] Asset ID: ${currentAssetId}, Wallet: ${walletAddress}`);
        console.error(`[MINT ASYNC] Timestamp: ${new Date().toISOString()}`);
        console.error(`[MINT ASYNC] NODE_ENV: ${process.env.NODE_ENV}`);
        
        let mintLogClient;
        let mintLogId: string | null = null;

        // Validar configuração do Thirdweb antes de prosseguir
        const thirdwebValidation = validateThirdwebConfig();
        console.error(`[MINT ASYNC] Validação Thirdweb - Configurado: ${thirdwebValidation.configured}, Válido: ${thirdwebValidation.isValid}`);
        
        if (!thirdwebValidation.configured) {
          console.error('[MINT ASYNC] Thirdweb Engine não está configurado. Pulando processo de mint.');
          return;
        }
        
        if (!thirdwebValidation.isValid) {
          console.error('[MINT ASYNC ERROR] Configuração do Thirdweb Engine está incompleta. Variáveis faltando:', thirdwebValidation.missing);
          return;
        }

        // Log das variáveis de ambiente (sem valores sensíveis completos)
        console.error(`[MINT ASYNC] Variáveis de ambiente detectadas:`);
        console.error(`[MINT ASYNC] - ENGINE_URL: ${getCleanEnv('THIRDWEB_ENGINE_URL')?.substring(0, 30)}...`);
        console.error(`[MINT ASYNC] - CHAIN_ID: ${getCleanEnv('THIRDWEB_CHAIN_ID')}`);
        console.error(`[MINT ASYNC] - CONTRACT: ${getCleanEnv('THIRDWEB_NFT_CONTRACT_ADDRESS')}`);
        console.error(`[MINT ASYNC] - BACKEND_WALLET: ${getCleanEnv('THIRDWEB_ENGINE_BACKEND_WALLET_ADDRESS')}`);

        try {
          mintLogClient = await pool.connect();
          await mintLogClient.query('BEGIN');

          // Passo 1: Registrar a tentativa de mint (status inicial: 'PENDING_ENGINE_CALL')
          console.error(`[MINT ASYNC] Registrando log inicial do mint...`);
          const initialLogQuery = `
            INSERT INTO nft_mint_log (asset_id, user_wallet_address, quantity_minted, status)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
          `;
          const initialLogResult = await mintLogClient.query(initialLogQuery, [currentAssetId, walletAddress, 1, 'PENDING_ENGINE_CALL']);
          mintLogId = initialLogResult.rows[0].id;
          await mintLogClient.query('COMMIT');
          console.error(`[MINT ASYNC] Log inicial registrado com ID: ${mintLogId}`);
        } catch (logError: any) {
          console.error('[MINT ASYNC ERROR] Erro ao registrar log inicial do mint:', logError);
          console.error('[MINT ASYNC ERROR] Detalhes do erro:', logError.message, logError.stack);
          if (mintLogClient) {
            try {
              await mintLogClient.query('ROLLBACK');
            } catch (rbError) {
              console.error('[MINT ASYNC ERROR] Erro ao fazer rollback do log inicial:', rbError);
            }
          }
          // Não propagar o erro aqui, pois a operação principal já foi confirmada ao usuário
          return; // Termina a função anônima
        } finally {
          if (mintLogClient) {
            mintLogClient.release();
          }
        }

        // Se chegamos aqui, o log inicial foi bem-sucedido e temos um mintLogId.
        // Proceder com a chamada ao Thirdweb Engine.
        if (!mintLogId) {
          console.error('[MINT ASYNC ERROR] mintLogId não foi definido, abortando chamada ao Engine.');
          return;
        }
        
        let assetForEngine;
        try {
          // Buscar os detalhes completos do asset
          console.error(`[MINT ASYNC] Buscando dados completos do asset ${currentAssetId}...`);
          const assetQueryEngine = 'SELECT id, title, description, image_url, ipfs_image_url, rarity, metadata_json FROM asset WHERE id = $1 LIMIT 1';
          const assetResultEngine = await pool.query(assetQueryEngine, [currentAssetId]);

          if (assetResultEngine.rows.length === 0) {
            throw new Error('Asset não encontrado para a chamada ao Engine.');
          }
          assetForEngine = assetResultEngine.rows[0];
          console.error(`[MINT ASYNC] Asset encontrado: ${assetForEngine.title}, Rarity: ${assetForEngine.rarity}`);
          console.error(`[MINT ASYNC] IPFS Image URL:`, assetForEngine.ipfs_image_url || 'Not available');
          console.error(`[MINT ASYNC] S3 Image URL:`, assetForEngine.image_url || 'Not available');
          console.error(`[MINT ASYNC] Metadata JSON:`, assetForEngine.metadata_json);

          // Verificar se temos metadata_json com IPFS URI
          let enginePayload: any;
          
          if (assetForEngine.metadata_json && typeof assetForEngine.metadata_json === 'string') {
            try {
              const metadata = JSON.parse(assetForEngine.metadata_json);
              
              // Se o metadata_json contém um IPFS URI, usar metadataUri
              if (metadata.ipfs_uri || metadata.metadata_uri || (metadata.image && metadata.image.startsWith('ipfs://'))) {
                enginePayload = {
                  receiver: walletAddress,
                  tokenId: currentAssetId,
                  metadataUri: metadata.ipfs_uri || metadata.metadata_uri || metadata.image
                };
                console.error(`[MINT ASYNC] Usando metadataUri do IPFS:`, enginePayload.metadataUri);
              } else {
                // Caso contrário, usar o metadata object tradicional
                enginePayload = {
                  receiver: walletAddress,
                  tokenId: currentAssetId,
                  metadata: metadata
                };
                console.error(`[MINT ASYNC] Usando metadata object do metadata_json`);
              }
            } catch (parseError) {
              console.error(`[MINT ASYNC] Erro ao parsear metadata_json:`, parseError);
              // Fallback para o payload original
              enginePayload = {
                receiver: walletAddress,
                tokenId: currentAssetId,
                metadata: {
                  name: assetForEngine.title || `Asset #${currentAssetId}`,
                  description: assetForEngine.description || `NFT Asset ID ${currentAssetId}`,
                  image: assetForEngine.ipfs_image_url || assetForEngine.image_url || '',
                  attributes: [
                    {
                      trait_type: 'Asset ID',
                      value: currentAssetId
                    },
                    {
                      trait_type: 'Rarity',
                      value: assetForEngine.rarity || 'Common'
                    }
                  ]
                }
              };
            }
          } else {
            // Se não tem metadata_json, usar o payload tradicional
            enginePayload = {
              receiver: walletAddress,
              tokenId: currentAssetId,
              metadata: {
                name: assetForEngine.title || `Asset #${currentAssetId}`,
                description: assetForEngine.description || `NFT Asset ID ${currentAssetId}`,
                image: assetForEngine.ipfs_image_url || assetForEngine.image_url || '',
                attributes: [
                  {
                    trait_type: 'Asset ID',
                    value: currentAssetId
                  },
                  {
                    trait_type: 'Rarity',
                    value: assetForEngine.rarity || 'Common'
                  }
                ]
              }
            };
          }

          console.error(`[MINT ASYNC] Payload construído:`, JSON.stringify(enginePayload, null, 2));

          const engineUrl = `${getCleanEnv('THIRDWEB_ENGINE_URL')}/contract/${getCleanEnv('THIRDWEB_CHAIN_ID')}/${getCleanEnv('THIRDWEB_NFT_CONTRACT_ADDRESS')}/erc721/mint-to`;
          console.error(`[MINT ASYNC] URL do Engine: ${engineUrl}`);

          const headersForEngine: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getCleanEnv('THIRDWEB_ENGINE_ACCESS_TOKEN')}`,
            'x-backend-wallet-address': getCleanEnv('THIRDWEB_ENGINE_BACKEND_WALLET_ADDRESS')!
          };

          console.error(`[MINT ASYNC] Headers (sem token):`, {
            'Content-Type': headersForEngine['Content-Type'],
            'Authorization': 'Bearer ***',
            'x-backend-wallet-address': headersForEngine['x-backend-wallet-address']
          });

          console.error(`[MINT ASYNC] Fazendo chamada para o Thirdweb Engine...`);
          const startTime = Date.now();
          
          const engineResponse = await fetch(engineUrl, {
            method: 'POST',
            headers: headersForEngine,
            body: JSON.stringify(enginePayload),
          });

          const endTime = Date.now();
          console.error(`[MINT ASYNC] Resposta recebida em ${endTime - startTime}ms - Status: ${engineResponse.status}`);

          const engineResponseData = await engineResponse.json();
          console.error(`[MINT ASYNC] Resposta completa:`, JSON.stringify(engineResponseData, null, 2));

          mintLogClient = await pool.connect(); // Reabrir conexão para atualizar o log
          try {
            await mintLogClient.query('BEGIN');
            if (engineResponse.ok && engineResponseData.result && engineResponseData.result.queueId) {
              const updateLogSuccessQuery = `
                UPDATE nft_mint_log
                SET status = $1, thirdweb_engine_queue_id = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3;
              `;
              await mintLogClient.query(updateLogSuccessQuery, ['ENGINE_QUEUED', engineResponseData.result.queueId, mintLogId]);
              console.error(`[MINT ASYNC SUCCESS] ✅ Mint para asset ${currentAssetId} enfileirado no Engine. Queue ID: ${engineResponseData.result.queueId}`);
            } else {
              const errorMessage = engineResponseData.error?.message || JSON.stringify(engineResponseData);
              const updateLogErrorQuery = `
                UPDATE nft_mint_log
                SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3;
              `;
              await mintLogClient.query(updateLogErrorQuery, ['ENGINE_CALL_FAILED', `Status: ${engineResponse.status} - ${errorMessage}`, mintLogId]);
              console.error(`[MINT ASYNC ERROR] ❌ Falha na chamada ao Engine para asset ${currentAssetId}. Status: ${engineResponse.status}`, engineResponseData);
            }
            await mintLogClient.query('COMMIT');
          } catch (updateLogError: any) {
            console.error('[MINT ASYNC ERROR] Erro ao ATUALIZAR log do mint APÓS chamada ao Engine:', updateLogError);
            console.error('[MINT ASYNC ERROR] Detalhes:', updateLogError.message, updateLogError.stack);
            if (mintLogClient) await mintLogClient.query('ROLLBACK');
          } finally {
            if (mintLogClient) mintLogClient.release();
          }

        } catch (engineCallError: any) {
          console.error('[MINT ASYNC ERROR] Erro durante a preparação ou chamada ao Thirdweb Engine:', engineCallError);
          console.error('[MINT ASYNC ERROR] Stack trace:', engineCallError.stack);
          console.error('[MINT ASYNC ERROR] Mensagem completa:', engineCallError.message);
          // Tentar atualizar o log com o erro, se mintLogId estiver disponível
          if (mintLogId) {
            mintLogClient = await pool.connect(); // Reabrir conexão para atualizar o log
            try {
              await mintLogClient.query('BEGIN');
              const updateLogErrorQuery = `
                UPDATE nft_mint_log
                SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3;
              `;
              await mintLogClient.query(updateLogErrorQuery, ['ENGINE_CALL_PREP_FAILED', engineCallError.message || 'Erro desconhecido na preparação', mintLogId]);
              await mintLogClient.query('COMMIT');
            } catch (finalLogError: any) {
              console.error('[MINT ASYNC ERROR] Erro ao ATUALIZAR log do mint no catch principal do Engine call:', finalLogError);
              if (mintLogClient) await mintLogClient.query('ROLLBACK');
            } finally {
              if (mintLogClient) mintLogClient.release();
            }
          }
        }
        
        console.error(`[MINT ASYNC] ===== FIM DO PROCESSO DE MINT =====`);
      })(assetId, userWalletAddress); // Passar assetId e userWalletAddress para a IIFE
      // ****** FIM DA LÓGICA DE MINT ASSÍNCRONO ******

      // Log para confirmar que a resposta foi enviada
      console.error(`[CLAIM SUCCESS] Asset ${assetId} reivindicado com sucesso. Mint iniciado em background.`);

      return successResponse; // Retorna a resposta de sucesso do claim

    } catch (dbError: any) {
      if (client && !mainDbTransactionCommitted) await client.query('ROLLBACK'); // Só faz rollback se o commit principal não ocorreu
      console.error('Erro na transação do banco de dados ao reivindicar asset:', dbError);
      // Se o erro ocorreu ANTES de enviar a resposta, podemos retornar um erro.
      // Se ocorreu DEPOIS (na parte assíncrona), já foi logado.
      if (!mainDbTransactionCommitted) { // Se a resposta ainda não foi enviada.
          return NextResponse.json(
            { error: 'Falha ao reivindicar asset no banco de dados', details: dbError.message || dbError },
            { status: 500 }
          );
      }
    } finally {
      if (client) client.release();
    }
  } catch (error: any) {
    console.error('Erro ao processar requisição POST para /api/mint/claim-asset:', error);
    // Se a resposta ainda não foi enviada (erro antes do try principal do DB).
    if (!mainDbTransactionCommitted) {
        return NextResponse.json(
          { error: 'Falha ao processar requisição', details: error.message || error },
          { status: 500 }
        );
    }
  }
  // Se a execução chegar aqui, significa que a resposta original já foi enviada (200 OK)
  // e a parte assíncrona está sendo processada.
  // Não há mais nada a retornar explicitamente.
} 