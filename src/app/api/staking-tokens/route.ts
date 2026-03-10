import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Configuração para evitar o Edge Runtime, se necessário, dependendo do seu ambiente
export const runtime = 'nodejs'; 
export const dynamic = 'force-dynamic';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL não está definida. Configure as variáveis de ambiente.');
  // Em um cenário real, você poderia lançar um erro ou ter um fallback,
  // mas para a API, é crucial ter a string de conexão.
}

const pool = new Pool({
  connectionString,
});

// GET /api/staking-tokens - Listar todos os tokens de stake ativos
export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    try {
      // Selecionar apenas tokens ativos e ordenar por nome ou id, por exemplo
      // IMPORTANTE: Nunca retornar CHZ como token de staking
      const result = await client.query(
        'SELECT id, token_id_internal, symbol, name, description, address, icon_url, decimals, is_active FROM public.staking_tokens WHERE is_active = TRUE AND UPPER(symbol) != \'CHZ\' ORDER BY name ASC'
      );
      
      // Mapear para o formato esperado pelo frontend, se necessário (ex: StakingToken interface)
      // Por agora, retornaremos como está vindo do banco.
      const tokens = result.rows;
      
      return NextResponse.json(tokens, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao buscar tokens de stake:', error);
    let message = 'Erro desconhecido ao buscar tokens de stake.';
    if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json(
      { error: 'Falha ao buscar tokens de stake do banco de dados', details: message },
      { status: 500 }
    );
  }
}

// POST /api/staking-tokens - Criar um novo token de stake
export async function POST(request: NextRequest) {
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
      is_active = true // Default to true if not provided
    } = body;

    // Validação básica
    if (!token_id_internal || !symbol || !name || !address || decimals === undefined || typeof decimals !== 'number') {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes ou inválidos: token_id_internal, symbol, name, address, decimals.' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO public.staking_tokens (token_id_internal, symbol, name, description, address, icon_url, decimals, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [token_id_internal, symbol, name, description, address, icon_url, decimals, is_active]
      );
      const newToken = result.rows[0];
      return NextResponse.json(newToken, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao criar token de stake:', error);
    let message = 'Erro desconhecido ao criar token de stake.';
    let statusCode = 500;

    if (error instanceof Error) {
      message = error.message;
      // Verificar se é um erro de constraint unique (ex: endereço ou token_id_internal duplicado)
      if ((error as any).code === '23505') { // Código de erro do PostgreSQL para unique_violation
        message = 'Erro: Já existe um token com este endereço ou ID interno.';
        statusCode = 409; // Conflict
      }
    }
    return NextResponse.json(
      { error: 'Falha ao criar token de stake no banco de dados', details: message },
      { status: statusCode }
    );
  }
}

// Futuramente: POST, PUT, DELETE para o CRUD completo 