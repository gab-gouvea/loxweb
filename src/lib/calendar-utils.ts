import { parseISO, startOfDay, endOfDay, max, min, differenceInDays, getDay } from "date-fns"
import type { Reservation } from "@/types/reservation"
import type { PropertyColor } from "@/types/property"

export interface CalendarBarSegment {
  reservationId: string
  propertyId: string
  color: PropertyColor
  guestName: string
  startCol: number
  endCol: number
  spanCols: number
  isStart: boolean
  isEnd: boolean
  row: number
}

export function computeBarSegments(
  reservations: Reservation[],
  weekStart: Date,
  weekEnd: Date,
  propertyColorMap: Map<string, PropertyColor>,
): CalendarBarSegment[] {
  const segments: CalendarBarSegment[] = []

  for (const reservation of reservations) {
    const checkIn = startOfDay(parseISO(reservation.checkIn))
    const checkOut = startOfDay(parseISO(reservation.checkOut))

    // Skip if reservation doesn't overlap this week
    if (checkOut <= weekStart || checkIn > weekEnd) continue

    const visibleStart = max([checkIn, weekStart])
    const visibleEnd = min([checkOut, endOfDay(weekEnd)])
    const visibleEndDay = startOfDay(visibleEnd)

    const startCol = getDay(visibleStart)
    let endCol = getDay(visibleEndDay)

    // If checkout is exactly on weekStart of next week, skip
    if (differenceInDays(visibleEndDay, visibleStart) < 0) continue

    // Clamp endCol
    if (endCol < startCol && differenceInDays(visibleEndDay, visibleStart) > 0) {
      endCol = 6
    }

    // For checkOut day: the bar ends on checkout day (not overnight)
    const actualEndDay = min([checkOut, endOfDay(weekEnd)])
    const actualEndDayStart = startOfDay(actualEndDay)
    endCol = getDay(actualEndDayStart)

    // If the checkout day is the same as visibleStart but checkout == weekStart, skip
    if (startCol > endCol) continue

    segments.push({
      reservationId: reservation.id,
      propertyId: reservation.propriedadeId,
      color: propertyColorMap.get(reservation.propriedadeId) ?? "blue",
      guestName: reservation.nomeHospede,
      startCol,
      endCol,
      spanCols: endCol - startCol + 1,
      isStart: checkIn >= weekStart,
      isEnd: checkOut <= endOfDay(weekEnd),
      row: 0,
    })
  }

  assignRows(segments)
  return segments
}

function assignRows(segments: CalendarBarSegment[]): void {
  segments.sort((a, b) => a.startCol - b.startCol || b.spanCols - a.spanCols)

  const occupiedRows: Set<number>[] = Array.from({ length: 7 }, () => new Set())

  for (const segment of segments) {
    let row = 0
    while (true) {
      let fits = true
      for (let col = segment.startCol; col <= segment.endCol; col++) {
        if (occupiedRows[col].has(row)) {
          fits = false
          break
        }
      }
      if (fits) break
      row++
    }
    segment.row = row
    for (let col = segment.startCol; col <= segment.endCol; col++) {
      occupiedRows[col].add(row)
    }
  }
}
