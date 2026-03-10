import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-pool';
import { getValidatedEnvConfig } from '@/lib/env-validator';

// Função para criar hash seguro usando Web Crypto API
async function createSecureHash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function POST(request: NextRequest) {
  console.log('[DEBUG SEND] ===== INICIANDO DEBUG =====');
  
  try {
    // Verificar autenticação admin
    const adminAuthCookie = request.cookies.get('adminAuth')?.value;
    
    const adminEmail = getValidatedEnvConfig().ADMIN_EMAIL;
    const adminPassword = getValidatedEnvConfig().ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Admin credentials not configured' },
        { status: 500 }
      );
    }
    
    const expectedHash = await createSecureHash(`${adminEmail}:${adminPassword}`);

    if (!adminAuthCookie || adminAuthCookie !== expectedHash) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { assetId } = await request.json();
    console.log(`[DEBUG SEND] Asset ID recebido: ${assetId}`);

    // 1. Verificar conexão com banco
    console.log('[DEBUG SEND] Testando conexão com banco...');
    try {
      const testResult = await query('SELECT NOW() as current_time');
      console.log('[DEBUG SEND] Conexão OK:', testResult.rows[0].current_time);
    } catch (dbError) {
      console.error('[DEBUG SEND] Erro na conexão com banco:', dbError);
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: dbError
      }, { status: 500 });
    }

    // 2. Verificar se existe a tabela asset
    console.log('[DEBUG SEND] Verificando tabelas do banco...');
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('asset', 'assets', 'nft_mint_log')
      ORDER BY table_name
    `);
    console.log('[DEBUG SEND] Tabelas encontradas:', tablesResult.rows);

    // 3. Verificar estrutura da tabela asset
    console.log('[DEBUG SEND] Verificando estrutura da tabela asset...');
    const columnsResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'asset'
      ORDER BY ordinal_position
    `);
    console.log('[DEBUG SEND] Colunas da tabela asset:', columnsResult.rows);

    // 4. Buscar o asset específico
    console.log(`[DEBUG SEND] Buscando asset ${assetId}...`);
    let assetData;
    try {
      const assetResult = await query(
        'SELECT * FROM asset WHERE id = $1',
        [assetId]
      );
      
      if (assetResult.rows.length === 0) {
        // Tentar buscar alguns assets para debug
        console.log('[DEBUG SEND] Asset não encontrado. Listando primeiros 5 assets...');
        const sampleAssets = await query('SELECT id, title FROM asset LIMIT 5');
        console.log('[DEBUG SEND] Assets disponíveis:', sampleAssets.rows);
        
        return NextResponse.json({ 
          error: 'Asset not found',
          assetId: assetId,
          availableAssets: sampleAssets.rows
        }, { status: 404 });
      }
      
      assetData = assetResult.rows[0];
      console.log('[DEBUG SEND] Asset encontrado:', {
        id: assetData.id,
        title: assetData.title,
        description: assetData.description,
        hasImage: !!assetData.image_url || !!assetData.image
      });
    } catch (assetError) {
      console.error('[DEBUG SEND] Erro ao buscar asset:', assetError);
      return NextResponse.json({ 
        error: 'Error fetching asset',
        details: assetError
      }, { status: 500 });
    }

    // 5. Buscar dados do mint relacionado
    console.log(`[DEBUG SEND] Buscando dados do mint para asset ${assetId}...`);
    let mintData;
    try {
      const mintResult = await query(
        'SELECT * FROM nft_mint_log WHERE asset_id = $1 ORDER BY created_at DESC LIMIT 1',
        [assetId]
      );
      
      if (mintResult.rows.length === 0) {
        console.log('[DEBUG SEND] Nenhum registro de mint encontrado para este asset');
        
        // Verificar alguns registros de mint para debug
        const sampleMints = await query(`
          SELECT id, asset_id, user_wallet_address, thirdweb_engine_queue_id, engine_status
          FROM nft_mint_log 
          LIMIT 5
        `);
        console.log('[DEBUG SEND] Amostra de mints:', sampleMints.rows);
      } else {
        mintData = mintResult.rows[0];
        console.log('[DEBUG SEND] Mint encontrado:', {
          id: mintData.id,
          queue_id: mintData.thirdweb_engine_queue_id,
          status: mintData.engine_status,
          wallet: mintData.user_wallet_address
        });
      }
    } catch (mintError) {
      console.error('[DEBUG SEND] Erro ao buscar mint:', mintError);
    }

    // 6. Verificar configuração do Thirdweb
    console.log('[DEBUG SEND] Verificando configuração do Thirdweb Engine...');
    const engineUrl = process.env.THIRDWEB_ENGINE_URL;
    const accessToken = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
    const backendWallet = process.env.THIRDWEB_ENGINE_BACKEND_WALLET_ADDRESS;
    const contractAddress = process.env.THIRDWEB_NFT_CONTRACT_ADDRESS;
    const chainId = process.env.THIRDWEB_CHAIN_ID || '88888';

    console.log('[DEBUG SEND] Configuração:', {
      hasEngineUrl: !!engineUrl,
      hasAccessToken: !!accessToken,
      hasBackendWallet: !!backendWallet,
      hasContractAddress: !!contractAddress,
      chainId: chainId,
      engineUrlStart: engineUrl?.substring(0, 30) + '...'
    });

    // 7. Montar payload de teste
    const testPayload = {
      recipient: mintData?.user_wallet_address || '0x0000000000000000000000000000000000000000',
      tokenId: assetData.id.toString(),
      metadata: {
        name: assetData.title || `Asset #${assetData.id}`,
        description: assetData.description || `NFT Asset ID ${assetData.id}`,
        image: assetData.image_url || assetData.image || '',
        attributes: [
          {
            trait_type: 'Asset ID',
            value: assetData.id
          },
          {
            trait_type: 'Debug Test',
            value: true
          }
        ]
      }
    };

    console.log('[DEBUG SEND] Payload de teste:', JSON.stringify(testPayload, null, 2));

    // Retornar relatório completo
    return NextResponse.json({
      success: true,
      debug: {
        assetId: assetId,
        assetFound: !!assetData,
        mintFound: !!mintData,
        thirdwebConfigured: !!(engineUrl && accessToken && backendWallet && contractAddress),
        assetDetails: assetData ? {
          id: assetData.id,
          title: assetData.title,
          hasImage: !!assetData.image_url || !!assetData.image
        } : null,
        mintDetails: mintData ? {
          id: mintData.id,
          queue_id: mintData.thirdweb_engine_queue_id,
          status: mintData.engine_status,
          wallet: mintData.user_wallet_address
        } : null,
        testPayload: testPayload
      }
    });

  } catch (error) {
    console.error('[DEBUG SEND] Erro geral:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    console.log('[DEBUG SEND] ===== FIM DO DEBUG =====');
  }
}