import { api } from "@/lib/api"
import type { LoginFormData, AuthResponse } from "@/types/auth"

export async function login(data: LoginFormData): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/login", data)
  return response.data
}
