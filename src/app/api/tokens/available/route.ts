import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const tokens = await sql`
      SELECT 
        symbol,
        name,
        description,
        icon_url,
        token_id_internal,
        is_fan_token
      FROM staking_tokens 
      WHERE is_active = true 
        AND is_available_for_purchase = true 
      ORDER BY name
    `;

    return NextResponse.json({
      success: true,
      tokens: tokens
    });

  } catch (error) {
    console.error('Erro ao buscar tokens:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 