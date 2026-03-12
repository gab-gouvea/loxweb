import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { proprietarioService } from "@/services/proprietario-service"
import type { ProprietarioFormData } from "@/types/proprietario"

export function useProprietarios() {
  return useQuery({
    queryKey: ["proprietarios"],
    queryFn: () => proprietarioService.getAll(),
  })
}

export function useProprietario(id: string) {
  return useQuery({
    queryKey: ["proprietarios", id],
    queryFn: () => proprietarioService.getById(id),
    enabled: !!id,
  })
}

export function useCreateProprietario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ProprietarioFormData) => proprietarioService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proprietarios"] })
    },
  })
}

export function useUpdateProprietario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProprietarioFormData> }) =>
      proprietarioService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proprietarios"] })
    },
  })
}

export function useDeleteProprietario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => proprietarioService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proprietarios"] })
    },
  })
}
