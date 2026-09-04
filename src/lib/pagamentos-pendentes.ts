import { addMonths, format, isBefore, parseISO } from "date-fns"
import type { Reservation } from "@/types/reservation"
import type { Locacao } from "@/types/locacao"
import type { Property } from "@/types/property"
import { toLocalDateStr } from "@/lib/date-utils"
import { calcValorPagamento, calcValorReciboExtensao } from "@/lib/reservation-calculations"
import { getParcelaDate, getParcelasTaxa, isSemAdministracao } from "@/lib/locacao-calculations"

/** Origem do pagamento — define o rótulo e para onde o clique leva. */
export type PagamentoOrigem = "reserva" | "extensao" | "locacao" | "taxa_intermediacao"

export interface PagamentoPendente {
  /** Estável entre renders: serve de key de lista e de id de alerta */
  key: string
  origem: PagamentoOrigem
  /** Hóspede (reserva) ou inquilino (locação) */
  nome: string
  propriedadeId: string
  valor: number
  /** "yyyy-MM-dd" — data em que o pagamento é esperado */
  vencimento: string
  link: string
  /** Etiqueta curta, quando a linha não é o pagamento principal */
  badge?: string
}

interface BuildInput {
  reservations: Reservation[]
  locacoes: Locacao[]
  propertyMap: Map<string, Property>
  /** Recebimentos de locação já confirmados, como "locacaoId-mes-ano" */
  recebidoSet: Set<string>
  /** "yyyy-MM-dd" */
  today: string
}

/**
 * Tudo que já venceu e ainda não foi confirmado, numa lista só:
 * reserva base, cada extensão, cada parcela de taxa de intermediação e cada ciclo de locação
 * administrada. Usado pelos alertas e pelo card de pagamentos não recebidos, para os dois
 * nunca discordarem.
 */
export function buildPagamentosPendentes({
  reservations,
  locacoes,
  propertyMap,
  recebidoSet,
  today,
}: BuildInput): PagamentoPendente[] {
  const result: PagamentoPendente[] = []

  for (const r of reservations) {
    if (r.status === "cancelada") continue
    const property = propertyMap.get(r.propriedadeId)

    // Reserva base: pagamento no dia seguinte ao check-in
    const baseVencimento = addDaysStr(toLocalDateStr(r.checkIn), 1)
    if (!r.pagamentoRecebido && baseVencimento <= today) {
      result.push({
        key: `reserva-${r.id}`,
        origem: "reserva",
        nome: r.nomeHospede,
        propriedadeId: r.propriedadeId,
        valor: calcValorPagamento(r, property),
        vencimento: baseVencimento,
        link: `/reservas/${r.id}`,
      })
    }

    // Cada extensão é paga no mês em que começa e tem confirmação própria
    const extensoes = r.extensoes ?? []
    for (const [idx, ext] of extensoes.entries()) {
      if (ext.pagamentoRecebido) continue
      const vencimento = addDaysStr(toLocalDateStr(ext.dataInicio), 1)
      if (vencimento > today) continue
      result.push({
        key: `reserva-${r.id}-ext-${idx}`,
        origem: "extensao",
        nome: r.nomeHospede,
        propriedadeId: r.propriedadeId,
        valor: calcValorReciboExtensao(r, property, ext.valor),
        vencimento,
        link: `/reservas/${r.id}`,
        badge: extensoes.length > 1 ? `EXTENSÃO ${idx + 1}/${extensoes.length}` : "EXTENSÃO",
      })
    }
  }

  for (const l of locacoes) {
    // Locação encerrada não gera mais cobrança — o contrato acabou
    if (l.status !== "ativa") continue
    const checkInDate = toLocalDateStr(l.checkIn)
    const checkOutDate = toLocalDateStr(l.checkOut)

    // Sem administração: uma cobrança por parcela da taxa de intermediação
    if (isSemAdministracao(l)) {
      const parcelas = getParcelasTaxa(l)
      for (const [idx, parcela] of parcelas.entries()) {
        const vencimento = format(getParcelaDate(l, parcela), "yyyy-MM-dd")
        if (vencimento > today) continue
        if (recebidoSet.has(`${l.id}-${parcela.mes}-${parcela.ano}`)) continue
        result.push({
          key: `locacao-${l.id}-${parcela.mes}-${parcela.ano}`,
          origem: "taxa_intermediacao",
          nome: l.nomeCompleto,
          propriedadeId: l.propriedadeId,
          valor: parcela.valor,
          vencimento,
          link: `/longatemporada/${l.id}`,
          badge: parcelas.length > 1 ? `SEM ADM. ${idx + 1}/${parcelas.length}` : "SEM ADM.",
        })
      }
      continue
    }

    // Administrada: comissão do ciclo corrente (paga e mora, no dia da entrada de cada mês)
    const checkInParsed = parseISO(checkInDate)
    const todayParsed = parseISO(today)
    const isAvista = l.tipoPagamento === "avista"

    let cicloStart = checkInParsed
    while (
      isBefore(addMonths(cicloStart, 1), todayParsed) ||
      addMonths(cicloStart, 1).getTime() === todayParsed.getTime()
    ) {
      cicloStart = addMonths(cicloStart, 1)
    }
    if (isBefore(todayParsed, checkInParsed)) cicloStart = checkInParsed

    const vencimento = isAvista ? checkInDate : format(cicloStart, "yyyy-MM-dd")
    const pagMes = isAvista ? checkInParsed.getMonth() + 1 : cicloStart.getMonth() + 1
    const pagAno = isAvista ? checkInParsed.getFullYear() : cicloStart.getFullYear()

    // O dia do checkout não tem pagamento
    if (vencimento > today || vencimento >= checkOutDate) continue
    if (recebidoSet.has(`${l.id}-${pagMes}-${pagAno}`)) continue

    const valorBruto = isAvista ? (l.valorTotal ?? 0) : (l.valorMensal ?? 0)
    result.push({
      key: `locacao-${l.id}-${pagMes}-${pagAno}`,
      origem: "locacao",
      nome: l.nomeCompleto,
      propriedadeId: l.propriedadeId,
      valor: (valorBruto * (l.percentualComissao ?? 0)) / 100,
      vencimento,
      link: `/longatemporada/${l.id}`,
    })
  }

  return result.sort((a, b) => b.vencimento.localeCompare(a.vencimento))
}

function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
