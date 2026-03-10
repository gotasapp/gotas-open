import { CategoryForm } from "@/components/admin/categories/category-form"

export default function NewCategoryPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nova Categoria</h1>
        <p className="text-muted-foreground">
          Crie uma nova categoria para seus NFTs colecionáveis
        </p>
      </div>
      
      <CategoryForm mode="create" />
    </div>
  )
} 