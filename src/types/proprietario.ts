import { z } from "zod/v4"

export const estadosCivis = [
  "solteiro", "casado", "divorciado", "viuvo", "separado", "uniao_estavel",
] as const

export type EstadoCivil = (typeof estadosCivis)[number]

export const proprietarioSchema = z.object({
  id: z.string(),
  nomeCompleto: z.string().min(1, "Nome completo é obrigatório"),
  cpf: z.string().min(11, "CPF inválido"),
  rg: z.string().optional(),
  dataNascimento: z.string().optional(),
  profissao: z.string().optional(),
  estadoCivil: z.enum(estadosCivis).optional(),
  endereco: z.string().optional(),
  email: z.string().email("E-mail inválido").or(z.literal("")).optional(),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
})

export type Proprietario = z.infer<typeof proprietarioSchema>

export const proprietarioFormSchema = z.object({
  nomeCompleto: z.string().min(1, "Nome completo é obrigatório"),
  cpf: z.string().transform(v => v.replace(/\D/g, "")).pipe(z.string().length(11, "CPF deve ter 11 dígitos")),
  rg: z.string().optional(),
  dataNascimento: z.string().optional(),
  profissao: z.string().optional(),
  estadoCivil: z.enum(estadosCivis).optional(),
  endereco: z.string().optional(),
  email: z.string().email("E-mail inválido").or(z.literal("")).optional(),
})

export type ProprietarioFormData = z.infer<typeof proprietarioFormSchema>
