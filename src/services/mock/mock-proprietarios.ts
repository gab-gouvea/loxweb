import type { Proprietario, ProprietarioFormData } from "@/types/proprietario"
import type { ProprietarioService } from "../proprietario-service"
import { mockDelay } from "./delay"
import { initialProprietarios } from "./mock-data"

export class MockProprietarioService implements ProprietarioService {
  private proprietarios: Proprietario[] = [...initialProprietarios]

  async getAll(): Promise<Proprietario[]> {
    await mockDelay()
    return [...this.proprietarios]
  }

  async getById(id: string): Promise<Proprietario | null> {
    await mockDelay()
    return this.proprietarios.find((p) => p.id === id) ?? null
  }

  async create(data: ProprietarioFormData): Promise<Proprietario> {
    await mockDelay()
    const proprietario: Proprietario = {
      ...data,
      id: crypto.randomUUID(),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    }
    this.proprietarios.push(proprietario)
    return proprietario
  }

  async update(id: string, data: Partial<ProprietarioFormData>): Promise<Proprietario> {
    await mockDelay()
    const index = this.proprietarios.findIndex((p) => p.id === id)
    if (index === -1) throw new Error("Proprietário não encontrado")
    this.proprietarios[index] = {
      ...this.proprietarios[index],
      ...data,
      atualizadoEm: new Date().toISOString(),
    }
    return this.proprietarios[index]
  }

  async delete(id: string): Promise<void> {
    await mockDelay()
    this.proprietarios = this.proprietarios.filter((p) => p.id !== id)
  }
}
