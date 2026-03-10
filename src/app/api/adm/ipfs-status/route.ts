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

    // Estatísticas gerais
    const totalResult = await query('SELECT COUNT(*) as total FROM asset');
    const total = parseInt(totalResult.rows[0].total);

    const withIpfsResult = await query('SELECT COUNT(*) as count FROM asset WHERE ipfs_image_url IS NOT NULL');
    const withIpfs = parseInt(withIpfsResult.rows[0].count);

    const withoutIpfsResult = await query('SELECT COUNT(*) as count FROM asset WHERE ipfs_image_url IS NULL');
    const withoutIpfs = parseInt(withoutIpfsResult.rows[0].count);

    // Assets sem IPFS mas com metadata_json
    const candidatesResult = await query(`
      SELECT COUNT(*) as count 
      FROM asset 
      WHERE ipfs_image_url IS NULL 
        AND metadata_json IS NOT NULL
    `);
    const candidates = parseInt(candidatesResult.rows[0].count);

    // Amostra de assets sem IPFS
    const sampleResult = await query(`
      SELECT 
        id,
        title,
        image_url,
        CASE 
          WHEN metadata_json IS NULL THEN 'No metadata_json'
          WHEN metadata_json::text LIKE '%ipfs_uri%' THEN 'Has ipfs_uri'
          WHEN metadata_json::text LIKE '%metadata_uri%' THEN 'Has metadata_uri'
          WHEN metadata_json::text LIKE '%ipfs://%' THEN 'Has IPFS reference'
          ELSE 'No IPFS reference'
        END as metadata_status
      FROM asset 
      WHERE ipfs_image_url IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Erros de processamento (se a tabela existir)
    let errors = [];
    try {
      const errorsResult = await query(`
        SELECT 
          a.id,
          a.title,
          e.error_message,
          e.created_at
        FROM asset_ipfs_errors e
        JOIN asset a ON e.asset_id = a.id
        ORDER BY e.created_at DESC
        LIMIT 10
      `);
      errors = errorsResult.rows;
    } catch (e) {
      // Tabela de erros pode não existir
    }

    // Estatísticas por status de metadata
    const statusBreakdownResult = await query(`
      SELECT 
        CASE 
          WHEN ipfs_image_url IS NOT NULL THEN 'Has IPFS Image'
          WHEN metadata_json IS NULL THEN 'No metadata_json'
          WHEN metadata_json::text LIKE '%ipfs_uri%' THEN 'Has ipfs_uri (not processed)'
          WHEN metadata_json::text LIKE '%metadata_uri%' THEN 'Has metadata_uri (not processed)'
          WHEN metadata_json::text LIKE '%ipfs://%' THEN 'Has IPFS reference (not processed)'
          ELSE 'No IPFS reference'
        END as status,
        COUNT(*) as count
      FROM asset
      GROUP BY status
      ORDER BY count DESC
    `);

    return NextResponse.json({
      summary: {
        total,
        withIpfs,
        withoutIpfs,
        percentage: ((withIpfs / total) * 100).toFixed(2) + '%',
        candidates
      },
      statusBreakdown: statusBreakdownResult.rows,
      sampleWithoutIpfs: sampleResult.rows,
      recentErrors: errors,
      recommendation: withoutIpfs > 0 
        ? `Run 'node scripts/extract-ipfs-images-batch.js' to process ${withoutIpfs} remaining assets`
        : 'All assets have IPFS image URLs!'
    });

  } catch (error) {
    console.error('[IPFS Status API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}