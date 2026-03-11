import { useMemo } from "react"
import { addDays, format, isToday, getDay } from "date-fns"
import { cn } from "@/lib/utils"
import { computeTimelineSegments } from "@/lib/calendar-utils"
import { DAYS_OF_WEEK } from "@/lib/date-utils"
import { CalendarReservationBar } from "./calendar-reservation-bar"
import type { Reservation } from "@/types/reservation"
import type { Property } from "@/types/property"

const COL_WIDTH = 80
const ROW_HEIGHT = 48
const HEADER_HEIGHT = 52

interface CalendarGridProps {
  startDate: Date
  visibleDays: number
  reservations: Reservation[]
  properties: Property[]
  onDayClick: (date: Date) => void
  onReservationClick: (reservationId: string) => void
}

export function CalendarGrid({
  startDate,
  visibleDays,
  reservations,
  properties,
  onDayClick,
  onReservationClick,
}: CalendarGridProps) {
  const days = useMemo(() => {
    return Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i))
  }, [startDate, visibleDays])

  const segments = useMemo(
    () => computeTimelineSegments(reservations, startDate, visibleDays),
    [reservations, startDate, visibleDays],
  )

  const segmentsByProperty = useMemo(() => {
    const map = new Map<string, typeof segments>()
    for (const seg of segments) {
      const list = map.get(seg.propertyId) ?? []
      list.push(seg)
      map.set(seg.propertyId, list)
    }
    return map
  }, [segments])

  const reservationMap = useMemo(() => {
    const map = new Map<string, Reservation>()
    for (const r of reservations) {
      map.set(r.id, r)
    }
    return map
  }, [reservations])

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>()
    for (const p of properties) {
      map.set(p.id, p)
    }
    return map
  }, [properties])

  return (
    <div className="rounded-lg border overflow-hidden flex">
      {/* Property sidebar */}
      <div className="shrink-0 w-[200px] border-r bg-muted/30">
        <div
          className="border-b flex items-center px-3 text-sm font-medium text-muted-foreground"
          style={{ height: HEADER_HEIGHT }}
        >
          Imóveis
        </div>
        {properties.map((prop) => (
          <div
            key={prop.id}
            className="border-b last:border-b-0 flex items-center gap-2 px-3"
            style={{ height: ROW_HEIGHT }}
          >
            <span className="truncate text-sm font-medium">{prop.nome}</span>
          </div>
        ))}
      </div>

      {/* Timeline area */}
      <div className="flex-1 overflow-x-auto">
        <div style={{ width: visibleDays * COL_WIDTH }}>
          {/* Day headers */}
          <div className="flex border-b" style={{ height: HEADER_HEIGHT }}>
            {days.map((day, i) => {
              const today = isToday(day)
              return (
                <div
                  key={i}
                  className={cn(
                    "shrink-0 border-r last:border-r-0 flex flex-col items-center justify-center",
                    today && "bg-primary/10",
                  )}
                  style={{ width: COL_WIDTH }}
                >
                  <span className="text-xs text-muted-foreground">
                    {DAYS_OF_WEEK[getDay(day)]}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      today &&
                        "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Property rows */}
          {properties.map((prop) => {
            const propSegments = segmentsByProperty.get(prop.id) ?? []
            return (
              <div
                key={prop.id}
                className="relative flex border-b last:border-b-0"
                style={{ height: ROW_HEIGHT }}
              >
                {/* Day cells (clickable) */}
                {days.map((day, i) => {
                  const today = isToday(day)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onDayClick(day)}
                      className={cn(
                        "shrink-0 border-r last:border-r-0 h-full hover:bg-accent/50 transition-colors",
                        today && "bg-primary/5",
                      )}
                      style={{ width: COL_WIDTH }}
                    />
                  )
                })}

                {/* Reservation bars for this property */}
                {propSegments.map((seg) => (
                  <CalendarReservationBar
                    key={seg.reservationId}
                    segment={seg}
                    colWidth={COL_WIDTH}
                    rowHeight={ROW_HEIGHT}
                    reservation={reservationMap.get(seg.reservationId)}
                    property={propertyMap.get(seg.propertyId)}
                    onClick={onReservationClick}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
