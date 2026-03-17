import { z } from "zod/v4"

export const propertyTypes = [
  "apartamento", "casa", "studio", "chalé", "flat", "outro",
] as const

export type PropertyType = (typeof propertyTypes)[number]

export const propertySchema = z.object({
  id: z.string(),
  nome: z.string().min(1, "Nome é obrigatório"),
  endereco: z.string().min(1, "Endereço é obrigatório"),
  proprietarioId: z.string().optional(),
  tipo: z.enum(propertyTypes),
  quartos: z.number().int().min(1, "Deve haver pelo menos 1 quarto"),
  fotoCapa: z.string().optional(),
  percentualComissao: z.number().min(0).max(100),
  taxaLimpeza: z.number().min(0).optional(),
  temHobbyBox: z.boolean(),
  acessoPredio: z.string().optional(),
  acessoApartamento: z.string().optional(),
  ativo: z.boolean(),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
})

export type Property = z.infer<typeof propertySchema>

export const propertyFormSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  endereco: z.string().min(1, "Endereço é obrigatório"),
  proprietarioId: z.string().optional(),
  tipo: z.enum(propertyTypes),
  quartos: z.number().int().min(1, "Deve haver pelo menos 1 quarto"),
  fotoCapa: z.string().optional(),
  percentualComissao: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  taxaLimpeza: z.number().min(0).optional().or(z.literal("")),
  temHobbyBox: z.boolean(),
  acessoPredio: z.string().optional(),
  acessoApartamento: z.string().optional(),
  ativo: z.boolean(),
})

export type PropertyFormData = z.infer<typeof propertyFormSchema>
