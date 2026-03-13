import { useMemo } from "react"
import { startOfMonth, endOfMonth, parseISO } from "date-fns"
import { useReservations } from "./use-reservations"

/** Filtra reservas cujo checkIn cai no mês informado */
export function useReservationsByMonth(currentMonth: Date) {
  const { data: allReservations = [], ...rest } = useReservations()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const reservations = useMemo(() => {
    return allReservations.filter((r) => {
      const checkIn = parseISO(r.checkIn)
      return checkIn >= monthStart && checkIn <= monthEnd
    })
  }, [allReservations, monthStart, monthEnd])

  return { data: reservations, allReservations, ...rest }
}
