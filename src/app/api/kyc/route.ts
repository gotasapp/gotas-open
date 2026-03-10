import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Endereço da carteira é obrigatório' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM kyc_data WHERE wallet_address = $1',
        [walletAddress.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Dados de KYC não encontrados' },
          { status: 404 }
        );
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao buscar dados de KYC:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, cpf, birthDate, fullName, kycApproved, brlaUserId } = await request.json();

    if (!walletAddress || !cpf || !birthDate || !fullName) {
      return NextResponse.json(
        { error: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO kyc_data (wallet_address, cpf, birth_date, full_name, kyc_approved, brla_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (wallet_address) 
         DO UPDATE SET 
           cpf = EXCLUDED.cpf,
           birth_date = EXCLUDED.birth_date,
           full_name = EXCLUDED.full_name,
           kyc_approved = EXCLUDED.kyc_approved,
           brla_user_id = EXCLUDED.brla_user_id,
           updated_at = NOW()
         RETURNING *`,
        [walletAddress.toLowerCase(), cpf, birthDate, fullName, kycApproved || false, brlaUserId]
      );

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao salvar dados de KYC:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { walletAddress, kycApproved, brlaUserId } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Endereço da carteira é obrigatório' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE kyc_data 
         SET kyc_approved = $2, brla_user_id = $3, updated_at = NOW()
         WHERE wallet_address = $1
         RETURNING *`,
        [walletAddress.toLowerCase(), kycApproved, brlaUserId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Dados de KYC não encontrados' },
          { status: 404 }
        );
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao atualizar dados de KYC:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 