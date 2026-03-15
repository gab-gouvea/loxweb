import type { Property, PropertyFormData } from "@/types/property"
import { ApiPropertyService } from "./api/api-property-service"

export interface PropertyService {
  getAll(): Promise<Property[]>
  getById(id: string): Promise<Property | null>
  create(data: PropertyFormData): Promise<Property>
  update(id: string, data: Partial<PropertyFormData>): Promise<Property>
  delete(id: string): Promise<void>
}

export const propertyService: PropertyService = new ApiPropertyService()
