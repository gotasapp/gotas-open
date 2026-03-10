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

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação admin
    const adminAuthCookie = request.cookies.get('adminAuth')?.value;
    
    // Verificar se temos as credenciais no ENV
    const adminEmail = getValidatedEnvConfig().ADMIN_EMAIL;
    const adminPassword = getValidatedEnvConfig().ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Admin credentials not configured' },
        { status: 500 }
      );
    }
    
    // Verificar se o cookie tem o hash correto das credenciais
    const expectedHash = await createSecureHash(
      `${adminEmail}:${adminPassword}`
    );

    if (!adminAuthCookie || adminAuthCookie !== expectedHash) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const sort = searchParams.get('sort') || 'created_desc';

    // Construir query
    let sqlQuery = `
      SELECT 
        ml.id,
        ml.thirdweb_engine_queue_id as queue_id,
        ml.asset_id as nft_id,
        COALESCE(n.name, a.title, 'NFT sem nome') as nft_name,
        ml.user_wallet_address as user_wallet,
        ml.engine_status,
        ml.transaction_hash,
        ml.block_number,
        ml.error_message,
        ml.retry_count,
        ml.created_at,
        ml.minted_at,
        ml.last_checked_at,
        ml.webhook_received_at,
        CASE 
          WHEN ml.engine_status = 'MINTED' THEN 'success'
          WHEN ml.engine_status = 'FAILED' OR ml.status LIKE '%FAILED%' THEN 'error'
          WHEN ml.engine_status = 'CANCELLED' THEN 'cancelled'
          WHEN ml.last_checked_at < NOW() - INTERVAL '30 minutes' THEN 'stale'
          ELSE 'pending'
        END as status_category,
        EXTRACT(EPOCH FROM (COALESCE(ml.minted_at, NOW()) - ml.created_at)) as processing_time_seconds
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      WHERE n.id IS NOT NULL
    `;

    const params: any[] = [];
    let paramCount = 0;

    // Filtro por status
    if (status && status !== 'all') {
      paramCount++;
      sqlQuery += ` AND ml.engine_status = $${paramCount}`;
      params.push(status);
    }

    // Filtro por busca
    if (search) {
      paramCount++;
      sqlQuery += ` AND (
        ml.thirdweb_engine_queue_id ILIKE $${paramCount} OR 
        ml.user_wallet_address ILIKE $${paramCount} OR 
        ml.asset_id::text ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    // Ordenação
    const sortMap: Record<string, string> = {
      'created_desc': 'ml.created_at DESC',
      'created_asc': 'ml.created_at ASC',
      'status_asc': 'ml.engine_status ASC',
      'status_desc': 'ml.engine_status DESC',
      'nft_name_asc': 'nft_name ASC',
      'nft_name_desc': 'nft_name DESC'
    };
    
    const orderBy = sortMap[sort] || 'ml.created_at DESC';
    sqlQuery += ` ORDER BY ${orderBy} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    // Executar query
    const result = await query(sqlQuery, params);

    // Contar total
    let countQuery = `
      SELECT COUNT(*) as total
      FROM nft_mint_log ml
      LEFT JOIN asset a ON ml.asset_id::uuid = a.id
      LEFT JOIN nfts n ON a.nft_id = n.id
      WHERE n.id IS NOT NULL
    `;

    const countParams: any[] = [];
    paramCount = 0;

    if (status && status !== 'all') {
      paramCount++;
      countQuery += ` AND ml.engine_status = $${paramCount}`;
      countParams.push(status);
    }

    if (search) {
      paramCount++;
      countQuery += ` AND (
        ml.thirdweb_engine_queue_id ILIKE $${paramCount} OR 
        ml.user_wallet_address ILIKE $${paramCount} OR 
        ml.asset_id::text ILIKE $${paramCount}
      )`;
      countParams.push(`%${search}%`);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    return NextResponse.json({
      mints: result.rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('[Admin Mints API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}