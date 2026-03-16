import { api } from "@/lib/api"
import type {
  PropertyComponent,
  ComponentFormData,
  InventoryItem,
  InventoryFormData,
  MaintenanceRecord,
  ScheduledMaintenance,
  CreateScheduledMaintenanceData,
  ConfirmScheduledMaintenanceData,
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

  // Manutencoes agendadas

  async getScheduledMaintenances(propertyId: string): Promise<ScheduledMaintenance[]> {
    const { data } = await api.get<ScheduledMaintenance[]>(`/properties/${propertyId}/scheduled-maintenances`)
    return data
  }

  async createScheduledMaintenance(propertyId: string, formData: CreateScheduledMaintenanceData): Promise<ScheduledMaintenance> {
    const { data } = await api.post<ScheduledMaintenance>(`/properties/${propertyId}/scheduled-maintenances`, formData)
    return data
  }

  async updateScheduledMaintenance(id: string, formData: Partial<CreateScheduledMaintenanceData>): Promise<ScheduledMaintenance> {
    const { data } = await api.put<ScheduledMaintenance>(`/scheduled-maintenances/${id}`, formData)
    return data
  }

  async confirmScheduledMaintenance(id: string, formData: ConfirmScheduledMaintenanceData): Promise<ScheduledMaintenance> {
    const { data } = await api.patch<ScheduledMaintenance>(`/scheduled-maintenances/${id}/confirm`, formData)
    return data
  }

  async deleteScheduledMaintenance(id: string): Promise<void> {
    await api.delete(`/scheduled-maintenances/${id}`)
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
