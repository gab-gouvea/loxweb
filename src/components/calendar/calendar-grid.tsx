import { useMemo } from "react"
import { startOfWeek, endOfWeek, addDays } from "date-fns"
import { cn } from "@/lib/utils"
import { getCalendarDays, getWeeks, isSameMonth, isToday, DAYS_OF_WEEK } from "@/lib/date-utils"
import { computeBarSegments } from "@/lib/calendar-utils"
import { CalendarReservationBar } from "./calendar-reservation-bar"
import type { Reservation } from "@/types/reservation"
import type { Property } from "@/types/property"
import type { PropertyColor } from "@/types/property"

interface CalendarGridProps {
  currentMonth: Date
  reservations: Reservation[]
  properties: Property[]
  selectedPropertyIds: string[] | null
  onDayClick: (date: Date) => void
  onReservationClick: (reservationId: string) => void
}

export function CalendarGrid({
  currentMonth,
  reservations,
  properties,
  selectedPropertyIds,
  onDayClick,
  onReservationClick,
}: CalendarGridProps) {
  const days = useMemo(() => getCalendarDays(currentMonth), [currentMonth])
  const weeks = useMemo(() => getWeeks(days), [days])

  const propertyColorMap = useMemo(() => {
    const map = new Map<string, PropertyColor>()
    for (const p of properties) {
      map.set(p.id, p.cor)
    }
    return map
  }, [properties])

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>()
    for (const p of properties) {
      map.set(p.id, p)
    }
    return map
  }, [properties])

  const reservationMap = useMemo(() => {
    const map = new Map<string, Reservation>()
    for (const r of reservations) {
      map.set(r.id, r)
    }
    return map
  }, [reservations])

  const filteredReservations = useMemo(() => {
    if (!selectedPropertyIds) return reservations
    return reservations.filter((r) => selectedPropertyIds.includes(r.propriedadeId))
  }, [reservations, selectedPropertyIds])

  return (
    <div className="rounded-lg border">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="border-r py-2 text-center text-sm font-medium text-muted-foreground last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, weekIndex) => {
        const weekStart = startOfWeek(week[0], { weekStartsOn: 0 })
        const weekEnd = endOfWeek(week[0], { weekStartsOn: 0 })

        const segments = computeBarSegments(
          filteredReservations,
          weekStart,
          addDays(weekEnd, 0),
          propertyColorMap,
        )

        const maxRow = segments.length > 0
          ? Math.max(...segments.map((s) => s.row))
          : -1
        const minHeight = Math.max(90, 34 + (maxRow + 1) * 22 + 8)

        return (
          <div
            key={weekIndex}
            className="relative grid grid-cols-7 border-b last:border-b-0"
            style={{ minHeight: `${minHeight}px` }}
          >
            {/* Day cells */}
            {week.map((day, dayIndex) => {
              const inMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)

              return (
                <button
                  key={dayIndex}
                  type="button"
                  onClick={() => onDayClick(day)}
                  className={cn(
                    "border-r p-1 text-left last:border-r-0 hover:bg-accent/50 transition-colors",
                    !inMonth && "bg-muted/30 text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm",
                      today && "bg-primary text-primary-foreground font-bold",
                    )}
                  >
                    {day.getDate()}
                  </span>
                </button>
              )
            })}

            {/* Reservation bars */}
            {segments.map((segment) => (
              <CalendarReservationBar
                key={`${segment.reservationId}-${segment.startCol}`}
                segment={segment}
                reservation={reservationMap.get(segment.reservationId)}
                property={propertyMap.get(segment.propertyId)}
                onClick={onReservationClick}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
