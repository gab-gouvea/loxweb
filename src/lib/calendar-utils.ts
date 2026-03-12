import { parseISO, startOfDay, differenceInCalendarDays } from "date-fns"
import type { Reservation, ReservationStatus, FaxinaStatus } from "@/types/reservation"

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
): TimelineSegment[] {
  const segments: TimelineSegment[] = []

  // Build a set of check-in days per property to detect same-day checkout/checkin overlaps
  const checkInsByProperty = new Map<string, Set<number>>()
  const checkOutsByProperty = new Map<string, Set<number>>()
  for (const r of reservations) {
    const ciDay = differenceInCalendarDays(startOfDay(parseISO(r.checkIn)), startDate)
    const coDay = differenceInCalendarDays(startOfDay(parseISO(r.checkOut)), startDate)
    const ciSet = checkInsByProperty.get(r.propriedadeId) ?? new Set()
    ciSet.add(ciDay)
    checkInsByProperty.set(r.propriedadeId, ciSet)
    const coSet = checkOutsByProperty.get(r.propriedadeId) ?? new Set()
    coSet.add(coDay)
    checkOutsByProperty.set(r.propriedadeId, coSet)
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

    // If another reservation checks out on the same day this one checks in, shift start by half
    const coSet = checkOutsByProperty.get(reservation.propriedadeId)
    if (coSet?.has(rawStart)) {
      // Check it's not our own checkout
      const hasOtherCheckout = reservations.some(
        (r) => r.id !== reservation.id && r.propriedadeId === reservation.propriedadeId &&
          differenceInCalendarDays(startOfDay(parseISO(r.checkOut)), startDate) === rawStart,
      )
      if (hasOtherCheckout) startOffset = Math.max(startOffset, rawStart + 0.5)
    }

    // If another reservation checks in on the same day this one checks out, trim end by half
    const ciSet = checkInsByProperty.get(reservation.propriedadeId)
    const checkOutDay = differenceInCalendarDays(checkOut, startDate)
    if (ciSet?.has(checkOutDay)) {
      const hasOtherCheckIn = reservations.some(
        (r) => r.id !== reservation.id && r.propriedadeId === reservation.propriedadeId &&
          differenceInCalendarDays(startOfDay(parseISO(r.checkIn)), startDate) === checkOutDay,
      )
      if (hasOtherCheckIn) endOffset = Math.min(endOffset, checkOutDay + 0.5)
    }

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
