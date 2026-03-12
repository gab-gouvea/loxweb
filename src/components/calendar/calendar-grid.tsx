import { useMemo } from "react"
import { addDays, format, isToday, getDay, differenceInCalendarDays, parseISO, startOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { computeTimelineSegments } from "@/lib/calendar-utils"
import { DAYS_OF_WEEK } from "@/lib/date-utils"
import { CalendarReservationBar } from "./calendar-reservation-bar"
import type { Reservation } from "@/types/reservation"
import type { Property } from "@/types/property"

const COL_WIDTH = 80
const ROW_HEIGHT = 56
const HEADER_HEIGHT = 52

interface CalendarGridProps {
  startDate: Date
  visibleDays: number
  reservations: Reservation[]
  properties: Property[]
  ownerNames?: Map<string, string>
  onDayClick: (date: Date, propertyId: string) => void
  onReservationClick: (reservationId: string) => void
  showCheckoutsFaxinas: boolean
}

interface CellLabels {
  checkins: string[]
  checkouts: string[]
  faxinas: string[]
}

export function CalendarGrid({
  startDate,
  visibleDays,
  reservations,
  properties,
  ownerNames,
  onDayClick,
  onReservationClick,
  showCheckoutsFaxinas,
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

  // Compute checkout/faxina labels per cell: key = "propertyId-dayIndex"
  const cellLabelsMap = useMemo(() => {
    if (!showCheckoutsFaxinas) return new Map<string, CellLabels>()

    const map = new Map<string, CellLabels>()
    const sd = startOfDay(startDate)

    for (const r of reservations) {
      // Check-in label
      const checkInDay = differenceInCalendarDays(startOfDay(parseISO(r.checkIn)), sd)
      if (checkInDay >= 0 && checkInDay < visibleDays) {
        const key = `${r.propriedadeId}-${checkInDay}`
        const existing = map.get(key) ?? { checkins: [], checkouts: [], faxinas: [] }
        existing.checkins.push(r.nomeHospede)
        map.set(key, existing)
      }

      // Checkout label
      const checkOutDay = differenceInCalendarDays(startOfDay(parseISO(r.checkOut)), sd)
      if (checkOutDay >= 0 && checkOutDay < visibleDays) {
        const key = `${r.propriedadeId}-${checkOutDay}`
        const existing = map.get(key) ?? { checkins: [], checkouts: [], faxinas: [] }
        existing.checkouts.push(r.nomeHospede)
        map.set(key, existing)
      }

      // Faxina label (only for agendada, using faxinaData or fallback to checkOut)
      if (r.faxinaStatus === "agendada") {
        const faxinaDateStr = r.faxinaData ?? r.checkOut
        const faxinaDay = differenceInCalendarDays(startOfDay(parseISO(faxinaDateStr)), sd)
        if (faxinaDay >= 0 && faxinaDay < visibleDays) {
          const key = `${r.propriedadeId}-${faxinaDay}`
          const existing = map.get(key) ?? { checkins: [], checkouts: [], faxinas: [] }
          existing.faxinas.push(r.nomeHospede)
          map.set(key, existing)
        }
      }
    }

    return map
  }, [showCheckoutsFaxinas, reservations, startDate, visibleDays])

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
        {properties.map((prop) => {
          const owner = ownerNames?.get(prop.proprietarioId ?? "")
          return (
            <div
              key={prop.id}
              className="border-b last:border-b-0 flex items-center gap-2 px-3"
              style={{ height: ROW_HEIGHT }}
            >
              {prop.fotoCapa ? (
                <img
                  src={prop.fotoCapa}
                  alt={prop.nome}
                  className="h-9 w-9 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="h-9 w-9 shrink-0 rounded-md bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium leading-tight">{prop.nome}</span>
                {owner && (
                  <span className="block truncate text-[10px] text-muted-foreground/70 uppercase leading-tight">
                    {owner}
                  </span>
                )}
              </div>
            </div>
          )
        })}
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
                  const labels = showCheckoutsFaxinas ? cellLabelsMap.get(`${prop.id}-${i}`) : undefined
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onDayClick(day, prop.id)}
                      className={cn(
                        "shrink-0 border-r last:border-r-0 h-full hover:bg-accent/50 transition-colors",
                        today && "bg-primary/5",
                        showCheckoutsFaxinas && "flex flex-col items-center justify-center gap-0.5",
                      )}
                      style={{ width: COL_WIDTH }}
                    >
                      {labels && (() => {
                        const hasCheckIn = labels.checkins.length > 0
                        const hasCheckOut = labels.checkouts.length > 0
                        const hasFaxina = labels.faxinas.length > 0
                        const hasBoth = hasCheckIn && hasCheckOut

                        if (hasBoth) {
                          return (
                            <>
                              <span className="flex items-center gap-0.5">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                              </span>
                              <span className="text-[9px] font-bold leading-tight"><span className="text-red-600">OUT</span><span className="text-black">/</span><span className="text-green-600">IN</span></span>
                              {hasFaxina && (
                                <span className="text-[9px] font-bold text-yellow-500 leading-tight">FAXINA</span>
                              )}
                            </>
                          )
                        }

                        return (
                          <>
                            {hasCheckIn && (
                              <span className="text-[10px] font-bold text-green-600 leading-tight">CHECKIN</span>
                            )}
                            {hasCheckOut && (
                              <span className="text-[10px] font-bold text-red-600 leading-tight">CHECKOUT</span>
                            )}
                            {hasFaxina && (
                              <span className="text-[10px] font-bold text-yellow-500 leading-tight">FAXINA</span>
                            )}
                          </>
                        )
                      })()}
                    </button>
                  )
                })}

                {/* Reservation bars for this property (hidden in checkout/faxina mode) */}
                {!showCheckoutsFaxinas && propSegments.map((seg) => (
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
