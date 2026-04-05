import { api } from "@/lib/api"
import type { Locacao, LocacaoFormData, RecebimentoLocacao } from "@/types/locacao"
import type { LocacaoService } from "../locacao-service"

export class ApiLocacaoService implements LocacaoService {
  async getAll(): Promise<Locacao[]> {
    const { data } = await api.get<Locacao[]>("/locacoes")
    return data
  }

  async getById(id: string): Promise<Locacao | null> {
    const { data } = await api.get<Locacao>(`/locacoes/${id}`)
    return data
  }

  async getByDateRange(start: string, end: string): Promise<Locacao[]> {
    const { data } = await api.get<Locacao[]>("/locacoes", {
      params: { start, end },
    })
    return data
  }

  async create(formData: LocacaoFormData): Promise<Locacao> {
    const { data } = await api.post<Locacao>("/locacoes", formData)
    return data
  }

  async update(id: string, formData: Partial<LocacaoFormData> & Partial<Locacao>): Promise<Locacao> {
    const { data } = await api.put<Locacao>(`/locacoes/${id}`, formData)
    return data
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/locacoes/${id}`)
  }

  async getRecebimentos(mes: number, ano: number): Promise<RecebimentoLocacao[]> {
    const { data } = await api.get<RecebimentoLocacao[]>("/locacoes/recebimentos", {
      params: { mes, ano },
    })
    return data
  }

  async upsertRecebimento(locacaoId: string, mes: number, ano: number, valorRecebido: number): Promise<RecebimentoLocacao> {
    const { data } = await api.put<RecebimentoLocacao>(`/locacoes/${locacaoId}/recebimentos/${mes}/${ano}`, { valorRecebido })
    return data
  }
}
