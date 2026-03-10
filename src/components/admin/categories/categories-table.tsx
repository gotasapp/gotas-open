"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { deleteCategory } from "@/lib/actions/category-actions"
import { type Category } from "@/lib/types/category"
import { Pencil, Trash2, Plus } from "lucide-react"

interface CategoriesTableProps {
  categories: Category[]
}

export function CategoriesTable({ categories }: CategoriesTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) {
      return
    }

    setDeletingId(id)
    try {
      await deleteCategory(id)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao excluir categoria")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Categorias</CardTitle>
        <Button asChild>
          <Link href="/adm/categories/new">
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma categoria encontrada.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Atualizado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    {category.imageUrl ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                        <Image
                          src={category.imageUrl}
                          alt={category.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          Sem imagem
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{category.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {category.createdAt.toLocaleDateString("pt-BR")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {category.updatedAt.toLocaleDateString("pt-BR")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/adm/categories/${category.id}/edit`}>
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(category.id, category.name)}
                        disabled={deletingId === category.id}
                      >
                        {deletingId === category.id ? (
                          "Excluindo..."
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
} 