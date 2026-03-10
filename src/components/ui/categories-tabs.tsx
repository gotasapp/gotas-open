"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react'
import { getCategories } from '@/lib/actions/category-actions'
import { type Category } from '@/lib/types/category'
import { OptimizedImage } from '@/components/ui/optimized-image'

interface CategoriesTabsProps {
  className?: string
}

export function CategoriesTabs({ className = "" }: CategoriesTabsProps) {
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const currentCategory = searchParams?.get('category') || null

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getCategories()
        console.log('[CategoriesTabs] Categorias carregadas:', categoriesData.map(c => ({
          name: c.name,
          symbol: c.symbol,
          imageUrl: c.imageUrl
        })))
        setCategories(categoriesData)
      } catch (error) {
        console.error('Erro ao carregar categorias:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCategories()
  }, [])

  useEffect(() => {
    const container = document.getElementById('categories-scroll-container')
    if (!container) return

    const checkScroll = () => {
      setShowLeftArrow(container.scrollLeft > 0)
      setShowRightArrow(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      )
    }

    checkScroll()
    container.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)

    return () => {
      container.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [categories])

  const scrollLeft = () => {
    const container = document.getElementById('categories-scroll-container')
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    const container = document.getElementById('categories-scroll-container')
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' })
    }
  }

  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex gap-4 sm:gap-6 overflow-hidden px-4 sm:px-0 justify-center">
          <div className="flex-shrink-0 w-24 sm:w-28 h-20 sm:h-24 bg-gray-200 rounded-xl animate-pulse" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-shrink-0 w-20 sm:w-24 h-20 sm:h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const shouldShowArrows = categories.length > 6

  return (
    <div className={`relative ${className}`}>
      <style jsx>{`
        #categories-scroll-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Seta esquerda */}
      {showLeftArrow && shouldShowArrows && (
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors hidden sm:flex"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
      )}

      {/* Container com scroll */}
      <div
        id="categories-scroll-container"
        className={`flex gap-4 sm:gap-6 overflow-x-auto pb-2 px-4 sm:px-0 ${
          categories.length <= 6 ? 'justify-center' : 'justify-start'
        }`}
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none'
        } as React.CSSProperties}
      >
        {/* Aba "Todas" */}
        <Link
          href="/mints"
          className="flex-shrink-0 flex flex-col items-center justify-center min-w-[5.75rem] sm:min-w-[6.75rem] h-20 sm:h-24 px-3 rounded-xl transition-all duration-200"
        >
          <div className={`w-10 h-10 sm:w-12 sm:h-12 mb-2 flex-shrink-0 flex items-center justify-center transition-opacity duration-200 ${
            !currentCategory ? 'opacity-100' : 'opacity-50'
          }`}>
            <Grid3X3 className="w-full h-full text-gray-600" />
          </div>
          <span className={`text-xs sm:text-sm text-center leading-tight transition-all duration-200 whitespace-nowrap ${
            !currentCategory ? 'text-black font-bold' : 'text-gray-400 font-medium'
          }`}>
            Todos
          </span>
        </Link>

        {/* Abas das categorias */}
        {categories.map((category) => {
          const isActive = currentCategory?.toLowerCase() === category.name.toLowerCase()
          const displayName = category.symbol || category.name
          
          return (
            <Link
              key={category.id}
              href={`/mints?category=${encodeURIComponent(category.name.toLowerCase())}`}
              className="flex-shrink-0 flex flex-col items-center justify-center min-w-[5.75rem] sm:min-w-[6.75rem] h-20 sm:h-24 px-3 rounded-xl transition-all duration-200"
            >
              {category.imageUrl ? (
                <div className={`w-10 h-10 sm:w-12 sm:h-12 mb-2 flex-shrink-0 relative transition-opacity duration-200 ${
                  isActive ? 'opacity-100' : 'opacity-50'
                }`}>
                  <OptimizedImage
                    src={category.imageUrl}
                    alt={category.name}
                    className="w-full h-full object-contain rounded"
                    aspectRatio="square"
                    placeholder="skeleton"
                    priority={true}
                    fallbackSrc="/placeholder-card.svg"
                    transparent={true}
                  />
                </div>
              ) : (
                <div className={`w-10 h-10 sm:w-12 sm:h-12 mb-2 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center transition-opacity duration-200 ${
                  isActive ? 'opacity-100' : 'opacity-50'
                }`}>
                  <span className="text-gray-400 text-xs font-bold">
                    {displayName.charAt(0)}
                  </span>
                </div>
              )}
              <span className={`text-xs sm:text-sm text-center leading-tight px-1 transition-all duration-200 whitespace-nowrap ${
                isActive ? 'text-black font-bold' : (currentCategory ? 'text-gray-400 font-medium' : 'text-gray-600 font-medium')
              }`}>
                {displayName}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Seta direita */}
      {showRightArrow && shouldShowArrows && (
        <button
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors hidden sm:flex"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      )}
    </div>
  )
} 
