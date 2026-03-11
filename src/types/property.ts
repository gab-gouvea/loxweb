import { z } from "zod/v4"

export const propertyColors = [
  "blue", "green", "orange", "purple", "pink", "teal", "red", "yellow", "indigo", "cyan",
] as const

export type PropertyColor = (typeof propertyColors)[number]

export const propertyTypes = [
  "apartamento", "casa", "studio", "chalé", "flat", "outro",
] as const

export type PropertyType = (typeof propertyTypes)[number]

export const propertySchema = z.object({
  id: z.string(),
  nome: z.string().min(1, "Nome é obrigatório"),
  endereco: z.string().optional(),
  proprietarioId: z.string().optional(),
  tipo: z.enum(propertyTypes),
  quartos: z.number().int().min(0),
  fotoCapa: z.string().url("URL inválida").optional(),
  cor: z.enum(propertyColors),
  percentualComissao: z.number().min(0).max(100),
  ativo: z.boolean(),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
})

export type Property = z.infer<typeof propertySchema>

export const propertyFormSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  endereco: z.string().optional(),
  proprietarioId: z.string().optional(),
  tipo: z.enum(propertyTypes),
  quartos: z.number().int().min(0),
  fotoCapa: z.string().url("URL inválida").or(z.literal("")).optional(),
  cor: z.enum(propertyColors),
  percentualComissao: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  ativo: z.boolean(),
})

export type PropertyFormData = z.infer<typeof propertyFormSchema>
