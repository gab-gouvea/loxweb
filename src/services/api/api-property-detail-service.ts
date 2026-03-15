import { api } from "@/lib/api"
import type {
  PropertyComponent,
  ComponentFormData,
  InventoryItem,
  InventoryFormData,
  MaintenanceRecord,
} from "@/types/property-detail"
import type { PropertyDetailService } from "../property-detail-service"

export class ApiPropertyDetailService implements PropertyDetailService {
  // Componentes

  async getComponents(propertyId: string): Promise<PropertyComponent[]> {
    const { data } = await api.get<PropertyComponent[]>(`/properties/${propertyId}/components`)
    return data
  }

  async getAllComponents(): Promise<PropertyComponent[]> {
    const { data } = await api.get<PropertyComponent[]>("/components")
    return data
  }

  async createComponent(propertyId: string, formData: ComponentFormData): Promise<PropertyComponent> {
    const { data } = await api.post<PropertyComponent>(`/properties/${propertyId}/components`, formData)
    return data
  }

  async updateComponent(id: string, formData: Partial<ComponentFormData>): Promise<PropertyComponent> {
    const { data } = await api.put<PropertyComponent>(`/components/${id}`, formData)
    return data
  }

  async deleteComponent(id: string): Promise<void> {
    await api.delete(`/components/${id}`)
  }

  // Registros de manutencao

  async getMaintenanceRecords(startDate?: string, endDate?: string, propertyId?: string): Promise<MaintenanceRecord[]> {
    const { data } = await api.get<MaintenanceRecord[]>("/maintenance-records", {
      params: {
        ...(propertyId && { propertyId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      },
    })
    return data
  }

  async createMaintenanceRecord(formData: Omit<MaintenanceRecord, "id">): Promise<MaintenanceRecord> {
    const { data } = await api.post<MaintenanceRecord>("/maintenance-records", formData)
    return data
  }

  async updateMaintenanceRecord(id: string, formData: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
    const { data } = await api.put<MaintenanceRecord>(`/maintenance-records/${id}`, formData)
    return data
  }

  async deleteMaintenanceRecord(id: string): Promise<void> {
    await api.delete(`/maintenance-records/${id}`)
  }

  // Inventario

  async getInventory(propertyId: string): Promise<InventoryItem[]> {
    const { data } = await api.get<InventoryItem[]>(`/properties/${propertyId}/inventory`)
    return data
  }

  async createInventoryItem(propertyId: string, formData: InventoryFormData): Promise<InventoryItem> {
    const { data } = await api.post<InventoryItem>(`/properties/${propertyId}/inventory`, formData)
    return data
  }

  async updateInventoryItem(id: string, formData: Partial<InventoryFormData>): Promise<InventoryItem> {
    const { data } = await api.put<InventoryItem>(`/inventory/${id}`, formData)
    return data
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await api.delete(`/inventory/${id}`)
  }
}
