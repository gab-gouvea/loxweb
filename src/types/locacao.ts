import { z } from "zod/v4"
import { addMonths, parseISO } from "date-fns"

export const locacaoStatuses = ["ativa", "encerrada"] as const
export const garantiaTypes = ["caucao", "seguro_fianca"] as const
export const tipoPagamentoTypes = ["avista", "mensal"] as const
export const faxinaStatuses = ["nao_agendada", "agendada"] as const
export const tipoLocacaoTypes = ["temporada", "anual"] as const

export type LocacaoStatus = (typeof locacaoStatuses)[number]
export type GarantiaType = (typeof garantiaTypes)[number]
export type TipoLocacao = (typeof tipoLocacaoTypes)[number]

export const locacaoSchema = z.object({
  id: z.string(),
  propriedadeId: z.string(),
  tipoLocacao: z.enum(tipoLocacaoTypes).optional(),
  nomeCompleto: z.string().min(1, "Nome completo é obrigatório"),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  dataNascimento: z.string().optional(),
  profissao: z.string().optional(),
  estadoCivil: z.string().optional(),
  endereco: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  checkIn: z.string(),
  checkOut: z.string(),
  numMoradores: z.number().int().min(1).optional(),
  valorMensal: z.number().min(0).optional(),
  tipoPagamento: z.enum(tipoPagamentoTypes).optional(),
  valorTotal: z.number().min(0).optional(),
  percentualComissao: z.number().min(0).max(100).optional(),
  garantia: z.enum(garantiaTypes).optional(),
  // Faxina de rotina (gerenciado via card na detail page — só temporada)
  faxinaIntervaloDias: z.number().int().min(1).optional(),
  ultimaFaxina: z.string().optional(),
  proximaFaxina: z.string().optional(),
  // Faxina de saída (mesmos campos das reservas — só temporada)
  faxinaStatus: z.string().optional(),
  faxinaPorMim: z.boolean().optional(),
  custoEmpresaFaxina: z.number().min(0).optional(),
  faxinaPaga: z.boolean().optional(),
  faxinaData: z.string().optional(),
  // Vistoria (só anual)
  vistoriaEntradaData: z.string().optional(),
  vistoriaEntradaNotas: z.string().optional(),
  vistoriaEntradaConcluida: z.boolean().optional(),
  clearVistoriaEntrada: z.boolean().optional(),
  vistoriaSaidaData: z.string().optional(),
  vistoriaSaidaNotas: z.string().optional(),
  vistoriaSaidaConcluida: z.boolean().optional(),
  clearVistoriaSaida: z.boolean().optional(),
  notas: z.string().optional(),
  status: z.enum(locacaoStatuses),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
})

export type Locacao = z.infer<typeof locacaoSchema>

export const locacaoFormSchema = z.object({
  propriedadeId: z.string().min(1, "Selecione uma propriedade"),
  tipoLocacao: z.enum(tipoLocacaoTypes),
  nomeCompleto: z.string().min(1, "Nome completo é obrigatório"),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  dataNascimento: z.string().optional(),
  profissao: z.string().optional(),
  estadoCivil: z.string().optional(),
  endereco: z.string().optional(),
  email: z.string().optional(),
  checkIn: z.string().min(1, "Data de entrada é obrigatória"),
  checkOut: z.string().min(1, "Data de saída é obrigatória"),
  numMoradores: z.number({ message: "Mínimo 1 morador" }).int().min(1, "Mínimo 1 morador"),
  valorMensal: z.number().min(0).optional().or(z.literal("")),
  tipoPagamento: z.enum(tipoPagamentoTypes),
  valorTotal: z.number().min(0).optional().or(z.literal("")),
  percentualComissao: z.number({ message: "Informe a comissão" }).min(0.01, "Comissão deve ser maior que 0").max(100),
  garantia: z.enum(garantiaTypes).optional().or(z.literal("")),
  notas: z.string().optional(),
}).refine((data) => {
  if (!data.checkIn || !data.checkOut) return true
  return data.checkOut > data.checkIn
}, { message: "Data de saída deve ser depois da data de entrada", path: ["checkOut"] }).refine((data) => {
  // Temporada: máximo 3 meses. Anual: máximo 30 meses.
  if (data.tipoLocacao === "anual") {
    if (!data.checkIn || !data.checkOut) return true
    const checkIn = parseISO(data.checkIn)
    const maxDate = addMonths(checkIn, 30)
    return parseISO(data.checkOut) <= maxDate
  }
  if (!data.checkIn || !data.checkOut) return true
  const checkIn = parseISO(data.checkIn)
  const maxDate = addMonths(checkIn, 3)
  return parseISO(data.checkOut) <= maxDate
}, { message: "Duração máxima excedida", path: ["checkOut"] }).refine((data) => {
  if (data.tipoPagamento === "mensal") return data.valorMensal !== "" && data.valorMensal != null
  return true
}, { message: "Informe o valor mensal", path: ["valorMensal"] }).refine((data) => {
  if (data.tipoPagamento === "avista") return data.valorTotal !== "" && data.valorTotal != null
  return true
}, { message: "Informe o valor total", path: ["valorTotal"] })

export type LocacaoFormData = z.infer<typeof locacaoFormSchema>

export interface RecebimentoLocacao {
  id: string
  locacaoId: string
  mes: number
  ano: number
  valorRecebido: number
}
