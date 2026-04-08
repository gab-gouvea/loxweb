import { useMemo } from "react"
import { format } from "date-fns"
import { useReservations } from "./use-reservations"
import { toLocalDateStr } from "@/lib/date-utils"

/** Filtra reservas cujo checkIn cai no mês informado */
export function useReservationsByMonth(currentMonth: Date) {
  const { data: allReservations = [], ...rest } = useReservations()

  const reportYM = format(currentMonth, "yyyy-MM")

  const reservations = useMemo(() => {
    return allReservations.filter((r) => {
      return toLocalDateStr(r.checkIn).substring(0, 7) === reportYM
    })
  }, [allReservations, reportYM])

  return { data: reservations, allReservations, ...rest }
}
