"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCategories } from '../../lib/actions/category-actions'
import { type Category } from '../../lib/types/category'
import { OptimizedImage } from '@/components/ui/optimized-image'

interface CategoriesFilterProps {
  currentCategory?: string | null
  className?: string
}

export function CategoriesFilter({ currentCategory, className = "" }: CategoriesFilterProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getCategories()
        setCategories(categoriesData)
      } catch (error) {
        console.error('Erro ao carregar categorias:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCategories()
  }, [])

  if (isLoading) {
    return (
      <div className={`flex gap-2 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Botão "Todas" */}
      <Link
        href="/cards"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
          !currentCategory
            ? 'bg-blue-100 border-blue-300 text-blue-800'
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className="text-sm font-medium">Todas</span>
      </Link>

      {/* Botões das categorias */}
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/cards?category=${encodeURIComponent(category.name.toLowerCase())}`}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            currentCategory?.toLowerCase() === category.name.toLowerCase()
              ? 'bg-blue-100 border-blue-300 text-blue-800'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {category.imageUrl && (
            <OptimizedImage
              src={category.imageUrl}
              alt={category.name}
              className="w-4 h-4 rounded"
              aspectRatio="square"
              placeholder="skeleton"
            />
          )}
          <span className="text-sm font-medium">{category.name}</span>
        </Link>
      ))}
    </div>
  )
} 