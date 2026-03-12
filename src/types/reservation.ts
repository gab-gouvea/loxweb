import { z } from "zod/v4"

export const reservationStatuses = [
  "pendente", "confirmada", "em andamento", "concluída",
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
  valorFaxina: z.number().min(0).optional(),
  faxinaData: z.string().optional(),
  despesas: z.array(despesaSchema).optional(),
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
  precoTotal: z.number().min(0).optional(),
  notas: z.string().optional(),
  fonte: z.enum(reservationSources),
  numHospedes: z.number().int().min(1),
  faxinaStatus: z.enum(faxinaStatuses).optional(),
  faxinaPorMim: z.boolean(),
  valorFaxina: z.number().min(0).optional(),
  faxinaData: z.string().optional(),
  despesas: z.array(despesaSchema).optional(),
})

export type ReservationFormData = z.infer<typeof reservationFormSchema>
