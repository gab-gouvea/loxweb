import { addMonths, format } from "date-fns"
import type { Locacao, ParcelaTaxa } from "@/types/locacao"
import { toLocalDateStr } from "@/lib/date-utils"

/** Data local do check-in (evita shift de timezone ao converter o Instant do backend). */
export function getCheckInLocal(l: Locacao): Date {
  const [y, m, d] = toLocalDateStr(l.checkIn).split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** true quando a locação é só intermediação (sem administração mensal). */
export function isSemAdministracao(l: Locacao): boolean {
  return l.tipoLocacao === "anual" && l.semAdministracao === true
}

/**
 * Mês/ano em que a taxa de intermediação é recebida.
 * Padrão (e fallback para registros antigos, sem mesTaxa/anoTaxa gravados): mês seguinte ao check-in,
 * porque o inquilino entra, mora e paga o primeiro aluguel antes do repasse.
 */
export function getTaxaMesAno(l: Locacao): { mes: number; ano: number } {
  if (l.mesTaxa != null && l.anoTaxa != null) {
    return { mes: l.mesTaxa, ano: l.anoTaxa }
  }
  const padrao = addMonths(getCheckInLocal(l), 1)
  return { mes: padrao.getMonth() + 1, ano: padrao.getFullYear() }
}

/** Taxa total de intermediação = % negociado sobre o primeiro aluguel. */
export function calcTaxaIntermediacao(l: Locacao): number {
  const primeiroAluguel = l.tipoPagamento === "avista" ? (l.valorTotal ?? 0) : (l.valorMensal ?? 0)
  return (primeiroAluguel * (l.percentualPrimeiroAluguel ?? 0)) / 100
}

/**
 * Parcelas da taxa. A taxa pode ser recebida de uma vez ou dividida em vários meses.
 * Registros antigos (sem parcelasTaxa) viram uma parcela única com a taxa inteira, no mês da taxa.
 */
export function getParcelasTaxa(l: Locacao): ParcelaTaxa[] {
  if (l.parcelasTaxa?.length) {
    return [...l.parcelasTaxa].sort((a, b) => a.ano - b.ano || a.mes - b.mes)
  }
  const { mes, ano } = getTaxaMesAno(l)
  return [{ dia: getCheckInLocal(l).getDate(), mes, ano, valor: calcTaxaIntermediacao(l) }]
}

/** "yyyy-MM" de uma parcela. */
export function getParcelaYM(p: ParcelaTaxa): string {
  return `${p.ano}-${String(p.mes).padStart(2, "0")}`
}

/** Data de uma parcela. Sem dia informado, usa o dia do check-in. */
export function getParcelaDate(l: Locacao, p: ParcelaTaxa): Date {
  const dia = p.dia ?? getCheckInLocal(l).getDate()
  // Dia 0 do mês seguinte = último dia do mês da parcela (protege 31/jan → fev)
  const ultimoDia = new Date(p.ano, p.mes, 0).getDate()
  return new Date(p.ano, p.mes - 1, Math.min(dia, ultimoDia))
}

/** Parcelas que caem no mês informado ("yyyy-MM"). */
export function getParcelasNoMes(l: Locacao, ym: string): ParcelaTaxa[] {
  return getParcelasTaxa(l).filter((p) => getParcelaYM(p) === ym)
}

/** "yyyy-MM" da primeira parcela. */
export function getTaxaYM(l: Locacao): string {
  return getParcelaYM(getParcelasTaxa(l)[0])
}

/** Data da primeira parcela. */
export function getTaxaDate(l: Locacao): Date {
  return getParcelaDate(l, getParcelasTaxa(l)[0])
}

/**
 * A locação gera recebimento no mês informado ("yyyy-MM")?
 * Sem administração: nos meses das parcelas da taxa. Com administração: em todo ciclo mensal
 * (ou apenas no check-in, quando à vista).
 */
export function hasRecebimentoNoMes(l: Locacao, ym: string): boolean {
  if (isSemAdministracao(l)) return getParcelasNoMes(l, ym).length > 0

  const checkInLocal = getCheckInLocal(l)
  if (l.tipoPagamento === "avista") return format(checkInLocal, "yyyy-MM") === ym

  const [oy, om, od] = toLocalDateStr(l.checkOut).split("-").map(Number)
  const checkOutLocal = new Date(oy, om - 1, od)
  let current = new Date(checkInLocal)
  while (current < checkOutLocal) {
    if (format(current, "yyyy-MM") === ym) return true
    current = addMonths(current, 1)
  }
  return false
}

/** Valor bruto (aluguel) que serve de base para a receita do mês. 0 se não há recebimento no mês. */
export function calcBrutoNoMes(l: Locacao, ym: string): number {
  if (!hasRecebimentoNoMes(l, ym)) return 0
  if (l.tipoPagamento === "avista") return l.valorTotal ?? 0
  return l.valorMensal ?? 0
}

/**
 * Receita da locação no mês. Quando o recebimento já foi confirmado, o valor gravado prevalece —
 * preserva o histórico de antes de um reajuste.
 */
export function calcReceitaNoMes(l: Locacao, ym: string, valorRecebidoConfirmado?: number): number {
  if (!hasRecebimentoNoMes(l, ym)) return 0
  if (valorRecebidoConfirmado != null) return valorRecebidoConfirmado
  // Sem administração: soma das parcelas que caem neste mês (podem ser mais de uma)
  if (isSemAdministracao(l)) {
    return getParcelasNoMes(l, ym).reduce((acc, p) => acc + p.valor, 0)
  }
  return (calcBrutoNoMes(l, ym) * (l.percentualComissao ?? 0)) / 100
}
