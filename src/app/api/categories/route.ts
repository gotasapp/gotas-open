import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const result = await sql`
      SELECT 
        id,
        name,
        symbol,
        image_url as "imageUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM categories 
      ORDER BY name ASC
    `;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 