import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { propertyService } from "@/services/property-service"
import type { PropertyFormData } from "@/types/property"

export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: () => propertyService.getAll(),
  })
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ["properties", id],
    queryFn: () => propertyService.getById(id),
    enabled: !!id,
  })
}

export function useCreateProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: PropertyFormData) => propertyService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] })
    },
  })
}

export function useUpdateProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PropertyFormData> }) =>
      propertyService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] })
    },
  })
}

export function useDeleteProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => propertyService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] })
    },
  })
}
