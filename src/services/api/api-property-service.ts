import { api } from "@/lib/api"
import type { Property, PropertyFormData } from "@/types/property"
import type { PropertyService } from "../property-service"

export class ApiPropertyService implements PropertyService {
  async getAll(): Promise<Property[]> {
    const { data } = await api.get<Property[]>("/properties")
    return data
  }

  async getById(id: string): Promise<Property | null> {
    const { data } = await api.get<Property>(`/properties/${id}`)
    return data
  }

  async create(formData: PropertyFormData): Promise<Property> {
    const { data } = await api.post<Property>("/properties", formData)
    return data
  }

  async update(id: string, formData: Partial<PropertyFormData>): Promise<Property> {
    const { data } = await api.put<Property>(`/properties/${id}`, formData)
    return data
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/properties/${id}`)
  }
}
