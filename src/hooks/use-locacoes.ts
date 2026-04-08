import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { locacaoService } from "@/services/locacao-service"
import type { Locacao, LocacaoFormData } from "@/types/locacao"

export function useLocacoes() {
  return useQuery({
    queryKey: ["locacoes"],
    queryFn: () => locacaoService.getAll(),
  })
}

export function useLocacao(id: string) {
  return useQuery({
    queryKey: ["locacoes", id],
    queryFn: () => locacaoService.getById(id),
    enabled: !!id,
  })
}

export function useLocacoesByDateRange(start: string, end: string) {
  return useQuery({
    queryKey: ["locacoes", "range", start, end],
    queryFn: () => locacaoService.getByDateRange(start, end),
    enabled: !!start && !!end,
  })
}

export function useCreateLocacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: LocacaoFormData & { status?: string }) => locacaoService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locacoes"] })
    },
  })
}

export function useUpdateLocacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LocacaoFormData & Locacao> }) =>
      locacaoService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locacoes"] })
    },
  })
}

export function useDeleteLocacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => locacaoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locacoes"] })
    },
  })
}

// Recebimentos
export function useRecebimentosLocacao(mes: number, ano: number) {
  return useQuery({
    queryKey: ["recebimentos-locacao", mes, ano],
    queryFn: () => locacaoService.getRecebimentos(mes, ano),
  })
}

export function useRecebimentosByLocacao(locacaoId: string) {
  return useQuery({
    queryKey: ["recebimentos-locacao", "by-locacao", locacaoId],
    queryFn: () => locacaoService.getRecebimentosByLocacao(locacaoId),
    enabled: !!locacaoId,
  })
}

export function useUpsertRecebimentoLocacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ locacaoId, mes, ano, valorRecebido }: { locacaoId: string; mes: number; ano: number; valorRecebido: number }) =>
      locacaoService.upsertRecebimento(locacaoId, mes, ano, valorRecebido),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recebimentos-locacao"] })
    },
  })
}

export function useDeleteRecebimentoLocacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ locacaoId, mes, ano }: { locacaoId: string; mes: number; ano: number }) =>
      locacaoService.deleteRecebimento(locacaoId, mes, ano),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recebimentos-locacao"] })
    },
  })
}