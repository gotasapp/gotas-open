import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          id,
          name,
          stake_token_amount,
          stake_token_symbol,
          stake_token_address,
          description,
          main_image_url
        FROM nfts 
        WHERE stake_token_amount > 0 
          AND status = 'active'
          AND stake_token_symbol IS NOT NULL
          AND stake_token_symbol != ''
          AND UPPER(stake_token_symbol) != 'CHZ'
        ORDER BY stake_token_symbol, stake_token_amount
      `;
      
      const result = await client.query(query);
      
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao buscar requisitos de NFTs:', error);
    return NextResponse.json(
      { error: 'Falha ao carregar requisitos de NFTs' },
      { status: 500 }
    );
  }
} 