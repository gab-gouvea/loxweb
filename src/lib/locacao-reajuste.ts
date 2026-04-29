import { addMonths, format, parseISO } from "date-fns"
import { toLocalDateStr } from "./date-utils"

/** Aceita tanto ISO timestamp quanto YYYY-MM-DD; retorna sempre YYYY-MM-DD local. */
function normalizeDateStr(s: string): string {
  // YYYY-MM-DD já está no formato esperado — usar direto evita shift de timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return toLocalDateStr(s)
}

/**
 * Calcula a data do próximo reajuste anual de uma locação.
 * Retorna formato YYYY-MM-DD (LocalDate).
 *
 * Base = ultimoReajuste se existir, senão checkIn.
 * Próximo reajuste = base + 12 meses.
 */
export function calcProximoReajuste(checkIn: string, ultimoReajuste?: string | null): string {
  const base = ultimoReajuste ? normalizeDateStr(ultimoReajuste) : normalizeDateStr(checkIn)
  return format(addMonths(parseISO(base), 12), "yyyy-MM-dd")
}

/**
 * Decide se o alerta de reajuste anual deve disparar.
 *
 * Regras:
 * - Só locações anuais e ativas (caller filtra).
 * - Próximo reajuste deve cair antes do checkOut (locação ainda ativa nessa data).
 * - Hoje deve estar a no máximo `windowDays` dias do reajuste (default 30).
 *   Inclui datas passadas (atraso) — a função retorna true mesmo após o reajuste.
 */
export function shouldAlertReajuste(
  proximoReajuste: string,
  checkOut: string,
  today: string,
  windowDays = 30,
): boolean {
  const checkOutLocal = normalizeDateStr(checkOut)
  if (proximoReajuste >= checkOutLocal) return false

  const diffMs = parseISO(proximoReajuste).getTime() - parseISO(today).getTime()
  const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return dias <= windowDays
}
