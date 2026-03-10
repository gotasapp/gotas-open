"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createCategory, updateCategory } from "@/lib/actions/category-actions"
import { type Category } from "@/lib/types/category"
import Image from "next/image"
import { UploadCloud, X } from "lucide-react"

interface CategoryFormProps {
  category?: Category
  mode: "create" | "edit"
}

export function CategoryForm({ category, mode }: CategoryFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(
    category?.imageUrl || null
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [manualImageUrl, setManualImageUrl] = useState<string>(
    category?.imageUrl || ""
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setManualImageUrl(url)
    if (!imageFile) {
      setImagePreview(url || null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Validar tamanho do arquivo (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setUploadError("Arquivo muito grande. Máximo 2MB.")
        return
      }

      // Validar tipo do arquivo
      if (!file.type.startsWith('image/')) {
        setUploadError("Por favor, selecione apenas arquivos de imagem.")
        return
      }

      setUploadError(null)
      setImageFile(file)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setImageFile(null)
      setImagePreview(manualImageUrl || null)
    }
  }

  const removeFile = () => {
    setImageFile(null)
    setImagePreview(manualImageUrl || null)
    // Reset do input file
    const fileInput = document.getElementById('imageFile') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const uploadImageToS3 = async (file: File): Promise<string> => {
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    uploadFormData.append('path', 'categories/images')

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: uploadFormData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.details || 'Falha ao fazer upload da imagem.')
    }
    
    const data = await response.json()
    return data.imageUrl
  }

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    setUploadError(null)
    
    try {
      let finalImageUrl = manualImageUrl

      // Se há um arquivo selecionado, fazer upload para S3
      if (imageFile) {
        finalImageUrl = await uploadImageToS3(imageFile)
      }

      // Atualizar o FormData com a URL final da imagem
      if (finalImageUrl) {
        formData.set('imageUrl', finalImageUrl)
      } else {
        formData.delete('imageUrl')
      }

      if (mode === "create") {
        await createCategory(formData)
      } else {
        await updateCategory(formData)
      }
    } catch (error) {
      console.error("Erro ao salvar categoria:", error)
      if (error instanceof Error) {
        setUploadError(error.message)
      } else {
        setUploadError("Erro desconhecido ao salvar categoria")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "Nova Categoria" : "Editar Categoria"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          {mode === "edit" && category && (
            <input type="hidden" name="id" value={category.id} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria</Label>
            <Input
              id="name"
              name="name"
              type="text"
              defaultValue={category?.name || ""}
                placeholder="Ex: Flamengo"
              required
              maxLength={255}
            />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Símbolo do Token</Label>
              <Input
                id="symbol"
                name="symbol"
                type="text"
                defaultValue={category?.symbol || ""}
                placeholder="Ex: MENGO"
                maxLength={10}
              />
            </div>
          </div>

          {/* Upload de arquivo */}
          <div className="space-y-2">
            <Label htmlFor="imageFile">Upload de Imagem (1:1)</Label>
            <div className="flex items-center gap-4">
              {imagePreview && imageFile && (
                <div className="relative w-16 h-16 border rounded-lg overflow-hidden">
                  <Image
                    src={imagePreview}
                    alt="Preview da categoria"
                    fill
                    className="object-cover"
                    onError={() => setImagePreview(null)}
                  />
                </div>
              )}
              <label
                htmlFor="imageFile"
                className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-gray-300 px-6 py-4 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 flex-1"
              >
                <UploadCloud className="mr-2 h-5 w-5" />
                <span>{imageFile ? imageFile.name : 'Selecionar Imagem (Max 2MB)'}</span>
                <input 
                  id="imageFile" 
                  name="imageFile" 
                  type="file" 
                  className="sr-only" 
                  onChange={handleFileChange} 
                  accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                />
              </label>
              {imageFile && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={removeFile}
                  className="h-10 w-10"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Opcional: Se preferir, cole a URL direta no campo abaixo.
            </p>
          </div>

          {/* URL manual */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">URL da Imagem (Manual)</Label>
            <Input
              id="imageUrl"
              name="imageUrl"
              type="url"
              value={manualImageUrl}
              placeholder="https://exemplo.com/imagem.jpg"
              onChange={handleImageUrlChange}
              disabled={!!imageFile}
            />
            {imageFile && (
              <p className="text-xs text-orange-600">
                Upload de arquivo selecionado. A URL manual será ignorada.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Recomendamos uma imagem quadrada (proporção 1:1) para melhor visualização
            </p>
          </div>

          {/* Preview da imagem */}
          {imagePreview && (
            <div className="space-y-2">
              <Label>Preview da Imagem</Label>
              <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                <Image
                  src={imagePreview}
                  alt="Preview da categoria"
                  fill
                  className="object-cover"
                  onError={() => setImagePreview(null)}
                />
              </div>
            </div>
          )}

          {/* Erro de upload */}
          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{uploadError}</p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting
                ? "Salvando..."
                : mode === "create"
                ? "Criar Categoria"
                : "Atualizar Categoria"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 