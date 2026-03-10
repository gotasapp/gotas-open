import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL não está definida.');
}

const pool = new Pool({
  connectionString,
});

// GET /api/staking-tokens/[id] - Buscar um token de stake específico
export async function GET(request: NextRequest, context: any) {
  const id = context?.params?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: 'ID do token não fornecido' }, { status: 400 });
  }
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM public.staking_tokens WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Token não encontrado' }, { status: 404 });
      }
      return NextResponse.json(result.rows[0], { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Erro ao buscar token de stake ${id}:`, error);
    let message = 'Erro desconhecido ao buscar token de stake.';
    if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json(
      { error: 'Falha ao buscar token de stake do banco de dados', details: message },
      { status: 500 }
    );
  }
}

// PUT /api/staking-tokens/[id] - Atualizar um token de stake específico
export async function PUT(request: NextRequest, context: any) {
  const id = context?.params?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: 'ID do token não fornecido' }, { status: 400 });
  }
  try {
    const body = await request.json();
    const {
      token_id_internal,
      symbol,
      name,
      description,
      address,
      icon_url,
      decimals,
      is_active,
      is_fan_token
    } = body;

    if (!token_id_internal || !symbol || !name || !address || decimals === undefined || typeof decimals !== 'number' || typeof is_active !== 'boolean' || typeof is_fan_token !== 'boolean') {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes ou inválidos para atualização.' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE public.staking_tokens SET token_id_internal = $1, symbol = $2, name = $3, description = $4, address = $5, icon_url = $6, decimals = $7, is_active = $8, is_fan_token = $9, updated_at = NOW() WHERE id = $10 RETURNING *',
        [token_id_internal, symbol, name, description, address, icon_url, decimals, is_active, is_fan_token, id]
      );
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Token não encontrado para atualização' }, { status: 404 });
      }
      return NextResponse.json(result.rows[0], { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Erro ao atualizar token de stake ${id}:`, error);
    let message = 'Erro desconhecido ao atualizar token de stake.';
    let statusCode = 500;
    if (error instanceof Error) {
      message = error.message;
      if ((error as any).code === '23505') {
        message = 'Erro: Já existe outro token com este endereço ou ID interno.';
        statusCode = 409; // Conflict
      }
    }
    return NextResponse.json(
      { error: 'Falha ao atualizar token de stake no banco de dados', details: message },
      { status: statusCode }
    );
  }
}

// DELETE /api/staking-tokens/[id] - Desativar/Reativar um token de stake (soft delete)
export async function DELETE(request: NextRequest, context: any) {
  const id = context?.params?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: 'ID do token não fornecido' }, { status: 400 });
  }
  try {
    const client = await pool.connect();
    try {
      const currentTokenState = await client.query('SELECT is_active FROM public.staking_tokens WHERE id = $1', [id]);
      if (currentTokenState.rows.length === 0) {
        return NextResponse.json({ error: 'Token não encontrado para exclusão/alteração de status' }, { status: 404 });
      }
      const newActiveState = !currentTokenState.rows[0].is_active;

      const result = await client.query(
        'UPDATE public.staking_tokens SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, token_id_internal, name, is_active',
        [newActiveState, id]
      );
      
      return NextResponse.json(result.rows[0], { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Erro ao alterar status do token de stake ${id}:`, error);
    let message = 'Erro desconhecido ao alterar status do token.';
    if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json(
      { error: 'Falha ao alterar status do token no banco de dados', details: message },
      { status: 500 }
    );
  }
} 