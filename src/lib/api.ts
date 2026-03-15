import axios, { AxiosError } from "axios"
import { getToken, removeToken } from "./auth"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken()
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message
    if (message) return message
    if (!error.response) return "Sem conexão com o servidor"
  }
  return "Erro inesperado, tente novamente"
}
