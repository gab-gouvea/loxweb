import { addMonths, format } from "date-fns"
import type { Locacao } from "@/types/locacao"
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

/** "yyyy-MM" do mês em que a taxa de intermediação é recebida. */
export function getTaxaYM(l: Locacao): string {
  const { mes, ano } = getTaxaMesAno(l)
  return `${ano}-${String(mes).padStart(2, "0")}`
}

/** Data em que a taxa cai: dia do check-in dentro do mês/ano da taxa. */
export function getTaxaDate(l: Locacao): Date {
  const { mes, ano } = getTaxaMesAno(l)
  const diaCheckIn = getCheckInLocal(l).getDate()
  // Dia 0 do mês seguinte = último dia do mês da taxa (protege 31/jan → fev)
  const ultimoDia = new Date(ano, mes, 0).getDate()
  return new Date(ano, mes - 1, Math.min(diaCheckIn, ultimoDia))
}

/** Taxa única de intermediação = % negociado sobre o primeiro aluguel. */
export function calcTaxaIntermediacao(l: Locacao): number {
  const primeiroAluguel = l.tipoPagamento === "avista" ? (l.valorTotal ?? 0) : (l.valorMensal ?? 0)
  return (primeiroAluguel * (l.percentualPrimeiroAluguel ?? 0)) / 100
}

/**
 * A locação gera recebimento no mês informado ("yyyy-MM")?
 * Sem administração: só no mês da taxa. Com administração: em todo ciclo mensal (ou no check-in, à vista).
 */
export function hasRecebimentoNoMes(l: Locacao, ym: string): boolean {
  if (isSemAdministracao(l)) return getTaxaYM(l) === ym

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
  if (isSemAdministracao(l)) return calcTaxaIntermediacao(l)
  return (calcBrutoNoMes(l, ym) * (l.percentualComissao ?? 0)) / 100
}
