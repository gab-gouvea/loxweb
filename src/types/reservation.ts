import { z } from "zod/v4"

export const reservationStatuses = [
  "pendente", "confirmada", "em andamento", "concluída", "cancelada",
] as const

export type ReservationStatus = (typeof reservationStatuses)[number]

export const reservationSources = [
  "airbnb", "booking", "direto", "outro",
] as const

export type ReservationSource = (typeof reservationSources)[number]

export const faxinaStatuses = [
  "nao_agendada", "agendada", "concluida",
] as const

export type FaxinaStatus = (typeof faxinaStatuses)[number]

export const despesaSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor: z.number().min(0),
  reembolsavel: z.boolean(),
  mes: z.number().optional(),
  ano: z.number().optional(),
})

export type Despesa = z.infer<typeof despesaSchema>

export const reservationSchema = z.object({
  id: z.string(),
  propriedadeId: z.string(),
  nomeHospede: z.string().min(1, "Nome do hóspede é obrigatório"),
  checkIn: z.string(),
  checkOut: z.string(),
  status: z.enum(reservationStatuses),
  precoTotal: z.number().min(0).optional(),
  notas: z.string().optional(),
  fonte: z.enum(reservationSources),
  numHospedes: z.number().int().min(1),
  faxinaStatus: z.enum(faxinaStatuses).optional(),
  faxinaPorMim: z.boolean(),
  custoEmpresaFaxina: z.number().min(0).optional(),
  faxinaPaga: z.boolean().optional(),
  faxinaData: z.string().optional(),
  despesas: z.array(despesaSchema).optional(),
  valorRecebidoCancelamento: z.number().min(0).optional(),
  valorLiquidoCancelamento: z.number().min(0).optional(),
  pagamentoRecebido: z.boolean().optional(),
  checkinConfirmado: z.boolean().optional(),
  checkoutConfirmado: z.boolean().optional(),
  percentualComissao: z.number().nullable().optional(),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
})

export type Reservation = z.infer<typeof reservationSchema>

export const reservationFormSchema = z.object({
  propriedadeId: z.string().min(1, "Selecione uma propriedade"),
  nomeHospede: z.string().min(1, "Nome do hóspede é obrigatório"),
  checkIn: z.string().min(1, "Check-in é obrigatório"),
  checkOut: z.string().min(1, "Check-out é obrigatório"),
  status: z.enum(reservationStatuses),
  precoTotal: z.number().min(0).optional().or(z.literal("")),
  notas: z.string().optional(),
  fonte: z.enum(reservationSources),
  numHospedes: z.number({ message: "Mínimo 1 hóspede" }).int().min(1, "Mínimo 1 hóspede"),
  faxinaStatus: z.enum(faxinaStatuses).optional(),
  faxinaPorMim: z.boolean(),
  custoEmpresaFaxina: z.number().min(0).optional().or(z.literal("")),
  faxinaPaga: z.boolean().optional(),
  faxinaData: z.string().optional(),
  despesas: z.array(despesaSchema).optional(),
}).refine((data) => {
  if (!data.checkIn || !data.checkOut) return true
  return data.checkOut > data.checkIn
}, { message: "Check-out deve ser depois do check-in", path: ["checkOut"] })

export type ReservationFormData = z.infer<typeof reservationFormSchema>
