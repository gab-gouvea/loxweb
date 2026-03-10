import type { Property, PropertyFormData } from "@/types/property"
import { MockPropertyService } from "./mock/mock-properties"

export interface PropertyService {
  getAll(): Promise<Property[]>
  getById(id: string): Promise<Property | null>
  create(data: PropertyFormData): Promise<Property>
  update(id: string, data: Partial<PropertyFormData>): Promise<Property>
  delete(id: string): Promise<void>
}

export const propertyService: PropertyService = new MockPropertyService()
