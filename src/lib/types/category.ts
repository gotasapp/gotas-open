import { z } from "zod"

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  symbol: z.string().optional().nullable(),
  imageUrl: z.string().url("URL inválida").optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreateCategorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  symbol: z.string().optional().nullable(),
  imageUrl: z.string().url("URL inválida").optional().nullable(),
})

export const UpdateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  symbol: z.string().optional().nullable(),
  imageUrl: z.string().url("URL inválida").optional().nullable(),
})

export type Category = z.infer<typeof CategorySchema>
export type CreateCategory = z.infer<typeof CreateCategorySchema>
export type UpdateCategory = z.infer<typeof UpdateCategorySchema> 