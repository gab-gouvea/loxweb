import type { PropertyComponent, ComponentFormData, InventoryItem, InventoryFormData } from "@/types/property-detail"
import { MockPropertyDetailService } from "./mock/mock-property-details"

export interface PropertyDetailService {
  // Componentes
  getComponents(propertyId: string): Promise<PropertyComponent[]>
  createComponent(propertyId: string, data: ComponentFormData): Promise<PropertyComponent>
  updateComponent(id: string, data: Partial<ComponentFormData>): Promise<PropertyComponent>
  deleteComponent(id: string): Promise<void>

  // Inventário
  getInventory(propertyId: string): Promise<InventoryItem[]>
  createInventoryItem(propertyId: string, data: InventoryFormData): Promise<InventoryItem>
  updateInventoryItem(id: string, data: Partial<InventoryFormData>): Promise<InventoryItem>
  deleteInventoryItem(id: string): Promise<void>
}

export const propertyDetailService: PropertyDetailService = new MockPropertyDetailService()
