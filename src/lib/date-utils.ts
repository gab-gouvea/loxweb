import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO } from "date-fns"
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

export function toDateString(date: Date): string {
  return date.toISOString()
}

export function getCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
  return eachDayOfInterval({ start, end })
}

export function getWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

export { isSameMonth, isToday, isSameDay, parseISO }

export const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
