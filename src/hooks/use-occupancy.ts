import { useMemo } from "react"
import { startOfMonth, endOfMonth, getDaysInMonth, parseISO, differenceInDays, max, min, addDays } from "date-fns"
import { usePropertyMap } from "./use-property-map"
import { useReservations } from "./use-reservations"
import { toLocalDateStr } from "@/lib/date-utils"

export interface PropertyOccupancy {
  id: string
  nome: string
  pct: number
  occupiedDays: number
  totalDays: number
}

export function useOccupancy(month: Date) {
  const { properties } = usePropertyMap()
  const { data: reservations = [] } = useReservations()

  const occupancy = useMemo(() => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)
    const totalDays = getDaysInMonth(month)
    const activeProperties = properties.filter((p) => p.ativo)
    const naoCanceladas = reservations.filter((r) => r.status !== "cancelada")

    return activeProperties.map((prop) => {
      const propReservations = naoCanceladas.filter((r) => r.propriedadeId === prop.id)
      let occupiedDays = 0
      for (const r of propReservations) {
        const checkIn = parseISO(toLocalDateStr(r.checkIn))
        const checkOut = parseISO(toLocalDateStr(r.checkOut))
        const overlapStart = max([checkIn, monthStart])
        const overlapEnd = min([addDays(checkOut, 1), addDays(monthEnd, 1)])
        const days = differenceInDays(overlapEnd, overlapStart)
        if (days > 0) occupiedDays += days
      }
      if (occupiedDays > totalDays) occupiedDays = totalDays
      const pct = Math.round((occupiedDays / totalDays) * 100)
      return { id: prop.id, nome: prop.nome, pct, occupiedDays, totalDays }
    }).sort((a, b) => b.pct - a.pct)
  }, [properties, reservations, month])

  const avgOccupancy = occupancy.length > 0
    ? Math.round(occupancy.reduce((sum, o) => sum + o.pct, 0) / occupancy.length)
    : 0

  return { occupancy, avgOccupancy }
}
