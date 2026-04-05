import type { Locacao, LocacaoFormData, RecebimentoLocacao } from "@/types/locacao"
import { ApiLocacaoService } from "./api/api-locacao-service"

export interface LocacaoService {
  getAll(): Promise<Locacao[]>
  getById(id: string): Promise<Locacao | null>
  getByDateRange(start: string, end: string): Promise<Locacao[]>
  create(data: LocacaoFormData): Promise<Locacao>
  update(id: string, data: Partial<LocacaoFormData> & Partial<Locacao>): Promise<Locacao>
  delete(id: string): Promise<void>
  getRecebimentos(mes: number, ano: number): Promise<RecebimentoLocacao[]>
  upsertRecebimento(locacaoId: string, mes: number, ano: number, valorRecebido: number): Promise<RecebimentoLocacao>
}

export const locacaoService: LocacaoService = new ApiLocacaoService()
