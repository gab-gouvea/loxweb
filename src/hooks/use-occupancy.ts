import { useMemo } from "react"
import { getDaysInMonth, addDays, differenceInCalendarDays } from "date-fns"
import { usePropertyMap } from "./use-property-map"
import { useReservations } from "./use-reservations"
import { useLocacoes } from "./use-locacoes"
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
  const { data: locacoes = [] } = useLocacoes()

  const occupancy = useMemo(() => {
    const totalDays = getDaysInMonth(month)
    // Usar datas locais sem timezone: ano-mes-01 e ano-mes-totalDays
    const year = month.getFullYear()
    const m = month.getMonth()
    const monthStartLocal = new Date(year, m, 1)
    const monthEndLocal = new Date(year, m, totalDays)
    const activeProperties = properties.filter((p) => p.ativo)
    const naoCanceladas = reservations.filter((r) => r.status !== "cancelada")

    // Locações: incluir encerradas se checkout >= início do mês
    const monthStartStr = `${year}-${String(m + 1).padStart(2, "0")}-01`
    const locacoesRelevantes = locacoes.filter((l) => {
      if (l.status === "encerrada") {
        return toLocalDateStr(l.checkOut) >= monthStartStr
      }
      return true
    })

    return activeProperties.map((prop) => {
      const propReservations = naoCanceladas.filter((r) => r.propriedadeId === prop.id)
      const propLocacoes = locacoesRelevantes.filter((l) => l.propriedadeId === prop.id)
      const occupiedSet = new Set<number>()

      // Reservas
      for (const r of propReservations) {
        const ciStr = toLocalDateStr(r.checkIn)
        const coStr = toLocalDateStr(r.checkOut)
        const [cy, cm, cd] = ciStr.split("-").map(Number)
        const [oy, om, od] = coStr.split("-").map(Number)
        const checkIn = new Date(cy, cm - 1, cd)
        const checkOut = new Date(oy, om - 1, od)
        let day = checkIn < monthStartLocal ? new Date(monthStartLocal) : new Date(checkIn)
        const end = checkOut > monthEndLocal ? addDays(monthEndLocal, 1) : checkOut
        while (day < end) {
          occupiedSet.add(differenceInCalendarDays(day, monthStartLocal))
          day = addDays(day, 1)
        }
      }

      // Locações
      for (const l of propLocacoes) {
        const ciStr = toLocalDateStr(l.checkIn)
        const coStr = toLocalDateStr(l.checkOut)
        const [cy, cm, cd] = ciStr.split("-").map(Number)
        const [oy, om, od] = coStr.split("-").map(Number)
        const checkIn = new Date(cy, cm - 1, cd)
        const checkOut = new Date(oy, om - 1, od)
        let day = checkIn < monthStartLocal ? new Date(monthStartLocal) : new Date(checkIn)
        const end = checkOut > monthEndLocal ? addDays(monthEndLocal, 1) : checkOut
        while (day < end) {
          occupiedSet.add(differenceInCalendarDays(day, monthStartLocal))
          day = addDays(day, 1)
        }
      }

      const occupiedDays = occupiedSet.size
      const pct = Math.round((occupiedDays / totalDays) * 100)
      return { id: prop.id, nome: prop.nome, pct, occupiedDays, totalDays }
    }).sort((a, b) => b.pct - a.pct)
  }, [properties, reservations, locacoes, month])

  const avgOccupancy = occupancy.length > 0
    ? Math.round(occupancy.reduce((sum, o) => sum + o.pct, 0) / occupancy.length)
    : 0

  return { occupancy, avgOccupancy }
}
