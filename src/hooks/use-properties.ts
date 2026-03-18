import { useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { propertyService } from "@/services/property-service"
import type { PropertyFormData } from "@/types/property"
import { toLocalDateStr, getTodayStr } from "@/lib/date-utils"

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

/** Reativa automaticamente propriedades cuja data inativoAte já passou */
export function useAutoReactivateProperties() {
  const { data: properties } = useProperties()
  const updateProperty = useUpdateProperty()
  const processed = useRef(new Set<string>())

  useEffect(() => {
    if (!properties) return
    const today = getTodayStr()

    for (const prop of properties) {
      if (!prop.ativo && prop.inativoAte && !processed.current.has(prop.id)) {
        const inativoAte = toLocalDateStr(prop.inativoAte)
        if (inativoAte < today) {
          processed.current.add(prop.id)
          updateProperty.mutate({
            id: prop.id,
            data: {
              ativo: true,
              inativoAte: undefined,
              observacaoInatividade: undefined,
            },
          })
        }
      }
    }
  }, [properties])
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
