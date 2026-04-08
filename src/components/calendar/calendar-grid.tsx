import { useMemo } from "react"
import { addDays, addMonths, format, isToday, getDay, differenceInCalendarDays, parseISO, startOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { computeTimelineSegments } from "@/lib/calendar-utils"
import { DAYS_OF_WEEK, toLocalDateStr } from "@/lib/date-utils"
import { CalendarReservationBar } from "./calendar-reservation-bar"
import type { Reservation } from "@/types/reservation"
import type { Locacao } from "@/types/locacao"
import type { Property } from "@/types/property"
import type { Proprietario } from "@/types/proprietario"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrency } from "@/lib/constants"
import { calcValorPagamento } from "@/lib/reservation-calculations"

const COL_WIDTH = 80
const ROW_HEIGHT = 56
const HEADER_HEIGHT = 52

interface CalendarGridProps {
  startDate: Date
  visibleDays: number
  reservations: Reservation[]
  locacoes?: Locacao[]
  properties: Property[]
  proprietarioMap?: Map<string, Proprietario>
  onDayClick: (date: Date, propertyId: string) => void
  onReservationClick: (reservationId: string) => void
  onLocacaoClick?: (locacaoId: string) => void
  showCheckoutsFaxinas: boolean
}

interface CellLabels {
  checkins: string[]
  checkouts: string[]
  faxinas: string[]
  faxinasRotina: string[] // faxina de rotina de locação (mostra nome do inquilino)
  pagamentos: { nomeHospede: string; precoTotal: number }[]
}

