import { parseISO, startOfDay, differenceInCalendarDays } from "date-fns"
import type { Reservation, ReservationStatus, FaxinaStatus } from "@/types/reservation"
import type { Locacao } from "@/types/locacao"
import { toLocalDateStr } from "@/lib/date-utils"

export interface TimelineSegment {
  reservationId: string
  propertyId: string
  guestName: string
  status: ReservationStatus
  precoTotal: number | undefined
  startOffset: number
  endOffset: number
  isClippedStart: boolean
  isClippedEnd: boolean
  faxinaPorMim: boolean
  faxinaStatus: FaxinaStatus
}

export function computeTimelineSegments(
  reservations: Reservation[],
  startDate: Date,
  visibleDays: number,
  locacoes: Locacao[] = [],
): TimelineSegment[] {
  const segments: TimelineSegment[] = []

  // Build a set of check-in/checkout days per property (reservations + locações)
  const checkInsByProperty = new Map<string, Set<number>>()
  const checkOutsByProperty = new Map<string, Set<number>>()

  const allEntries = [
    ...reservations.map((r) => ({ propriedadeId: r.propriedadeId, checkIn: r.checkIn, checkOut: r.checkOut })),
    ...locacoes.map((l) => ({ propriedadeId: l.propriedadeId, checkIn: l.checkIn, checkOut: l.checkOut })),
  ]
  for (const entry of allEntries) {
    const ciDay = differenceInCalendarDays(startOfDay(parseISO(entry.checkIn)), startDate)
    const coDay = differenceInCalendarDays(startOfDay(parseISO(entry.checkOut)), startDate)
    const ciSet = checkInsByProperty.get(entry.propriedadeId) ?? new Set()
    ciSet.add(ciDay)
    checkInsByProperty.set(entry.propriedadeId, ciSet)
    const coSet = checkOutsByProperty.get(entry.propriedadeId) ?? new Set()
    coSet.add(coDay)
    checkOutsByProperty.set(entry.propriedadeId, coSet)
  }

  for (const reservation of reservations) {
    const checkIn = startOfDay(parseISO(reservation.checkIn))
    const checkOut = startOfDay(parseISO(reservation.checkOut))

    const rawStart = differenceInCalendarDays(checkIn, startDate)
    const rawEnd = differenceInCalendarDays(checkOut, startDate) + 1

    // Skip if completely outside visible range
    if (rawEnd <= 0 || rawStart >= visibleDays) continue

    let startOffset = Math.max(0, rawStart)
    let endOffset = Math.min(visibleDays, rawEnd)

    // If another entry checks out on the same day this one checks in, shift start by half
    const resCheckInStr = toLocalDateStr(reservation.checkIn)
    const resCheckOutStr = toLocalDateStr(reservation.checkOut)

    const hasOtherCheckout = reservations.some(
      (r) => r.id !== reservation.id && r.propriedadeId === reservation.propriedadeId &&
        toLocalDateStr(r.checkOut) === resCheckInStr,
    ) || locacoes.some(
      (l) => l.propriedadeId === reservation.propriedadeId &&
        toLocalDateStr(l.checkOut) === resCheckInStr,
    )
    if (hasOtherCheckout) startOffset = Math.max(startOffset, rawStart + 0.5)

    // If another entry checks in on the same day this one checks out, trim end by half
    const checkOutDay = differenceInCalendarDays(checkOut, startDate)
    const hasOtherCheckIn = reservations.some(
      (r) => r.id !== reservation.id && r.propriedadeId === reservation.propriedadeId &&
        toLocalDateStr(r.checkIn) === resCheckOutStr,
    ) || locacoes.some(
      (l) => l.propriedadeId === reservation.propriedadeId &&
        toLocalDateStr(l.checkIn) === resCheckOutStr,
    )
    if (hasOtherCheckIn) endOffset = Math.min(endOffset, checkOutDay + 0.5)

    if (endOffset <= startOffset) continue

    segments.push({
      reservationId: reservation.id,
      propertyId: reservation.propriedadeId,
      guestName: reservation.nomeHospede,
      status: reservation.status,
      precoTotal: reservation.precoTotal,
      startOffset,
      endOffset,
      isClippedStart: rawStart < 0,
      isClippedEnd: rawEnd > visibleDays,
      faxinaPorMim: reservation.faxinaPorMim ?? false,
      faxinaStatus: reservation.faxinaStatus ?? "nao_agendada",
    })
  }

  return segments
}
