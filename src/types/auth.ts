import { z } from "zod/v4"

export const loginSchema = z.object({
  email: z.email("E-mail inválido"),
  senha: z.string().min(1, "Senha é obrigatória"),
})

export type LoginFormData = z.infer<typeof loginSchema>

export interface AuthResponse {
  token: string
}
