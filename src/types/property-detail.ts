import { z } from "zod/v4"

export const componentStatuses = ["em_dia", "atrasado"] as const
export type ComponentStatus = (typeof componentStatuses)[number]

export const propertyComponentSchema = z.object({
  id: z.string(),
  propriedadeId: z.string(),
  nome: z.string().min(1, "Nome é obrigatório"),
  ultimaManutencao: z.string().min(1, "Data é obrigatória"),
  proximaManutencao: z.string().min(1, "Data é obrigatória"),
  intervaloDias: z.number().int().min(1, "Intervalo deve ser ao menos 1 dia"),
  preco: z.number().min(0, "Preço deve ser positivo"),
  observacoes: z.string().optional(),
})

export type PropertyComponent = z.infer<typeof propertyComponentSchema>

export const componentFormSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  ultimaManutencao: z.string().min(1, "Data é obrigatória"),
  proximaManutencao: z.string().optional(),
  intervaloDias: z.number().int().min(1, "Intervalo deve ser ao menos 1 dia"),
  preco: z.number().min(0, "Preço deve ser positivo"),
  observacoes: z.string().optional(),
})

export type ComponentFormData = z.infer<typeof componentFormSchema>

export const inventoryItemSchema = z.object({
  id: z.string(),
  propriedadeId: z.string(),
  nome: z.string().min(1, "Nome é obrigatório"),
  quantidade: z.number().int().min(0, "Quantidade deve ser positiva"),
  imagemUrl: z.string().url("URL inválida").optional(),
  atualizadoEm: z.string(),
})

export type InventoryItem = z.infer<typeof inventoryItemSchema>

export const inventoryFormSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  quantidade: z.number().int().min(0, "Quantidade deve ser positiva"),
  imagemUrl: z.string().url("URL inválida").or(z.literal("")).optional(),
})

export type InventoryFormData = z.infer<typeof inventoryFormSchema>

export function getComponentStatus(proximaManutencao: string): ComponentStatus {
  return new Date() > new Date(proximaManutencao) ? "atrasado" : "em_dia"
}
