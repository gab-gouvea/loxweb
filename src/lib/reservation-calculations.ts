import type { Reservation } from "@/types/reservation"
import type { Property } from "@/types/property"

export function calcFaxinaReceita(reservation: Reservation, property: Property | undefined): number {
  if (reservation.status === "cancelada") return 0
  const status = reservation.faxinaStatus ?? "nao_agendada"
  if (status === "nao_agendada") return 0
  const taxaLimpeza = property?.taxaLimpeza ?? 0
  if (reservation.faxinaPorMim) return taxaLimpeza
  return taxaLimpeza - (reservation.custoEmpresaFaxina ?? 0)
}

export function calcDespesas(reservation: Reservation): { reembolsavel: number; naoReembolsavel: number } {
  if (!reservation.despesas?.length) return { reembolsavel: 0, naoReembolsavel: 0 }
  let reembolsavel = 0
  let naoReembolsavel = 0
  for (const d of reservation.despesas) {
    if (d.reembolsavel) reembolsavel += d.valor
    else naoReembolsavel += d.valor
  }
  return { reembolsavel, naoReembolsavel }
}

/** Valor que o proprietário paga ao gestor = comissão + taxaLimpeza */
export function calcValorPagamento(reservation: Reservation, property: Property | undefined): number {
  const precoTotal = reservation.precoTotal ?? 0
  const taxaLimpeza = property?.taxaLimpeza ?? 0
  const baseComissao = Math.max(0, precoTotal - taxaLimpeza)
  const comissaoPercent = reservation.percentualComissao ?? property?.percentualComissao ?? 0
  const valorComissao = (baseComissao * comissaoPercent) / 100
  return valorComissao + taxaLimpeza
}

export function calcTotalRecebido(reservation: Reservation, property: Property | undefined): number {
  if (reservation.status === "cancelada") {
    return reservation.valorRecebidoCancelamento ?? 0
  }
  const precoTotal = reservation.precoTotal ?? 0
  const taxaLimpeza = property?.taxaLimpeza ?? 0
  const baseComissao = Math.max(0, precoTotal - taxaLimpeza)
  const comissaoPercent = reservation.percentualComissao ?? property?.percentualComissao ?? 0
  const valorComissao = (baseComissao * comissaoPercent) / 100
  const { naoReembolsavel } = calcDespesas(reservation)
  const receitaFaxina = calcFaxinaReceita(reservation, property)
  return valorComissao + receitaFaxina - naoReembolsavel
}
