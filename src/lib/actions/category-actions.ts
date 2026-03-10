"use server"

import { neon } from '@neondatabase/serverless'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { CreateCategorySchema, UpdateCategorySchema, type Category } from '../types/category'

const sql = neon(process.env.DATABASE_URL!)

export async function getCategories(): Promise<Category[]> {
  try {
    const result = await sql`
      SELECT id, name, symbol, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
      FROM categories 
      ORDER BY name ASC
    `
    
    return result.map(row => ({
      id: row.id,
      name: row.name,
      symbol: row.symbol,
      imageUrl: row.imageUrl,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }))
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    throw new Error('Falha ao buscar categorias')
  }
}

export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const result = await sql`
      SELECT id, name, symbol, image_url as "imageUrl", created_at as "createdAt", updated_at as "updatedAt"
      FROM categories 
      WHERE id = ${id}
    `
    
    if (result.length === 0) return null
    
    const row = result[0]
    return {
      id: row.id,
      name: row.name,
      symbol: row.symbol,
      imageUrl: row.imageUrl,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }
  } catch (error) {
    console.error('Erro ao buscar categoria:', error)
    throw new Error('Falha ao buscar categoria')
  }
}

export async function createCategory(formData: FormData) {
  try {
    const rawData = {
      name: formData.get('name'),
      symbol: formData.get('symbol') || null,
      imageUrl: formData.get('imageUrl') || null,
    }

    const validatedData = CreateCategorySchema.parse(rawData)

    await sql`
      INSERT INTO categories (name, symbol, image_url)
      VALUES (${validatedData.name}, ${validatedData.symbol}, ${validatedData.imageUrl})
    `

    revalidatePath('/adm/categories')
  } catch (error) {
    console.error('Erro ao criar categoria:', error)
    throw new Error('Falha ao criar categoria')
  }

  redirect('/adm/categories')
}

export async function updateCategory(formData: FormData) {
  try {
    const rawData = {
      id: formData.get('id'),
      name: formData.get('name'),
      symbol: formData.get('symbol') || null,
      imageUrl: formData.get('imageUrl') || null,
    }

    const validatedData = UpdateCategorySchema.parse(rawData)

    await sql`
      UPDATE categories 
      SET name = ${validatedData.name}, 
          symbol = ${validatedData.symbol},
          image_url = ${validatedData.imageUrl},
          updated_at = NOW()
      WHERE id = ${validatedData.id}
    `

    revalidatePath('/adm/categories')
    revalidatePath(`/adm/categories/${validatedData.id}/edit`)
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error)
    throw new Error('Falha ao atualizar categoria')
  }

  redirect('/adm/categories')
}

export async function deleteCategory(id: string) {
  try {
    // Verificar se existem NFTs usando esta categoria
    const nftsUsingCategory = await sql`
      SELECT COUNT(*) as count FROM nfts WHERE category_id = ${id}
    `

    if (Number(nftsUsingCategory[0].count) > 0) {
      throw new Error('Não é possível excluir categoria que está sendo usada por NFTs')
    }

    await sql`
      DELETE FROM categories WHERE id = ${id}
    `

    revalidatePath('/adm/categories')
  } catch (error) {
    console.error('Erro ao deletar categoria:', error)
    throw new Error(error instanceof Error ? error.message : 'Falha ao deletar categoria')
  }
}

export async function getNftsWithCategories() {
  try {
    const result = await sql`
      SELECT 
        n.id,
        n.name,
        n.total_supply,
        n.claimed_supply,
        n.main_image_url,
        c.name as category_name,
        c.symbol as category_symbol,
        c.image_url as category_image_url
      FROM nfts n
      LEFT JOIN categories c ON n.category_id = c.id
      ORDER BY n.id DESC
    `
    
    return result
  } catch (error) {
    console.error('Erro ao buscar NFTs com categorias:', error)
    throw new Error('Falha ao buscar NFTs')
  }
}

export async function updateNftCategory(nftId: number, categoryId: string) {
  try {
    await sql`
      UPDATE nfts 
      SET category_id = ${categoryId}, updated_at = NOW()
      WHERE id = ${nftId}
    `

    revalidatePath('/adm/nfts')
    revalidatePath(`/mint/${nftId}`)
  } catch (error) {
    console.error('Erro ao atualizar categoria do NFT:', error)
    throw new Error('Falha ao atualizar categoria do NFT')
  }
} 