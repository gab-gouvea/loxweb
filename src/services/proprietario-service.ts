import type { Proprietario, ProprietarioFormData } from "@/types/proprietario"
import { ApiProprietarioService } from "./api/api-proprietario-service"

export interface ProprietarioService {
  getAll(): Promise<Proprietario[]>
  getById(id: string): Promise<Proprietario | null>
  create(data: ProprietarioFormData): Promise<Proprietario>
  update(id: string, data: Partial<ProprietarioFormData>): Promise<Proprietario>
  delete(id: string): Promise<void>
}

export const proprietarioService: ProprietarioService = new ApiProprietarioService()
