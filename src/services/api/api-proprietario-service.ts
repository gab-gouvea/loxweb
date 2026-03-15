import { api } from "@/lib/api"
import type { Proprietario, ProprietarioFormData } from "@/types/proprietario"
import type { ProprietarioService } from "../proprietario-service"

export class ApiProprietarioService implements ProprietarioService {
  async getAll(): Promise<Proprietario[]> {
    const { data } = await api.get<Proprietario[]>("/proprietarios")
    return data
  }

  async getById(id: string): Promise<Proprietario | null> {
    const { data } = await api.get<Proprietario>(`/proprietarios/${id}`)
    return data
  }

  async create(formData: ProprietarioFormData): Promise<Proprietario> {
    const { data } = await api.post<Proprietario>("/proprietarios", formData)
    return data
  }

  async update(id: string, formData: Partial<ProprietarioFormData>): Promise<Proprietario> {
    const { data } = await api.put<Proprietario>(`/proprietarios/${id}`, formData)
    return data
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/proprietarios/${id}`)
  }
}
