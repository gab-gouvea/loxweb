import type { Property, PropertyFormData } from "@/types/property"
import type { PropertyService } from "../property-service"
import { mockDelay } from "./delay"
import { initialProperties } from "./mock-data"

export class MockPropertyService implements PropertyService {
  private properties: Property[] = [...initialProperties]

  async getAll(): Promise<Property[]> {
    await mockDelay()
    return [...this.properties]
  }

  async getById(id: string): Promise<Property | null> {
    await mockDelay()
    return this.properties.find((p) => p.id === id) ?? null
  }

  async create(data: PropertyFormData): Promise<Property> {
    await mockDelay()
    const property: Property = {
      ...data,
      id: crypto.randomUUID(),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    }
    this.properties.push(property)
    return property
  }

  async update(id: string, data: Partial<PropertyFormData>): Promise<Property> {
    await mockDelay()
    const index = this.properties.findIndex((p) => p.id === id)
    if (index === -1) throw new Error("Propriedade não encontrada")
    this.properties[index] = {
      ...this.properties[index],
      ...data,
      atualizadoEm: new Date().toISOString(),
    }
    return this.properties[index]
  }

  async delete(id: string): Promise<void> {
    await mockDelay()
    this.properties = this.properties.filter((p) => p.id !== id)
  }
}
