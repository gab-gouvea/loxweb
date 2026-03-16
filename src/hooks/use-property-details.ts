import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { propertyDetailService } from "@/services/property-detail-service"
import type { ComponentFormData, InventoryFormData, MaintenanceRecord, CreateScheduledMaintenanceData, ConfirmScheduledMaintenanceData } from "@/types/property-detail"

// --- Componentes ---

export function usePropertyComponents(propertyId: string) {
  return useQuery({
    queryKey: ["property-components", propertyId],
    queryFn: () => propertyDetailService.getComponents(propertyId),
    enabled: !!propertyId,
  })
}

export function useAllPropertyComponents() {
  return useQuery({
    queryKey: ["property-components", "all"],
    queryFn: () => propertyDetailService.getAllComponents(),
  })
}

export function useCreateComponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ propertyId, data }: { propertyId: string; data: ComponentFormData }) =>
      propertyDetailService.createComponent(propertyId, data),
    onSuccess: (_, { propertyId }) => {
      queryClient.invalidateQueries({ queryKey: ["property-components", propertyId] })
    },
  })
}

export function useUpdateComponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; propertyId: string; data: Partial<ComponentFormData> }) =>
      propertyDetailService.updateComponent(vars.id, vars.data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["property-components", vars.propertyId] })
    },
  })
}

export function useDeleteComponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; propertyId: string }) =>
      propertyDetailService.deleteComponent(vars.id),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["property-components", vars.propertyId] })
    },
  })
}

// --- Registros de Manutencao ---

export function useMaintenanceRecords(startDate?: string, endDate?: string, propertyId?: string) {
  return useQuery({
    queryKey: ["maintenance-records", startDate, endDate, propertyId],
    queryFn: () => propertyDetailService.getMaintenanceRecords(startDate, endDate, propertyId),
  })
}

export function useCreateMaintenanceRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<MaintenanceRecord, "id">) =>
      propertyDetailService.createMaintenanceRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-records"] })
    },
  })
}

export function useUpdateMaintenanceRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; data: Partial<MaintenanceRecord> }) =>
      propertyDetailService.updateMaintenanceRecord(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-records"] })
    },
  })
}

export function useDeleteMaintenanceRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      propertyDetailService.deleteMaintenanceRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-records"] })
    },
  })
}

// --- Manutencoes Agendadas ---

export function useScheduledMaintenances(propertyId: string) {
  return useQuery({
    queryKey: ["scheduled-maintenances", propertyId],
    queryFn: () => propertyDetailService.getScheduledMaintenances(propertyId),
    enabled: !!propertyId,
  })
}

export function useCreateScheduledMaintenance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ propertyId, data }: { propertyId: string; data: CreateScheduledMaintenanceData }) =>
      propertyDetailService.createScheduledMaintenance(propertyId, data),
    onSuccess: (_, { propertyId }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-maintenances", propertyId] })
    },
  })
}

export function useUpdateScheduledMaintenance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; propertyId: string; data: Partial<CreateScheduledMaintenanceData> }) =>
      propertyDetailService.updateScheduledMaintenance(vars.id, vars.data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-maintenances", vars.propertyId] })
    },
  })
}

export function useConfirmScheduledMaintenance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; propertyId: string; data: ConfirmScheduledMaintenanceData }) =>
      propertyDetailService.confirmScheduledMaintenance(vars.id, vars.data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-maintenances", vars.propertyId] })
      queryClient.invalidateQueries({ queryKey: ["maintenance-records"] })
    },
  })
}

export function useDeleteScheduledMaintenance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; propertyId: string }) =>
      propertyDetailService.deleteScheduledMaintenance(vars.id),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-maintenances", vars.propertyId] })
    },
  })
}

// --- Inventário ---

export function useInventoryItems(propertyId: string) {
  return useQuery({
    queryKey: ["inventory", propertyId],
    queryFn: () => propertyDetailService.getInventory(propertyId),
    enabled: !!propertyId,
  })
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ propertyId, data }: { propertyId: string; data: InventoryFormData }) =>
      propertyDetailService.createInventoryItem(propertyId, data),
    onSuccess: (_, { propertyId }) => {
      queryClient.invalidateQueries({ queryKey: ["inventory", propertyId] })
    },
  })
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; propertyId: string; data: Partial<InventoryFormData> }) =>
      propertyDetailService.updateInventoryItem(vars.id, vars.data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["inventory", vars.propertyId] })
    },
  })
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; propertyId: string }) =>
      propertyDetailService.deleteInventoryItem(vars.id),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["inventory", vars.propertyId] })
    },
  })
}
