import type { PropertyComponent, ComponentFormData, InventoryItem, InventoryFormData, MaintenanceRecord } from "@/types/property-detail"
import { MockPropertyDetailService } from "./mock/mock-property-details"

export interface PropertyDetailService {
  // Componentes
  getComponents(propertyId: string): Promise<PropertyComponent[]>
  getAllComponents(): Promise<PropertyComponent[]>
  createComponent(propertyId: string, data: ComponentFormData): Promise<PropertyComponent>
  updateComponent(id: string, data: Partial<ComponentFormData>): Promise<PropertyComponent>
  deleteComponent(id: string): Promise<void>

  // Registros de manutencao
  getMaintenanceRecords(startDate?: string, endDate?: string, propertyId?: string): Promise<MaintenanceRecord[]>
  createMaintenanceRecord(data: Omit<MaintenanceRecord, "id">): Promise<MaintenanceRecord>
  updateMaintenanceRecord(id: string, data: Partial<MaintenanceRecord>): Promise<MaintenanceRecord>
  deleteMaintenanceRecord(id: string): Promise<void>

  // Inventário
  getInventory(propertyId: string): Promise<InventoryItem[]>
  createInventoryItem(propertyId: string, data: InventoryFormData): Promise<InventoryItem>
  updateInventoryItem(id: string, data: Partial<InventoryFormData>): Promise<InventoryItem>
  deleteInventoryItem(id: string): Promise<void>
}

export const propertyDetailService: PropertyDetailService = new MockPropertyDetailService()
