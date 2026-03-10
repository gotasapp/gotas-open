import { notFound } from "next/navigation"
import { getCategoryById } from "@/lib/actions/category-actions"
import { CategoryForm } from "@/components/admin/categories/category-form"

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic'

interface EditCategoryPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params
  const category = await getCategoryById(id)

  if (!category) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Editar Categoria</h1>
        <p className="text-muted-foreground">
          Edite as informações da categoria "{category.name}"
        </p>
      </div>
      
      <CategoryForm category={category} mode="edit" />
    </div>
  )
} 