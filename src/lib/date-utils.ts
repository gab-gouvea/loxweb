import { format, isSameMonth, isToday, isSameDay, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"

export function formatMonth(date: Date): string {
  return format(date, "MMMM yyyy", { locale: ptBR })
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, "dd/MM/yyyy", { locale: ptBR })
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, "dd MMM", { locale: ptBR })
}

/** Converte ISO string para YYYY-MM-DD local (evita shift de timezone) */
export function toLocalDateStr(isoStr: string): string {
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function getTodayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/** Converte YYYY-MM-DD local para ISO string (evita shift de timezone) */
export function localDateToISO(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toISOString()
}

export { isSameMonth, isToday, isSameDay, parseISO }

export const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
