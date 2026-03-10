import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await sql`
      SELECT 
        id,
        name,
        image_url as "imageUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM categories 
      WHERE id = ${id}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      );
    }

    const category = result[0];
    return NextResponse.json({
      id: category.id,
      name: category.name,
      imageUrl: category.imageUrl,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  } catch (error) {
    console.error('Erro ao buscar categoria:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 