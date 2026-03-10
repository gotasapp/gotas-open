import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs'; 
export const dynamic = 'force-dynamic';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL não está definida. Configure as variáveis de ambiente.');
}

const pool = new Pool({
  connectionString,
});

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, token_id_internal, symbol, name, description, address, icon_url, decimals, is_active FROM public.staking_tokens WHERE is_active = TRUE ORDER BY name ASC'
      );
      
      const tokens = result.rows;
      
      return NextResponse.json(tokens, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao buscar todos os tokens de stake:', error);
    let message = 'Erro desconhecido ao buscar tokens.';
    if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json(
      { error: 'Falha ao buscar tokens de stake do banco de dados', details: message },
      { status: 500 }
    );
  }
} 