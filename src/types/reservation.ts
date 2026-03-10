import { z } from "zod/v4"

export const reservationStatuses = [
  "confirmada", "pendente", "cancelada", "concluída",
] as const

export type ReservationStatus = (typeof reservationStatuses)[number]

export const reservationSources = [
  "airbnb", "booking", "direto", "outro",
] as const

export type ReservationSource = (typeof reservationSources)[number]

export const reservationSchema = z.object({
  id: z.string(),
  propriedadeId: z.string(),
  nomeHospede: z.string().min(1, "Nome do hóspede é obrigatório"),
  checkIn: z.string(),
  checkOut: z.string(),
  status: z.enum(reservationStatuses),
  precoTotal: z.number().min(0).optional(),
  precoPorNoite: z.number().min(0).optional(),
  notas: z.string().optional(),
  fonte: z.enum(reservationSources),
  numHospedes: z.number().int().min(1),
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
  precoPorNoite: z.number().min(0).optional(),
  notas: z.string().optional(),
  fonte: z.enum(reservationSources),
  numHospedes: z.number().int().min(1),
})

export type ReservationFormData = z.infer<typeof reservationFormSchema>