export function CalendarGrid({
  startDate,
  visibleDays,
  reservations,
  locacoes = [],
  properties,
  proprietarioMap,
  onDayClick,
  onReservationClick,
  onLocacaoClick,
  showCheckoutsFaxinas,
}: CalendarGridProps) {
  const days = useMemo(() => {
    return Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i))
  }, [startDate, visibleDays])

  const segments = useMemo(
    () => computeTimelineSegments(reservations, startDate, visibleDays, locacoes),
    [reservations, startDate, visibleDays, locacoes],
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

  // Locação segments (blue bars)
  const locacaoSegments = useMemo(() => {
    const segs: { id: string; propertyId: string; guestName: string; faxinaStatus?: string; startOffset: number; endOffset: number; isClippedStart: boolean; isClippedEnd: boolean }[] = []
    const sd = startOfDay(startDate)
    for (const l of locacoes) {
      const checkIn = startOfDay(parseISO(l.checkIn))
      const checkOut = startOfDay(parseISO(l.checkOut))
      const rawStart = differenceInCalendarDays(checkIn, sd)
      const rawEnd = differenceInCalendarDays(checkOut, sd) + 1
      if (rawEnd <= 0 || rawStart >= visibleDays) continue

      let startOffset = Math.max(0, rawStart)
      let endOffset = Math.min(visibleDays, rawEnd)
      const isClippedStart = rawStart < 0
      const isClippedEnd = rawEnd > visibleDays

      // Check if checkin touches another checkout (reservation or locação) — compare date strings
      const locCheckInStr = toLocalDateStr(l.checkIn)
      const locCheckOutStr = toLocalDateStr(l.checkOut)

      const hasOtherCheckout = reservations.some(
        (r) => r.propriedadeId === l.propriedadeId && r.status !== "cancelada" &&
          toLocalDateStr(r.checkOut) === locCheckInStr
      ) || locacoes.some(
        (other) => other.id !== l.id && other.propriedadeId === l.propriedadeId &&
          toLocalDateStr(other.checkOut) === locCheckInStr
      )
      if (hasOtherCheckout) {
        startOffset = Math.max(startOffset, rawStart + 0.5)
      }

      // Check if checkout touches another checkin (reservation or locação)
      const checkOutDay = differenceInCalendarDays(checkOut, sd)
      const hasOtherCheckin = reservations.some(
        (r) => r.propriedadeId === l.propriedadeId && r.status !== "cancelada" &&
          toLocalDateStr(r.checkIn) === locCheckOutStr
      ) || locacoes.some(
        (other) => other.id !== l.id && other.propriedadeId === l.propriedadeId &&
          toLocalDateStr(other.checkIn) === locCheckOutStr
      )
      if (hasOtherCheckin) {
        endOffset = Math.min(endOffset, checkOutDay + 0.5)
      }

      if (endOffset <= startOffset) continue

      segs.push({
        id: l.id,
        propertyId: l.propriedadeId,
        guestName: l.nomeCompleto,
        faxinaStatus: l.faxinaStatus,
        startOffset,
        endOffset,
        isClippedStart,
        isClippedEnd,
      })
    }
    return segs
  }, [locacoes, reservations, startDate, visibleDays])

  const locacaoSegmentsByProperty = useMemo(() => {
    const map = new Map<string, typeof locacaoSegments>()
    for (const seg of locacaoSegments) {
      const list = map.get(seg.propertyId) ?? []
      list.push(seg)
      map.set(seg.propertyId, list)
    }
    return map
  }, [locacaoSegments])

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>()
    for (const p of properties) {
      map.set(p.id, p)
    }
    return map
  }, [properties])

  // Compute checkout/faxina/payment labels per cell: key = "propertyId-dayIndex"
  const cellLabelsMap = useMemo(() => {
    if (!showCheckoutsFaxinas) return new Map<string, CellLabels>()

    const map = new Map<string, CellLabels>()
    const sd = startOfDay(startDate)
    const getCell = (key: string) => map.get(key) ?? { checkins: [], checkouts: [], faxinas: [], faxinasRotina: [], pagamentos: [] }

    for (const r of reservations) {
      // Check-in label
      const checkInDay = differenceInCalendarDays(startOfDay(parseISO(r.checkIn)), sd)
      if (checkInDay >= 0 && checkInDay < visibleDays) {
        const key = `${r.propriedadeId}-${checkInDay}`
        const existing = getCell(key)
        existing.checkins.push(r.nomeHospede)
        map.set(key, existing)
      }

      // Checkout label
      const checkOutDay = differenceInCalendarDays(startOfDay(parseISO(r.checkOut)), sd)
      if (checkOutDay >= 0 && checkOutDay < visibleDays) {
        const key = `${r.propriedadeId}-${checkOutDay}`
        const existing = getCell(key)
        existing.checkouts.push(r.nomeHospede)
        map.set(key, existing)
      }

      // Faxina label (only for agendada, using faxinaData or fallback to checkOut)
      if (r.faxinaStatus === "agendada") {
        const faxinaDateStr = r.faxinaData ?? r.checkOut
        const faxinaDay = differenceInCalendarDays(startOfDay(parseISO(faxinaDateStr)), sd)
        if (faxinaDay >= 0 && faxinaDay < visibleDays) {
          const key = `${r.propriedadeId}-${faxinaDay}`
          const existing = getCell(key)
          existing.faxinas.push(r.nomeHospede)
          map.set(key, existing)
        }
      }

      // Payment label (checkIn + 1 day) — shows commission value
      if (r.status !== "cancelada") {
        const paymentDate = addDays(startOfDay(parseISO(r.checkIn)), 1)
        const paymentDay = differenceInCalendarDays(paymentDate, sd)
        if (paymentDay >= 0 && paymentDay < visibleDays) {
          const key = `${r.propriedadeId}-${paymentDay}`
          const existing = getCell(key)
          const prop = propertyMap.get(r.propriedadeId)
          const valorPagamento = calcValorPagamento(r, prop)
          existing.pagamentos.push({ nomeHospede: r.nomeHospede, precoTotal: valorPagamento })
          map.set(key, existing)
        }
      }
    }

    // Labels for locações: checkin, checkout, faxinas
    for (const l of locacoes) {
      const checkIn = startOfDay(parseISO(l.checkIn))
      const checkOut = startOfDay(parseISO(l.checkOut))

      // Check-in label
      const checkInDay = differenceInCalendarDays(checkIn, sd)
      if (checkInDay >= 0 && checkInDay < visibleDays) {
        const key = `${l.propriedadeId}-${checkInDay}`
        const existing = getCell(key)
        existing.checkins.push(l.nomeCompleto)
        map.set(key, existing)
      }

      // Checkout label
      const checkOutDay = differenceInCalendarDays(checkOut, sd)
      if (checkOutDay >= 0 && checkOutDay < visibleDays) {
        const key = `${l.propriedadeId}-${checkOutDay}`
        const existing = getCell(key)
        existing.checkouts.push(l.nomeCompleto)
        map.set(key, existing)
      }

      // Faxina labels (based on faxinaIntervaloDias — só temporada, só ativa)
      if (l.tipoLocacao !== "anual" && l.status === "ativa") {
        const intervalDays = l.faxinaIntervaloDias ?? 15
        let faxinaDate = addDays(checkIn, intervalDays)
        while (faxinaDate <= checkOut) {
          const faxinaDay = differenceInCalendarDays(faxinaDate, sd)
          if (faxinaDay >= 0 && faxinaDay < visibleDays) {
            const key = `${l.propriedadeId}-${faxinaDay}`
            const existing = getCell(key)
            existing.faxinasRotina.push(l.nomeCompleto)
            map.set(key, existing)
          }
          faxinaDate = addDays(faxinaDate, intervalDays)
        }
      }

      // Payment labels — paga e mora: pagamento no dia da entrada de cada mês, exceto checkout
      // Último pagamento (1 mês antes do checkout) inclui faxina
      const prop = propertyMap.get(l.propriedadeId)
      const comissaoPct = l.percentualComissao ?? 0
      const taxaLimpeza = prop?.taxaLimpeza ?? 0
      const isAvista = l.tipoPagamento === "avista"
      let payDate = checkIn
      while (payDate < checkOut) {
        const payDay = differenceInCalendarDays(payDate, sd)
        if (payDay >= 0 && payDay < visibleDays) {
          const key = `${l.propriedadeId}-${payDay}`
          const existing = getCell(key)
          const nextPay = addMonths(payDate, 1)
          const isUltimo = nextPay >= checkOut
          const faxinaReceita = isUltimo ? (l.faxinaPorMim ? taxaLimpeza : taxaLimpeza - (l.custoEmpresaFaxina ?? 0)) : 0
          // À vista: comissão só no primeiro mês; mensal: comissão todo mês
          const bruto = isAvista
            ? (payDate.getTime() === checkIn.getTime() ? (l.valorTotal ?? 0) : 0)
            : (l.valorMensal ?? 0)
          const valor = (bruto * comissaoPct / 100) + faxinaReceita
          // Nota: faxina separada no detail page, mas no calendário mantemos o total para simplificar a visualização
          if (valor > 0) {
            existing.pagamentos.push({ nomeHospede: l.nomeCompleto, precoTotal: valor })
            map.set(key, existing)
          }
        }
        payDate = addMonths(payDate, 1)
      }
    }

    return map
  }, [showCheckoutsFaxinas, reservations, locacoes, startDate, visibleDays, propertyMap])



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
          const owner = proprietarioMap?.get(prop.proprietarioId ?? "")?.nomeCompleto
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
                        "shrink-0 border-r last:border-r-0 h-full hover:bg-accent/50 transition-colors relative",
                        today && "bg-primary/5",
                        showCheckoutsFaxinas && "flex flex-col items-center justify-center gap-0.5",
                      )}
                      style={{ width: COL_WIDTH }}
                    >
                      {labels && (() => {
                        const hasCheckIn = labels.checkins.length > 0
                        const hasCheckOut = labels.checkouts.length > 0
                        const hasFaxina = labels.faxinas.length > 0
                        const hasFaxinaRotina = labels.faxinasRotina.length > 0
                        const hasPagamento = labels.pagamentos.length > 0
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
                              {hasFaxinaRotina && labels.faxinasRotina.map((nome, idx) => (
                                <span key={idx} className="text-[9px] font-bold text-yellow-500 leading-tight truncate max-w-full px-0.5">FAX {nome.split(" ")[0]}</span>
                              ))}
                              {hasPagamento && labels.pagamentos.map((p, idx) => (
                                <TooltipProvider key={idx} delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-[8px] font-bold text-blue-400 leading-tight truncate max-w-full px-0.5">
                                        {formatCurrency(p.precoTotal)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">
                                      <span className="font-medium">{p.nomeHospede}</span> — {formatCurrency(p.precoTotal)}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
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
                            {hasFaxinaRotina && labels.faxinasRotina.map((nome, idx) => (
                              <span key={idx} className="text-[10px] font-bold text-yellow-500 leading-tight truncate max-w-full px-0.5">FAX {nome.split(" ")[0]}</span>
                            ))}
                            {hasPagamento && labels.pagamentos.map((p, idx) => (
                              <TooltipProvider key={idx} delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-[9px] font-bold text-blue-400 leading-tight truncate max-w-full px-0.5">
                                      {formatCurrency(p.precoTotal)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="text-xs">
                                    <span className="font-medium">{p.nomeHospede}</span> — {formatCurrency(p.precoTotal)}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
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

                {/* Locação bars (blue) */}
                {!showCheckoutsFaxinas && (locacaoSegmentsByProperty.get(prop.id) ?? []).map((seg) => {
                  const barHeight = 32
                  const topOffset = (ROW_HEIGHT - barHeight) / 2
                  const barWidth = (seg.endOffset - seg.startOffset) * COL_WIDTH - 4
                  return (
                    <button
                      key={`loc-${seg.id}`}
                      type="button"
                      className={`absolute z-[4] cursor-pointer overflow-hidden px-2 text-xs font-medium text-white transition-opacity hover:opacity-90 bg-blue-700 ${!seg.isClippedStart ? "rounded-l-full" : "rounded-l-none"} ${!seg.isClippedEnd ? "rounded-r-full" : "rounded-r-none"}`}
                      style={{
                        top: topOffset,
                        left: seg.startOffset * COL_WIDTH + 2,
                        width: barWidth,
                        height: barHeight,
                        lineHeight: `${barHeight}px`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onLocacaoClick?.(seg.id)
                      }}
                    >
                      <span className="flex items-center gap-1 h-full">
                        <span className="truncate">{seg.guestName}</span>
                        {seg.faxinaStatus === "agendada" && (
                          <span className="ml-auto h-2.5 w-2.5 flex-shrink-0 rounded-full bg-yellow-400" />
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
