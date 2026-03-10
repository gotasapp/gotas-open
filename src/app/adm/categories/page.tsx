import { getCategories } from "@/lib/actions/category-actions"
import { CategoriesTable } from "@/components/admin/categories/categories-table"

// Forçar renderização dinâmica para evitar pre-render durante build
export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gerenciar Categorias</h1>
        <p className="text-muted-foreground">
          Gerencie as categorias dos seus NFTs colecionáveis
        </p>
      </div>
      
      <CategoriesTable categories={categories} />
    </div>
  )
} 