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
  prestador: z.string().optional(),
  observacoes: z.string().optional(),
})

export type PropertyComponent = z.infer<typeof propertyComponentSchema>

export const componentFormSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  ultimaManutencao: z.string().min(1, "Data é obrigatória"),
  proximaManutencao: z.string().optional(),
  intervaloDias: z.number().int().min(1, "Intervalo deve ser ao menos 1 dia"),
  prestador: z.string().min(1, "Prestador é obrigatório"),
  observacoes: z.string().optional(),
})

export type ComponentFormData = z.infer<typeof componentFormSchema>

export const inventoryItemSchema = z.object({
  id: z.string(),
  propriedadeId: z.string(),
  comodo: z.string().min(1, "Cômodo é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  quantidade: z.number().int().min(0, "Quantidade deve ser positiva"),
  descricao: z.string().optional(),
  imagemUrl: z.string().optional(),
  atualizadoEm: z.string(),
})

export type InventoryItem = z.infer<typeof inventoryItemSchema>

export const inventoryFormSchema = z.object({
  comodo: z.string().min(1, "Cômodo é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  quantidade: z.number().int().min(0, "Quantidade deve ser positiva"),
  descricao: z.string().optional(),
  imagemUrl: z.string().optional(),
})

export type InventoryFormData = z.infer<typeof inventoryFormSchema>

export function getComponentStatus(proximaManutencao: string): ComponentStatus {
  return new Date() > new Date(proximaManutencao) ? "atrasado" : "em_dia"
}

// Registro de manutencao realizada
export const maintenanceRecordSchema = z.object({
  id: z.string(),
  propriedadeId: z.string(),
  componenteId: z.string().optional(),
  nomeServico: z.string(),
  prestador: z.string().optional(),
  data: z.string(),
  valor: z.number().min(0),
  pago: z.boolean(),
})

export type MaintenanceRecord = z.infer<typeof maintenanceRecordSchema>

// Manutencao agendada
export interface ScheduledMaintenance {
  id: string
  propriedadeId: string
  nome: string
  dataPrevista: string
  prestador?: string
  confirmada: boolean
  valor?: number
  dataConclusao?: string
  criadoEm: string
}

export interface CreateScheduledMaintenanceData {
  nome: string
  dataPrevista: string
  prestador?: string
}

export interface ConfirmScheduledMaintenanceData {
  valor: number
  prestador: string
}
