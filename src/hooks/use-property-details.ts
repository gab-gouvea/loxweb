import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { propertyDetailService } from "@/services/property-detail-service"
import type { ComponentFormData, InventoryFormData } from "@/types/property-detail"

// --- Componentes ---

export function usePropertyComponents(propertyId: string) {
  return useQuery({
    queryKey: ["property-components", propertyId],
    queryFn: () => propertyDetailService.getComponents(propertyId),
    enabled: !!propertyId,
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
