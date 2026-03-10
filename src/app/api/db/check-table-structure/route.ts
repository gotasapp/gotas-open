import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-pool';

export async function GET() {
  try {
    console.log('[Table Check] Checking table structure...');

    // 1. Verificar se a tabela nft_mint_log existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'nft_mint_log'
      )
    `);

    console.log('[Table Check] nft_mint_log exists:', tableExists.rows[0].exists);

    if (!tableExists.rows[0].exists) {
      return NextResponse.json({
        error: 'Table nft_mint_log does not exist',
        exists: false
      });
    }

    // 2. Verificar estrutura da tabela
    const columns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'nft_mint_log'
      ORDER BY ordinal_position
    `);

    console.log('[Table Check] Columns found:', columns.rows.length);

    // 3. Verificar dados de exemplo
    const sampleData = await query(`
      SELECT * FROM nft_mint_log LIMIT 3
    `);

    console.log('[Table Check] Sample rows:', sampleData.rows.length);

    return NextResponse.json({
      exists: true,
      columns: columns.rows,
      sampleData: sampleData.rows,
      hasQueueId: columns.rows.some(col => col.column_name === 'queue_id'),
      hasEngineStatus: columns.rows.some(col => col.column_name === 'engine_status'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Table Check] Error:', error);
    return NextResponse.json(
      { 
        error: 'Table check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}